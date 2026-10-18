import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy, spotsRemaining } from '@/lib/event-capacity'

// GET public events (no auth required)
export async function GET(req: Request) {
  try {
    const adminClient = createAdminClient()

    // Get all upcoming events with allow_public_registration = true
    const { data: events, error } = await adminClient
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        location,
        event_type,
        capacity,
        cover_image_url,
        allow_public_registration,
        require_guest_approval,
        registration_deadline,
        payment_qr_code_url,
        status,
        tshirt_enabled,
        tshirt_pricing,
        tshirt_price,
        tshirt_sizes,
        tshirt_required,
        tshirt_image_url
      `)
      .eq('allow_public_registration', true)
      .neq('status', 'cancelled')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error fetching public events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const eventsWithCount = await Promise.all(
      (events || []).map(async (event) => {
        const occupancy = await getEventOccupancy(adminClient, event.id)
        const totalCount = occupancy.total
        const remaining = spotsRemaining(event.capacity, totalCount)

        let registrationStatus = 'open'
        if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
          registrationStatus = 'closed'
        } else if (event.capacity && totalCount >= event.capacity) {
          registrationStatus = 'full'
        }

        return {
          ...event,
          registration_count: totalCount,
          occupancy,
          spots_remaining: remaining,
          registration_status: registrationStatus
        }
      })
    )

    return NextResponse.json({ events: eventsWithCount })
  } catch (error: any) {
    console.error('Error in GET /api/public-events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
