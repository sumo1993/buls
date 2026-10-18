import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy, spotsRemaining } from '@/lib/event-capacity'

// GET /api/events/[id]/waitlist - Get waitlist for an event
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: eventId } = await params

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: waitlist, error } = await adminClient
      .from('event_registrations')
      .select(`
        *,
        user:users(id, full_name, email, phone)
      `)
      .eq('event_id', eventId)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })

    if (error) {
      console.error('Error fetching waitlist:', error)
      return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 })
    }

    const { data: event } = await adminClient
      .from('events')
      .select('capacity, title, waitlist_enabled')
      .eq('id', eventId)
      .single()

    const occupancy = await getEventOccupancy(adminClient, eventId)
    const availableSpots = spotsRemaining(event?.capacity, occupancy.total) ?? 0

    return NextResponse.json({
      waitlist,
      stats: {
        total_waitlist: waitlist?.length || 0,
        available_spots: availableSpots,
        can_promote: availableSpots > 0 && (waitlist?.length || 0) > 0,
        event_capacity: event?.capacity,
        occupied: occupancy.total,
        occupancy
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/waitlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
