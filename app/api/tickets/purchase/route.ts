import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy } from '@/lib/event-capacity'
import { generateTicketNumber } from '@/lib/ticket-utils'
import {
  combinedPurchaseTotal,
  getTshirtUnitPrice,
  isValidTshirtSize,
  normalizeTshirtSizes,
  resolveTshirtPaymentStatus,
} from '@/lib/event-tshirts'

// GET user's ticket purchases
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    console.log('=== GET /api/tickets/purchase ===')
    console.log('Clerk userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId') || searchParams.get('event_id')
    const status = searchParams.get('status')
    console.log('Query params - eventId:', eventId, 'status:', status)

    const adminClient = createAdminClient()

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'User lookup failed', details: userError.message }, { status: 500 })
    }
    
    if (!userData) {
      console.error('User not found in database for clerk_id:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('Found user:', userData.id, 'role:', userData.role)

    // Bare columns only — no PostgREST embeds (ambiguous FKs) and no huge
    // payment_proof_url / qr_code_url blobs (those caused list 500s / timeouts).
    const selectAttempts = [
      `id, event_id, ticket_id, user_id, purchased_by_user_id, quantity,
       unit_price, total_price, payment_method, payment_status, notes,
       ticket_number, created_at, paid_at, approved_by,
       tshirt_wanted, tshirt_size, tshirt_payment_status, tshirt_amount, tshirt_picked_up`,
      `id, event_id, ticket_id, user_id, purchased_by_user_id, quantity,
       unit_price, total_price, payment_method, payment_status, notes,
       ticket_number, created_at, paid_at, approved_by`,
      `id, event_id, ticket_id, user_id, quantity, unit_price, total_price,
       payment_method, payment_status, notes, ticket_number, created_at, paid_at`,
    ]

    const canSeeAll = ['admin', 'treasurer', 'secretary'].includes(userData.role)

    const applyFilters = (q: any) => {
      let next = q
      if (!canSeeAll) next = next.eq('user_id', userData.id)
      if (status) {
        // Rejects are stored as "cancelled" in approve API — accept both
        if (status === 'rejected' || status === 'cancelled') {
          next = next.in('payment_status', ['rejected', 'cancelled'])
        } else {
          next = next.eq('payment_status', status)
        }
      }
      if (eventId) next = next.eq('event_id', eventId)
      return next.order('created_at', { ascending: false }).limit(2000)
    }

    let purchases: any[] | null = null
    let purchasesError: any = null
    for (const cols of selectAttempts) {
      const { data, error } = await applyFilters(
        adminClient.from('ticket_purchases').select(cols)
      )
      if (!error) {
        purchases = data
        purchasesError = null
        break
      }
      purchasesError = error
      console.error('Error fetching purchases (select attempt):', error.message || error)
    }

    if (purchasesError || !purchases) {
      console.error('Error fetching purchases (all attempts failed):', purchasesError)
      return NextResponse.json(
        { error: 'Failed to fetch purchases', details: purchasesError?.message },
        { status: 500 }
      )
    }

    console.log(`Found ${purchases.length} purchases for user ${userData.id}`)

    const purchaseIds = purchases.map((p: any) => p.id)
    const eventIds = [...new Set(purchases.map((p: any) => p.event_id).filter(Boolean))]
    const ticketIds = [...new Set(purchases.map((p: any) => p.ticket_id).filter(Boolean))]
    const userIds = [
      ...new Set(
        purchases
          .flatMap((p: any) => [p.user_id, p.purchased_by_user_id])
          .filter(Boolean)
      ),
    ]

    const [eventsRes, ticketsRes, usersRes, guestsRes] = await Promise.all([
      eventIds.length
        ? adminClient
            .from('events')
            .select(
              'id, title, event_date, location, max_total_guests_per_member, door_guest_price, allow_door_guest_addition, allow_guest_addition_after_purchase'
            )
            .in('id', eventIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      ticketIds.length
        ? adminClient
            .from('event_tickets')
            .select('id, name, price, description')
            .in('id', ticketIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      userIds.length
        ? adminClient
            .from('users')
            .select('id, full_name, email, phone_number')
            .in('id', userIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      purchaseIds.length
        ? adminClient
            .from('ticket_guests')
            .select(
              'id, ticket_purchase_id, full_name, email, phone, amount_paid, payment_status, checked_in, created_at'
            )
            .in('ticket_purchase_id', purchaseIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    // Soft-fail related lookups so the list still loads
    if (eventsRes.error) console.error('List events join failed:', eventsRes.error.message)
    if (ticketsRes.error) console.error('List tickets join failed:', ticketsRes.error.message)
    if (usersRes.error) console.error('List users join failed:', usersRes.error.message)
    if (guestsRes.error) console.error('List guests join failed:', guestsRes.error.message)

    // If optional event columns failed, retry with minimal event fields
    let eventsList = eventsRes.data || []
    if (eventsRes.error && eventIds.length) {
      const retryEvents = await adminClient
        .from('events')
        .select('id, title, event_date, location')
        .in('id', eventIds)
      eventsList = retryEvents.data || []
    }

    let guestsList = guestsRes.data || []
    if (guestsRes.error && purchaseIds.length) {
      const retryGuests = await adminClient
        .from('ticket_guests')
        .select('id, ticket_purchase_id, full_name, email, payment_status')
        .in('ticket_purchase_id', purchaseIds)
      guestsList = retryGuests.data || []
    }

    let usersList = usersRes.data || []
    if (usersRes.error && userIds.length) {
      const retryUsers = await adminClient
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      usersList = retryUsers.data || []
    }

    const eventsMap = Object.fromEntries((eventsList || []).map((e: any) => [e.id, e]))
    const ticketsMap = Object.fromEntries((ticketsRes.data || []).map((t: any) => [t.id, t]))
    const usersMap = Object.fromEntries((usersList || []).map((u: any) => [u.id, u]))

    const purchasesWithGuests = purchases.map((purchase: any) => {
      const purchaseGuests =
        guestsList?.filter((g: any) => g.ticket_purchase_id === purchase.id) || []
      const purchaser = purchase.purchased_by_user_id
        ? usersMap[purchase.purchased_by_user_id]
        : null
      return {
        ...purchase,
        // Proof / QR loaded via /api/tickets/purchase/[id] when viewing a row
        payment_proof_url: null,
        qr_code_url: undefined,
        has_qr_code: purchase.payment_status === 'paid',
        events: eventsMap[purchase.event_id] || null,
        tickets: ticketsMap[purchase.ticket_id] || null,
        users: usersMap[purchase.user_id] || null,
        guests: purchaseGuests,
        purchaser: purchaser ? { id: purchaser.id, full_name: purchaser.full_name } : null,
      }
    })

    return NextResponse.json({ purchases: purchasesWithGuests })
  } catch (error: any) {
    console.error('Error in GET /api/tickets/purchase:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// POST purchase ticket
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      ticket_id,
      quantity,
      payment_method,
      payment_proof_url,
      notes,
      tshirt_wanted,
      tshirt_size,
      guests: rawGuests,
    } = body

    // Validate
    if (!ticket_id || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'Invalid ticket or quantity' }, { status: 400 })
    }

    if (!payment_method) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
    }

    // Get ticket details first (needed to validate guest T-shirts)
    const { data: ticket, error: ticketError } = await adminClient
      .from('event_tickets')
      .select(`
        *,
        event:events(
          id, title, event_date,
          tshirt_enabled, tshirt_pricing, tshirt_price, tshirt_sizes, tshirt_required,
          max_total_guests_per_member, max_guests_per_member,
          allow_guest_registration, allow_guest_addition_after_purchase,
          door_guest_price, capacity, status
        )
      `)
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (!ticket.is_active) {
      return NextResponse.json({ error: 'Ticket is no longer available' }, { status: 400 })
    }

    // Nested join may be object or single-element array depending on FK shape
    const eventMeta = Array.isArray(ticket.event) ? ticket.event[0] || {} : ticket.event || {}
    ticket.event = eventMeta

    // Reject huge base64 payloads (upload via /api/upload first)
    if (
      typeof payment_proof_url === 'string' &&
      payment_proof_url.startsWith('data:') &&
      payment_proof_url.length > 200_000
    ) {
      return NextResponse.json(
        {
          error:
            'Payment proof is too large to send directly. Please re-upload the screenshot and try again.',
        },
        { status: 400 }
      )
    }
    const eventShirtSizes = normalizeTshirtSizes(eventMeta.tshirt_sizes)
    const shirtsEnabled = !!eventMeta.tshirt_enabled
    const shirtsRequired = shirtsEnabled && !!eventMeta.tshirt_required

    // Normalize guests (optional) — ticket + optional T-shirt, paid as one total
    const guestsInput = Array.isArray(rawGuests) ? rawGuests : []
    type GuestNorm = {
      full_name: string
      email: string | null
      phone: string | null
      relationship: string | null
      tshirt_wanted: boolean
      tshirt_size: string | null
    }
    const guests: GuestNorm[] = []
    for (const g of guestsInput) {
      const full_name = String(g?.full_name || '').trim()
      if (!full_name) continue
      let guestWanted = !!g?.tshirt_wanted
      let guestSize: string | null = g?.tshirt_size
        ? String(g.tshirt_size).trim().toUpperCase()
        : null
      if (!shirtsEnabled) {
        guestWanted = false
        guestSize = null
      } else if (shirtsRequired) {
        guestWanted = true
      }
      if (guestWanted) {
        if (!isValidTshirtSize(guestSize, eventShirtSizes)) {
          return NextResponse.json(
            {
              error: `Guest "${full_name}" needs a valid T-shirt size (${eventShirtSizes.join(', ')})`,
            },
            { status: 400 }
          )
        }
      } else {
        guestSize = null
      }
      guests.push({
        full_name,
        email: g?.email ? String(g.email).trim() : null,
        phone: g?.phone ? String(g.phone).trim() : null,
        relationship: g?.relationship ? String(g.relationship).trim() : null,
        tshirt_wanted: guestWanted,
        tshirt_size: guestSize,
      })
    }

    if (eventMeta?.status === 'cancelled' || eventMeta?.status === 'completed') {
      return NextResponse.json({ error: 'This event is not open for ticket sales' }, { status: 400 })
    }

    // Guest limits from event config (default allow up to 5)
    const maxGuests =
      Number(eventMeta.max_total_guests_per_member) ||
      Number(eventMeta.max_guests_per_member) ||
      5

    if (guests.length > maxGuests) {
      return NextResponse.json(
        { error: `You can add at most ${maxGuests} guest${maxGuests === 1 ? '' : 's'}` },
        { status: 400 }
      )
    }

    // Capacity: purchaser (1) + guests
    if (eventMeta?.capacity) {
      const occupancy = await getEventOccupancy(adminClient, ticket.event_id)
      const seatsNeeded = 1 + guests.length
      const remaining = Number(eventMeta.capacity) - occupancy.total
      if (remaining < seatsNeeded) {
        return NextResponse.json(
          {
            error:
              remaining <= 0
                ? 'Event is full'
                : `Only ${remaining} spot${remaining === 1 ? '' : 's'} left (you need ${seatsNeeded} including guests)`,
          },
          { status: 400 }
        )
      }
    }

    // Check availability
    if (ticket.quantity_available) {
      const available = ticket.quantity_available - ticket.quantity_sold
      if (available < quantity) {
        return NextResponse.json({ 
          error: `Only ${available} tickets available` 
        }, { status: 400 })
      }
    }

    // Check sale dates
    const now = new Date()
    if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) {
      return NextResponse.json({ error: 'Ticket sales have not started yet' }, { status: 400 })
    }
    if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) {
      return NextResponse.json({ error: 'Ticket sales have ended' }, { status: 400 })
    }

    // T-shirt (v2) — one shirt per buyer, amount added to total_price
    const eventCfg = eventMeta
    const availableSizes = normalizeTshirtSizes(eventCfg.tshirt_sizes)
    let wanted = !!tshirt_wanted
    let size: string | null = tshirt_size ? String(tshirt_size).trim().toUpperCase() : null

    if (!eventCfg.tshirt_enabled) {
      wanted = false
      size = null
    } else {
      if (eventCfg.tshirt_required) wanted = true
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

    const tshirtAmount = getTshirtUnitPrice(eventCfg, wanted)
    const tshirtPaymentStatus = resolveTshirtPaymentStatus(wanted, eventCfg.tshirt_pricing)
    const unitPrice = parseFloat(String(ticket.price)) || 0
    const ticketLine = unitPrice * quantity
    // Guests pay same catalog ticket price (or door_guest_price fallback)
    const guestUnit =
      unitPrice ||
      parseFloat(String(eventMeta.door_guest_price ?? 0)) ||
      0
    const guestTicketAmount = guestUnit * guests.length
    const guestShirtCount = guests.filter((g) => g.tshirt_wanted).length
    const guestShirtUnit = getTshirtUnitPrice(eventCfg, true)
    const guestShirtAmount = guestShirtUnit * guestShirtCount
    const guestAmount = guestTicketAmount + guestShirtAmount
    const total_price = combinedPurchaseTotal(unitPrice, quantity, tshirtAmount, guestAmount)

    // Online payment must include proof when there is anything to pay
    if (payment_method !== 'cash' && total_price > 0 && !payment_proof_url) {
      return NextResponse.json({ error: 'Payment proof required' }, { status: 400 })
    }

    if (!eventMeta?.title || !eventMeta?.event_date) {
      return NextResponse.json(
        { error: 'Event details missing for this ticket. Please contact the secretary.' },
        { status: 400 }
      )
    }

    // Generate ticket number using new format
    // We need a deterministic seed for random number. Use user ID + event ID + timestamp
    const timestamp = Date.now();
    const seed = `${userData.id}_${ticket.event_id}_${timestamp}`;
    const ticketNumber = generateTicketNumber(
      eventMeta.title,
      eventMeta.event_date,
      seed
    )

    const purchasePayload: Record<string, unknown> = {
      event_id: ticket.event_id,
      ticket_id,
      user_id: userData.id,
      quantity,
      unit_price: ticket.price,
      total_price,
      payment_method,
      payment_proof_url: payment_proof_url || null,
      payment_status: 'pending',
      notes: notes || null,
      ticket_number: ticketNumber,
      tshirt_wanted: wanted,
      tshirt_size: size,
      tshirt_payment_status: tshirtPaymentStatus,
      tshirt_amount: wanted ? tshirtAmount : null,
      tshirt_picked_up: false,
      guest_count: guests.length,
    }

    let { data: createdPurchase, error: insertError } = await adminClient
      .from('ticket_purchases')
      .insert(purchasePayload)
      .select()
      .single()

    // Retry without guest_count if that column is missing in older DBs
    if (
      insertError &&
      String(insertError.message || '').toLowerCase().includes('guest_count')
    ) {
      delete purchasePayload.guest_count
      const retry = await adminClient
        .from('ticket_purchases')
        .insert(purchasePayload)
        .select()
        .single()
      createdPurchase = retry.data
      insertError = retry.error
    }

    if (insertError || !createdPurchase) {
      console.error('Error creating purchase:', insertError)
      return NextResponse.json(
        { error: 'Failed to create purchase', details: insertError?.message },
        { status: 500 }
      )
    }

    // Insert guests on this purchase (pending until treasurer approves the one payment)
    if (guests.length > 0) {
      const guestShirtStatus = (gWanted: boolean) =>
        resolveTshirtPaymentStatus(gWanted, eventCfg.tshirt_pricing)

      const guestRowsFull = guests.map((g) => {
        const shirtAmt = g.tshirt_wanted ? guestShirtUnit : 0
        return {
          ticket_purchase_id: String(createdPurchase.id),
          full_name: g.full_name,
          email: g.email,
          phone: g.phone,
          relationship: g.relationship,
          payment_status: 'pending',
          amount_paid: guestUnit + shirtAmt,
          payment_notes: `Paid with ticket purchase (${payment_method})`,
          guest_type: 'regular',
          added_by_admin: false,
          added_at_event: false,
          tshirt_wanted: g.tshirt_wanted,
          tshirt_size: g.tshirt_size,
          tshirt_payment_status: guestShirtStatus(g.tshirt_wanted),
          tshirt_amount: g.tshirt_wanted ? guestShirtUnit : null,
          tshirt_picked_up: false,
        }
      })

      let { error: guestInsertError } = await adminClient
        .from('ticket_guests')
        .insert(guestRowsFull)

      // Older DBs without guest tshirt columns: retry without those fields
      if (
        guestInsertError &&
        String(guestInsertError.message || '').toLowerCase().includes('tshirt')
      ) {
        const guestRowsBasic = guestRowsFull.map(
          ({
            tshirt_wanted: _w,
            tshirt_size: _s,
            tshirt_payment_status: _p,
            tshirt_amount: _a,
            tshirt_picked_up: _u,
            ...rest
          }) => rest
        )
        const retry = await adminClient.from('ticket_guests').insert(guestRowsBasic)
        guestInsertError = retry.error
      }

      if (guestInsertError) {
        console.error('Error inserting guests with purchase:', guestInsertError)
        await adminClient.from('ticket_purchases').delete().eq('id', createdPurchase.id)
        return NextResponse.json(
          { error: 'Failed to add guests to purchase', details: guestInsertError.message },
          { status: 500 }
        )
      }
    }

    const parts = [`Ticket ¥${ticketLine.toFixed(2)}`]
    if (wanted && tshirtAmount > 0) parts.push(`T-shirt ¥${tshirtAmount.toFixed(2)}`)
    else if (wanted) parts.push(`free T-shirt (${size})`)
    if (guests.length > 0) {
      parts.push(
        `${guests.length} guest${guests.length === 1 ? '' : 's'} ¥${guestTicketAmount.toFixed(2)}`
      )
    }
    if (guestShirtCount > 0 && guestShirtAmount > 0) {
      parts.push(
        `${guestShirtCount} guest T-shirt${guestShirtCount === 1 ? '' : 's'} ¥${guestShirtAmount.toFixed(2)}`
      )
    } else if (guestShirtCount > 0) {
      parts.push(`${guestShirtCount} free guest T-shirt${guestShirtCount === 1 ? '' : 's'}`)
    }
    const breakdown = `${parts.join(' + ')} = ¥${total_price.toFixed(2)}`

    return NextResponse.json({ 
      purchase: createdPurchase,
      guests_added: guests.length,
      breakdown,
      message: 'Purchase created! Waiting for payment approval.'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tickets/purchase:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

// PUT update purchase (for uploading payment proof)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { purchase_id, payment_proof_url, notes } = body

    if (!purchase_id) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    // Check ownership
    const { data: existingPurchase, error: checkError } = await adminClient
      .from('ticket_purchases')
      .select('user_id, status')
      .eq('id', purchase_id)
      .single()

    if (checkError || !existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (existingPurchase.user_id !== userData.id) {
      return NextResponse.json({ error: 'Not your purchase' }, { status: 403 })
    }

    if (existingPurchase.status !== 'pending') {
      return NextResponse.json({ error: 'Purchase already processed' }, { status: 400 })
    }

    // Update
    const updateData: any = {}
    if (payment_proof_url) updateData.payment_proof_url = payment_proof_url
    if (notes !== undefined) updateData.notes = notes

    const { data: purchase, error: updateError } = await adminClient
      .from('ticket_purchases')
      .update(updateData)
      .eq('id', purchase_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating purchase:', updateError)
      return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
    }

    return NextResponse.json({ purchase })
  } catch (error: any) {
    console.error('Error in PUT /api/tickets/purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE cancel purchase
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const purchaseId = searchParams.get('id')

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check ownership and status
    const { data: purchase, error: checkError } = await adminClient
      .from('ticket_purchases')
      .select('user_id, status')
      .eq('id', purchaseId)
      .single()

    if (checkError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.user_id !== userData.id) {
      return NextResponse.json({ error: 'Not your purchase' }, { status: 403 })
    }

    if (purchase.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Can only cancel pending purchases' 
      }, { status: 400 })
    }

    // Update to cancelled instead of deleting
    const { error: updateError } = await adminClient
      .from('ticket_purchases')
      .update({ status: 'cancelled' })
      .eq('id', purchaseId)

    if (updateError) {
      console.error('Error cancelling purchase:', updateError)
      return NextResponse.json({ error: 'Failed to cancel purchase' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Purchase cancelled' })
  } catch (error: any) {
    console.error('Error in DELETE /api/tickets/purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
