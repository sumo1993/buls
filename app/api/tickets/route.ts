import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET ticket types for an event (public — browsing does not require login)
export async function GET(req: Request) {
  try {
    await auth().catch(() => null)

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('event_id') || searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get all ticket types for the event
    const { data: tickets, error: ticketsError } = await adminClient
      .from('event_tickets')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    // Calculate availability for each ticket
    const ticketsWithAvailability = tickets.map(ticket => {
      const available = ticket.quantity_available 
        ? ticket.quantity_available - ticket.quantity_sold 
        : null // null means unlimited
      
      return {
        ...ticket,
        available,
        is_available: available === null || available > 0
      }
    })

    return NextResponse.json({ tickets: ticketsWithAvailability })
  } catch (error: any) {
    console.error('Error in GET /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create ticket type (Secretary/Admin only)
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      event_id, 
      name, 
      description, 
      price, 
      quantity_available, 
      sale_start_date, 
      sale_end_date,
      ticket_image_url,
      payment_methods,
      payment_instructions
    } = body

    // Validate required fields
    if (!event_id || !name || price === undefined || price === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (price < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })
    }

    // Create ticket type
    const { data: ticket, error: insertError } = await adminClient
      .from('event_tickets')
      .insert({
        event_id,
        name,
        description: description || null,
        price,
        quantity_available: quantity_available || null,
        sale_start_date: sale_start_date || null,
        sale_end_date: sale_end_date || null,
        ticket_image_url: ticket_image_url || null,
        payment_methods: payment_methods || null,
        payment_instructions: payment_instructions || null,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating ticket:', insertError)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update ticket type
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      id, 
      name, 
      description, 
      price, 
      quantity_available, 
      is_active, 
      sale_start_date, 
      sale_end_date,
      ticket_image_url,
      payment_methods,
      payment_instructions
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (quantity_available !== undefined) updateData.quantity_available = quantity_available
    if (is_active !== undefined) updateData.is_active = is_active
    if (sale_start_date !== undefined) updateData.sale_start_date = sale_start_date
    if (sale_end_date !== undefined) updateData.sale_end_date = sale_end_date
    if (ticket_image_url !== undefined) updateData.ticket_image_url = ticket_image_url
    if (payment_methods !== undefined) updateData.payment_methods = payment_methods
    if (payment_instructions !== undefined) updateData.payment_instructions = payment_instructions
    updateData.updated_at = new Date().toISOString()

    const { data: ticket, error: updateError } = await adminClient
      .from('event_tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    console.error('Error in PUT /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE ticket type
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticketId = searchParams.get('id')

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if any tickets have been sold
    const { data: purchases, error: purchasesError } = await adminClient
      .from('ticket_purchases')
      .select('id')
      .eq('ticket_id', ticketId)
      .limit(1)

    if (purchasesError) {
      console.error('Error checking purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to check purchases' }, { status: 500 })
    }

    if (purchases && purchases.length > 0) {
      // Don't delete, just deactivate
      const { error: deactivateError } = await adminClient
        .from('event_tickets')
        .update({ is_active: false })
        .eq('id', ticketId)

      if (deactivateError) {
        return NextResponse.json({ error: 'Failed to deactivate ticket' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Ticket deactivated (has purchases)' })
    }

    // No purchases, safe to delete
    const { error: deleteError } = await adminClient
      .from('event_tickets')
      .delete()
      .eq('id', ticketId)

    if (deleteError) {
      console.error('Error deleting ticket:', deleteError)
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
