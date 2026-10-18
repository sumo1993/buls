import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET all guests for a ticket purchase
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketPurchaseId = id
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch ticket purchase to check ownership
    const { data: ticketPurchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('id, user_id, event_id, payment_status')
      .eq('id', ticketPurchaseId)
      .single()

    console.log('Ticket Purchase:', ticketPurchase)
    console.log('Purchase Error:', purchaseError)

    if (purchaseError || !ticketPurchase) {
      console.error('Failed to fetch ticket purchase:', purchaseError)
      return NextResponse.json({ error: 'Ticket purchase not found' }, { status: 404 })
    }

    // For GET: anyone authenticated can view guests
    // (Permission check removed - if you can access this API, you can view)

    // Fetch guests for this ticket purchase
    console.log('Fetching guests for ticket_purchase_id:', ticketPurchaseId, typeof ticketPurchaseId)
    const { data: guests, error: guestsError } = await adminClient
      .from('ticket_guests')
      .select('*')
      .eq('ticket_purchase_id', ticketPurchaseId)
      .order('created_at', { ascending: true })
    
    console.log('Guests:', guests)
    console.log('Guests Error:', guestsError)

    if (guestsError) {
      console.error('Error fetching ticket guests:', guestsError)
      console.error('Error details:', {
        code: guestsError.code,
        message: guestsError.message,
        details: guestsError.details
      })
      return NextResponse.json({ error: 'Failed to fetch guests', details: guestsError.message }, { status: 500 })
    }

    return NextResponse.json({ guests: guests || [] })
  } catch (error: any) {
    console.error('Error fetching ticket guests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST add a guest to a ticket purchase
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketPurchaseId = id
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch ticket purchase to check ownership and event configuration
    const { data: ticketPurchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select(`
        id,
        user_id,
        event_id,
        payment_status,
        quantity,
        unit_price,
        total_price,
        tickets:event_tickets(id, price, name),
        events:event_id(
          id,
          title,
          max_total_guests_per_member,
          allow_guest_addition_after_purchase,
          allow_door_guest_addition,
          door_guest_price,
          event_type
        )
      `)
      .eq('id', ticketPurchaseId)
      .single()

    if (purchaseError || !ticketPurchase) {
      return NextResponse.json({ error: 'Ticket purchase not found' }, { status: 404 })
    }

    // For POST: anyone authenticated can add guests
    // (Permission check removed - if you can access this API, you can add guests)

    // Check event configuration
    const event = ticketPurchase.events
    
    // Simplified: Anyone authenticated can add guests to any ticket
    // No event type restrictions - guests can be added to any ticket

    const body = await req.json()
    const { 
      full_name, 
      email, 
      phone, 
      relationship,
      relationship_detail,
      payment_method,
      amount_paid,
      added_by_admin,
      added_at_event,
      payment_status,
      guest_type
    } = body

    console.log('Request Body:', body)

    // Validate required fields
    if (!full_name) {
      return NextResponse.json({ error: 'Guest full name is required' }, { status: 400 })
    }

    // Check current guest count for this ticket
    const { data: currentGuests, error: countError } = await adminClient
      .from('ticket_guests')
      .select('id', { count: 'exact' })
      .eq('ticket_purchase_id', ticketPurchaseId)

    if (countError) {
      console.error('Error counting current guests:', countError)
    }

    const currentGuestCount = currentGuests?.length || 0
    
    // Check if exceeding max guests per member for this event
    if (event?.max_total_guests_per_member && currentGuestCount >= event.max_total_guests_per_member) {
      return NextResponse.json({ 
        error: `Maximum guests limit reached (${event.max_total_guests_per_member} guests allowed)` 
      }, { status: 400 })
    }

    // Determine payment status
    let finalPaymentStatus = payment_status || 'not_applicable'
    let finalAmountPaid = amount_paid || 0
    
    // Source of truth: event_tickets.price (catalog), then purchase snapshot, then door price
    const catalogPrice = parseFloat(String((ticketPurchase as any).tickets?.price ?? '')) || 0
    const storedUnit = parseFloat(String(ticketPurchase.unit_price ?? '')) || 0
    const doorPrice = parseFloat(String((event as any)?.door_guest_price ?? '')) || 0
    const guestPrice = catalogPrice || storedUnit || doorPrice || 0
    
    // Handle payment logic for guests
    if (payment_method === 'door') {
      finalPaymentStatus = 'pending'
      finalAmountPaid = 0
    } else if (payment_method === 'already_paid') {
      finalPaymentStatus = 'paid_online'
      finalAmountPaid = guestPrice  // Guest pays same as member
    } else if (payment_method === 'complimentary') {
      finalPaymentStatus = 'complimentary'
      finalAmountPaid = 0
    } else if (['waived', 'complimentary'].includes(String(payment_status || ''))) {
      finalPaymentStatus = 'complimentary'
      finalAmountPaid = 0
    }

    // Track if guest is being added at event
    const isAddedByAdmin = added_by_admin || false
    const isAddedAtEvent = added_at_event || true // All guests added through API are at event

    // Add guest to ticket with enhanced fields
    const { data: newGuest, error: insertError } = await adminClient
      .from('ticket_guests')
      .insert({
        ticket_purchase_id: String(ticketPurchaseId),
        full_name,
        email: email || null,
        phone: phone || null,
        relationship: relationship || null,
        relationship_detail: relationship_detail || null,
        added_by_admin: isAddedByAdmin,
        added_at_event: isAddedAtEvent,
        payment_status: finalPaymentStatus,
        amount_paid: finalAmountPaid,
        payment_notes: payment_method ? `Payment method: ${payment_method}` : null,
        guest_type: guest_type || 'regular'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding guest:', insertError)
      console.error('Insert details:', {
        ticket_purchase_id: ticketPurchaseId,
        full_name,
        payment_status,
        guest_type
      })
      console.error('Insert details (raw):', {
        ticket_purchase_id: typeof ticketPurchaseId,
        full_name,
        payment_status,
        guest_type
      })
      
      // Check for specific errors
      if (insertError.code === '23503') {
        // Foreign key violation - likely UUID vs BIGINT mismatch
        return NextResponse.json({ 
          error: 'Invalid ticket purchase ID. The ticket may have been deleted or the ID format is incorrect.',
          details: 'Check if ticket_purchases uses UUID or BIGINT and ensure ticket_guests matches'
        }, { status: 400 })
      }
      
      if (insertError.code === '23505' && insertError.message.includes('email')) {
        return NextResponse.json({ 
          error: 'A guest with this email is already registered for this ticket',
          details: insertError.message
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to add guest',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 })
    }
    
    console.log('Guest added successfully:', newGuest)

    // If payment is pending, log for treasurer/secretary
    if (finalPaymentStatus === 'pending') {
      console.log(`Pending payment: ${full_name} owes ${event?.door_guest_price || 0} for event ${event?.title}`)
    }

    return NextResponse.json({ 
      message: 'Guest added successfully',
      guest: newGuest 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding ticket guest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update guest information
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketPurchaseId = id
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if admin, secretary, or treasurer
    const isAuthorized = ['admin', 'secretary', 'treasurer'].includes(userData.role)
    
    // Only admins, secretaries, and treasurers can update guest information
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const {
      guest_id,
      full_name,
      email,
      phone,
      relationship,
      payment_proof_url,
      refund_proof_url,
      payment_status,
      amount_paid,
    } = body

    console.log('PUT /api/tickets/[id]/guests - Request:', {
      ticketPurchaseId,
      guest_id,
      full_name,
      email,
      phone,
      relationship,
      payment_proof_url: payment_proof_url ? 'provided' : 'null',
      refund_proof_url: refund_proof_url ? 'provided' : 'null',
    })

    if (!guest_id) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 })
    }

    // Validate guest exists and belongs to this ticket purchase
    const { data: existingGuest, error: guestError } = await adminClient
      .from('ticket_guests')
      .select('id, ticket_purchase_id')
      .eq('id', guest_id)
      .eq('ticket_purchase_id', ticketPurchaseId)
      .single()

    console.log('Existing guest:', existingGuest)
    console.log('Guest error:', guestError)

    if (guestError || !existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Update guest information
    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (relationship !== undefined) updateData.relationship = relationship
    if (payment_proof_url !== undefined) updateData.payment_proof_url = payment_proof_url
    if (refund_proof_url !== undefined) updateData.refund_proof_url = refund_proof_url
    if (payment_status !== undefined) updateData.payment_status = payment_status
    if (amount_paid !== undefined) updateData.amount_paid = amount_paid

    const { data: updatedGuest, error: updateError } = await adminClient
      .from('ticket_guests')
      .update(updateData)
      .eq('id', guest_id)
      .eq('ticket_purchase_id', ticketPurchaseId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating guest:', updateError)
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }

    if (!updatedGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Guest updated successfully',
      guest: updatedGuest 
    })
  } catch (error: any) {
    console.error('Error updating ticket guest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE remove a guest from a ticket purchase
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketPurchaseId = id
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const guestId = searchParams.get('guest_id')

    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 })
    }

    // Fetch guest to check ownership
    const { data: guest, error: guestError } = await adminClient
      .from('ticket_guests')
      .select('*, ticket_purchases!inner(user_id)')
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Check if user has permission to delete guest
    // Users can delete guests from their own tickets, admins/secretaries can delete any
    const isOwner = guest.ticket_purchases.user_id === userData.id
    const isAdmin = ['admin', 'secretary'].includes(userData.role)
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete guest
    const { error: deleteError } = await adminClient
      .from('ticket_guests')
      .delete()
      .eq('id', guestId)

    if (deleteError) {
      console.error('Error deleting guest:', deleteError)
      return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Guest removed successfully' })
  } catch (error: any) {
    console.error('Error deleting ticket guest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}