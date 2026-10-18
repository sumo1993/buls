import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import {
  getTshirtUnitPrice,
  isValidTshirtSize,
  normalizeTshirtSizes,
  resolveTshirtPaymentStatus,
} from '@/lib/event-tshirts'
import {
  getEventOccupancy,
  isEventFull,
  promoteNextFromWaitlist,
} from '@/lib/event-capacity'

// GET comprehensive attendee data for an event (including guests)
export async function GET(req: Request) {
  try {
    console.log('[API/event-registrations] GET called with:', req.url)
    
    const { userId } = await auth()
    
    if (!userId) {
      console.log('[API/event-registrations] No user authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[API/event-registrations] User ID:', userId)

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    
    console.log('[API/event-registrations] Event ID:', eventId)

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    // Skip free event_registrations for ticket-only events (use event_type, not hardcoded ids)
    const { data: eventMeta } = await adminClient
      .from('events')
      .select('id, event_type, ticket_only')
      .eq('id', eventId)
      .maybeSingle()

    const isTicketOnlyEvent =
      eventMeta?.event_type === 'ticket_only' || eventMeta?.ticket_only === true

    // Get ALL attendees comprehensively:
    // 1. Event registrations (free) — skip for ticket-only
    // 2. Ticket purchasers (users)
    // 3. Ticket guests
    // 4. Non-members
    
    const attendees: any[] = []
    
    // 1. Fetch event registrations (free registrations)
    if (!isTicketOnlyEvent) {
      const { data: registrations, error: regError } = await adminClient
        .from('event_registrations')
        .select(`
          *,
          user:users(id, full_name, email, clerk_id, phone_number, passport_number),
          event:events(id, title, event_date)
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })

      if (regError) {
        console.error('Error fetching registrations:', regError)
      } else if (registrations) {

        
        // Transform registrations
        const transformedRegistrations = await Promise.all(
          registrations.map(async (reg) => {
            const user = reg.user || {}
            
            // ALWAYS fetch from members_profile first (where real data is stored)
            const { data: memberProfile, error: memberError } = await adminClient
              .from('members_profile')
              .select('phone, passport_number')
              .eq('user_id', reg.user_id)
              .maybeSingle()
            
            if (memberError) {
              // Silently handle error - fall back to users table
            }
            
            // Use members_profile data first, fall back to users table
            let phoneNumber = memberProfile?.phone || user.phone_number || null
            let passportNumber = memberProfile?.passport_number || user.passport_number || null
            
            return {
              id: reg.id,
              event_id: reg.event_id,
              user_id: reg.user_id,
              phone_number: phoneNumber,
              passport_number: passportNumber,
              registered_at: reg.registered_at,
              status: reg.status,
              notes: reg.notes || 'Free Registration',
              full_name: user.full_name || 'Unknown User',
              email: user.email || 'unknown@example.com',
              user: {
                ...user,
                phone_number: phoneNumber,
                passport_number: passportNumber
              },
              event: reg.event,
              type: 'free',
              source_type: 'registration',
              is_guest: false,
              guest_of: null,
              tshirt_wanted: reg.tshirt_wanted || false,
              tshirt_size: reg.tshirt_size || null,
              tshirt_payment_status: reg.tshirt_payment_status || null,
              tshirt_picked_up: reg.tshirt_picked_up || false
            }
          })
        )
        attendees.push(...transformedRegistrations)
      }
    }

    // 2. Fetch ticket purchases with user info
    const { data: purchases, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select(`
        *,
        user:users!ticket_purchases_user_id_fkey(id, full_name, email, clerk_id, phone_number, passport_number),
        event:events(id, title, event_date),
        tickets:event_tickets(id, name, price)
      `)
      .eq('event_id', eventId)
      // Include common payment statuses (do not silently drop approved tickets)
      .in('payment_status', ['paid', 'pending', 'refunded', 'cancelled'])
      .order('created_at', { ascending: false })

    if (purchaseError) {
      console.error('Error fetching purchases:', purchaseError)
    } else if (purchases) {
      // Batch members_profile lookup (avoid N+1 queries)
      const purchaseUserIds = [
        ...new Set(purchases.map((p: any) => p.user_id).filter(Boolean)),
      ]
      const profileMap: Record<string, { phone?: string | null; passport_number?: string | null }> = {}
      if (purchaseUserIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('members_profile')
          .select('user_id, phone, passport_number')
          .in('user_id', purchaseUserIds)
        for (const profile of profiles || []) {
          profileMap[String(profile.user_id)] = profile
        }
      }

      // Transform ticket purchasers
      const transformedPurchases = purchases.map((purchase: any) => {
          const user = purchase.user || {}
          const memberProfile = profileMap[String(purchase.user_id)] || {}
          
          // Use members_profile data first, fall back to users table
          let phoneNumber = memberProfile?.phone || user.phone_number || null
          let passportNumber = memberProfile?.passport_number || user.passport_number || null
          
          // Source of truth: event_tickets.price (catalog). unit_price is only a purchase-time
          // snapshot and is often stale if the ticket type was edited after purchase (e.g. 100 → 10).
          const catalogPrice = parseFloat(String(purchase.tickets?.price ?? '')) || 0
          const storedUnitPrice = parseFloat(String(purchase.unit_price ?? '')) || 0
          const displayUnitPrice = catalogPrice || storedUnitPrice || 0
          const qty = purchase.quantity || 1
          const tshirtAmount = parseFloat(String(purchase.tshirt_amount ?? 0)) || 0
          const ticketLine = displayUnitPrice * qty
          // Prefer stored total_price (includes shirt); fall back to ticket + shirt
          const storedTotal = parseFloat(String(purchase.total_price ?? '')) || 0
          const totalPrice =
            storedTotal > 0 ? storedTotal : ticketLine + (purchase.tshirt_wanted ? tshirtAmount : 0)

          const shirtNote = purchase.tshirt_wanted
            ? ` + T-shirt ${purchase.tshirt_size || '?'} (¥${tshirtAmount.toFixed(2)})`
            : ''

          return {
            id: purchase.id,
            event_id: purchase.event_id,
            user_id: purchase.user_id,
            ticket_number: purchase.ticket_number,
            phone_number: phoneNumber,
            passport_number: passportNumber,
            registered_at: purchase.created_at,
            status: purchase.payment_status === 'paid' ? 'confirmed' : purchase.payment_status,
            payment_status: purchase.payment_status,
            notes: `Ticket Purchase (${qty}x - ¥${displayUnitPrice})${shirtNote}`,
            full_name: user.full_name || 'Unknown User',
            email: user.email || 'unknown@example.com',
            user: {
              ...user,
              phone_number: phoneNumber,
              passport_number: passportNumber
            },
            event: purchase.event,
            type: 'ticket',
            source_type: 'ticket_purchase',
            is_guest: false,
            guest_of: null,
            quantity: qty,
            unit_price: displayUnitPrice,
            catalog_price: catalogPrice || null,
            stored_unit_price: storedUnitPrice || null,
            total_price: totalPrice,
            amount_paid: purchase.payment_status === 'refunded' ? 0 : totalPrice,
            tshirt_wanted: purchase.tshirt_wanted || false,
            tshirt_size: purchase.tshirt_size || null,
            tshirt_payment_status: purchase.tshirt_payment_status || null,
            tshirt_picked_up: purchase.tshirt_picked_up || false,
            tshirt_amount: purchase.tshirt_wanted ? tshirtAmount : null
          }
        })
      attendees.push(...transformedPurchases)
      
      // 3. Fetch guests for each ticket purchase
      const ticketIds = purchases.map(p => p.id)
      if (ticketIds.length > 0) {
        const { data: guests, error: guestsError } = await adminClient
          .from('ticket_guests')
          .select(`
            *,
            ticket_purchase:ticket_purchases!ticket_guests_ticket_purchase_id_fkey(
              id,
              ticket_number,
              user:users!ticket_purchases_user_id_fkey(full_name, email)
            )
          `)
          .in('ticket_purchase_id', ticketIds)
          
        if (guestsError) {
          console.error('Error fetching guests:', guestsError)
        } else if (guests) {
          const transformedGuests = guests.map(guest => {
            const ticket = guest.ticket_purchase || {}
            const purchaser = ticket.user || {}
            const parentPurchase = purchases.find((p: any) => p.id === guest.ticket_purchase_id)
            // Guest payment_status is authoritative (includes refunded) — never overwrite with parent ticket status
            const guestPaymentStatus = guest.payment_status || 'pending'
            const guestAmount = parseFloat(String(guest.amount_paid ?? guest.refund_amount ?? 0)) || 0
            return {
              id: guest.id,
              event_id: eventId,
              user_id: null, // Guests don't have user accounts
              ticket_number: ticket.ticket_number,
              phone_number: guest.phone || guest.phone_number || null,
              passport_number: guest.passport_number || null,
              registered_at: guest.created_at,
              status: guestPaymentStatus === 'refunded'
                ? 'refunded'
                : (['paid', 'paid_online', 'paid_at_door', 'complimentary'].includes(guestPaymentStatus) ? 'confirmed' : guestPaymentStatus),
              payment_status: guestPaymentStatus,
              notes: `Guest of: ${purchaser.full_name || 'Unknown'} - ${guest.relationship_to_purchaser || 'Guest'}`,
              full_name: guest.full_name,
              email: guest.email || null,
              user: null,
              event: { id: eventId },
              type: 'guest',
              source_type: 'ticket_guest',
              is_guest: true,
              guest_of: purchaser.full_name,
              ticket_purchase_id: guest.ticket_purchase_id,
              relationship: guest.relationship_to_purchaser,
              amount_paid: guestPaymentStatus === 'refunded' ? 0 : guestAmount,
              refund_amount: guest.refund_amount || null,
              refund_reason: guest.refund_reason || null,
              checked_in: guest.checked_in || false,
              checked_in_at: guest.checked_in_at || null,
              parent_payment_status: parentPurchase?.payment_status || null,
              tshirt_wanted: guest.tshirt_wanted || false,
              tshirt_size: guest.tshirt_size || null,
              tshirt_payment_status: guest.tshirt_payment_status || null,
              tshirt_picked_up: guest.tshirt_picked_up || false,
            }
          })
          attendees.push(...transformedGuests)
        }
      }
    }

    // 4. Fetch non-member registrations
    const { data: nonMemberRegs, error: nonMemberError } = await adminClient
      .from('non_member_registrations')
      .select(`*`)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })

    if (nonMemberError) {
      console.error('Error fetching non-member registrations:', nonMemberError)
    } else if (nonMemberRegs && nonMemberRegs.length > 0) {
      const transformedNonMembers = nonMemberRegs.map(reg => ({
        id: reg.id,
        event_id: reg.event_id,
        user_id: null, // Non-members don't have user accounts — use registration id for check-in
        phone_number: reg.phone || null,
        passport_number: null,
        registered_at: reg.registered_at,
        status: reg.status,
        // Align with ticket payment_status so check-in UI refund guards work
        payment_status: reg.status === 'refunded' ? 'refunded' : reg.status,
        notes: 'Non-Member Registration',
        full_name: reg.full_name,
        email: reg.email || null,
        user: null,
        event: { id: eventId, title: reg.events?.title },
        type: 'non_member',
        source_type: 'non_member_registration',
        is_guest: false,
        guest_of: null,
        amount_paid: reg.amount_paid || 0,
        verification_code: reg.verification_code,
        education_level: reg.education_level,
        country: reg.country,
        city: reg.city,
        address: reg.address,
        checked_in: reg.checked_in || false,
        checked_in_at: reg.checked_in_at || null,
        checked_in_by: reg.checked_in_by || null
      }))
      attendees.push(...transformedNonMembers)
    }

    // 5. Fetch public registrations (from /public-events path)
    const { data: publicRegs, error: publicError } = await adminClient
      .from('public_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })

    if (publicError) {
      console.error('Error fetching public registrations:', publicError)
    } else if (publicRegs && publicRegs.length > 0) {
      const transformedPublic = publicRegs.map(reg => ({
        id: reg.id,
        event_id: reg.event_id,
        user_id: null,
        phone_number: reg.phone || null,
        passport_number: null,
        registered_at: reg.registered_at,
        status: reg.status,
        payment_status: reg.status === 'refunded' ? 'refunded' : reg.status,
        notes: 'Public Registration',
        full_name: reg.full_name,
        email: reg.email || null,
        user: null,
        event: { id: eventId },
        type: 'non_member',
        source_type: 'public_registration',
        is_guest: false,
        guest_of: null,
        amount_paid: reg.amount_paid || 0,
        address: reg.address || null,
        checked_in: reg.checked_in || false,
        checked_in_at: reg.checked_in_at || null,
        checked_in_by: reg.checked_in_by || null
      }))
      attendees.push(...transformedPublic)
    }

    return NextResponse.json({ 
      registrations: attendees,
      stats: {
        total: attendees.length,
        free_registrations: attendees.filter(a => a.type === 'free').length,
        ticket_purchasers: attendees.filter(a => a.type === 'ticket' && !a.is_guest).length,
        guests: attendees.filter(a => a.is_guest).length,
        non_member_registrations: attendees.filter(a => a.type === 'non_member').length,
        waitlist: attendees.filter(a => a.status === 'waitlist').length
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/event-registrations:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// POST register for an event
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    const body = await req.json()
    const {
      event_id,
      notes,
      tshirt_wanted,
      tshirt_size,
      tshirt_payment_proof_url,
      payment_method,
    } = body

    if (!event_id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    // Check if event exists and requires registration
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select(`
        id, title, requires_registration, registration_deadline,
        capacity, waitlist_enabled, event_type, ticket_only, status,
        tshirt_enabled, tshirt_pricing, tshirt_price, tshirt_sizes, tshirt_required
      `)
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status === 'cancelled' || event.status === 'completed') {
      return NextResponse.json({ error: 'This event is not open for registration' }, { status: 400 })
    }

    if (event.event_type === 'ticket_only' || event.ticket_only) {
      return NextResponse.json({ error: 'This event requires a ticket purchase' }, { status: 400 })
    }

    const allowsFreeRegistration =
      event.requires_registration ||
      ['free', 'registration_required', 'hybrid'].includes(event.event_type || '')

    if (!allowsFreeRegistration) {
      return NextResponse.json({ error: 'This event does not require registration' }, { status: 400 })
    }

    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
    }

    // Check if already registered (including waitlist)
    const { data: existing } = await adminClient
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('user_id', userData.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: existing.status === 'waitlist'
          ? 'You are already on the waitlist for this event'
          : 'Already registered for this event'
      }, { status: 400 })
    }

    // Capacity / waitlist
    const occupancy = await getEventOccupancy(adminClient, event_id)
    let status: 'registered' | 'waitlist' = 'registered'
    let waitlist_position: number | null = null

    if (isEventFull(event.capacity, occupancy.total)) {
      if (!event.waitlist_enabled) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 })
      }

      const { data: waitlistEntries } = await adminClient
        .from('event_registrations')
        .select('waitlist_position')
        .eq('event_id', event_id)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: false })
        .limit(1)

      const maxPos = waitlistEntries?.[0]?.waitlist_position || 0
      status = 'waitlist'
      waitlist_position = maxPos + 1
    }

    // T-shirt choice (v1)
    const availableSizes = normalizeTshirtSizes(event.tshirt_sizes)
    let wanted = !!tshirt_wanted
    let size: string | null = tshirt_size ? String(tshirt_size).trim().toUpperCase() : null

    // Ticket-sold events: T-shirt only via ticket purchase, not free registration
    const sellsTickets =
      event.event_type === 'ticket_only' ||
      event.event_type === 'hybrid' ||
      event.ticket_only === true

    if (!event.tshirt_enabled || sellsTickets) {
      if (sellsTickets && (wanted || tshirt_size)) {
        return NextResponse.json(
          {
            error:
              'T-shirts for this event are only available when purchasing a ticket. Use Tickets + T-shirt.',
          },
          { status: 400 }
        )
      }
      wanted = false
      size = null
    } else {
      if (event.tshirt_required && !wanted) {
        return NextResponse.json(
          { error: 'A T-shirt size is required for this event' },
          { status: 400 }
        )
      }
      if (wanted) {
        if (!isValidTshirtSize(size, availableSizes)) {
          return NextResponse.json(
            { error: `Please select a valid T-shirt size (${availableSizes.join(', ')})` },
            { status: 400 }
          )
        }
      } else {
        size = null
      }
    }

    const tshirtPaymentStatus = resolveTshirtPaymentStatus(wanted, event.tshirt_pricing)
    const tshirtAmount = getTshirtUnitPrice(event, wanted)

    // Paid shirt (free-event path): require proof unless cash / waived
    if (wanted && tshirtPaymentStatus === 'pending' && tshirtAmount > 0) {
      const method = payment_method || 'online'
      if (method !== 'cash' && !tshirt_payment_proof_url) {
        return NextResponse.json(
          { error: 'Payment proof is required for the T-shirt' },
          { status: 400 }
        )
      }
    }

    const { data: registration, error: insertError } = await adminClient
      .from('event_registrations')
      .insert({
        event_id,
        user_id: userData.id,
        notes: notes || null,
        status,
        waitlist_position,
        tshirt_wanted: wanted,
        tshirt_size: size,
        tshirt_payment_status: tshirtPaymentStatus,
        tshirt_payment_proof_url:
          wanted && tshirtPaymentStatus === 'pending'
            ? tshirt_payment_proof_url || null
            : null,
        tshirt_amount_paid: wanted ? tshirtAmount : null,
        tshirt_picked_up: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error registering for event:', insertError)
      return NextResponse.json({ error: 'Failed to register for event' }, { status: 500 })
    }

    const shirtMsg =
      wanted && tshirtPaymentStatus === 'pending'
        ? ` T-shirt (${size}) ¥${tshirtAmount.toFixed(2)} pending treasurer approval.`
        : wanted
          ? ` Free T-shirt (${size}) reserved.`
          : ''

    return NextResponse.json({
      registration,
      waitlisted: status === 'waitlist',
      tshirt_pending: tshirtPaymentStatus === 'pending',
      message: status === 'waitlist'
        ? `Event is full. You are #${waitlist_position} on the waitlist.${shirtMsg}`
        : `Successfully registered.${shirtMsg}`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/event-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE cancel registration
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Check prior status so we only auto-promote when a confirmed seat frees
    const { data: existing } = await adminClient
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userData.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const { error: deleteError } = await adminClient
      .from('event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userData.id)

    if (deleteError) {
      console.error('Error cancelling registration:', deleteError)
      return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 })
    }

    let promoted: { promoted: boolean; user_id?: string } = { promoted: false }
    if (existing.status === 'registered') {
      promoted = await promoteNextFromWaitlist(adminClient, eventId)
    }

    return NextResponse.json({ success: true, waitlist_promoted: promoted })
  } catch (error: any) {
    console.error('Error in DELETE /api/event-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
