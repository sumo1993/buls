import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/public-tickets - Get tickets for a public event (no auth required)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the event allows public registration
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, allow_public_registration')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.allow_public_registration) {
      return NextResponse.json(
        { error: 'This event does not allow public registration' },
        { status: 403 }
      )
    }

    // Get active tickets for this event
    const { data: tickets, error: ticketsError } = await adminClient
      .from('event_tickets')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tickets: tickets || [] })
  } catch (error: any) {
    console.error('Error in GET /api/public-tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
