import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy, spotsRemaining } from '@/lib/event-capacity'

// POST /api/events/[id]/waitlist/promote - Promote member(s) from waitlist
export async function POST(
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

    const body = await req.json()
    const { user_ids, auto_promote_count } = body

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('capacity, title, waitlist_enabled')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.waitlist_enabled) {
      return NextResponse.json({ error: 'Waitlist not enabled for this event' }, { status: 400 })
    }

    const occupancy = await getEventOccupancy(adminClient, eventId)
    const availableSpots = spotsRemaining(event.capacity, occupancy.total) ?? 0

    if (availableSpots <= 0) {
      return NextResponse.json({ error: 'No available spots' }, { status: 400 })
    }

    let usersToPromote: string[] = []

    if (user_ids && Array.isArray(user_ids)) {
      usersToPromote = user_ids.slice(0, availableSpots)
    } else if (auto_promote_count && typeof auto_promote_count === 'number') {
      const count = Math.min(auto_promote_count, availableSpots)
      
      const { data: waitlistUsers } = await adminClient
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true })
        .limit(count)

      usersToPromote = waitlistUsers?.map(w => w.user_id) || []
    } else {
      const { data: firstWaitlist } = await adminClient
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstWaitlist) {
        usersToPromote = [firstWaitlist.user_id]
      }
    }

    if (usersToPromote.length === 0) {
      return NextResponse.json({ error: 'No users to promote from waitlist' }, { status: 400 })
    }

    const { data: promoted, error: updateError } = await adminClient
      .from('event_registrations')
      .update({
        status: 'registered',
        promoted_from_waitlist_at: new Date().toISOString(),
        waitlist_notified_at: new Date().toISOString(),
        waitlist_position: null
      })
      .eq('event_id', eventId)
      .in('user_id', usersToPromote)
      .eq('status', 'waitlist')
      .select(`
        *,
        user:users(full_name, email)
      `)

    if (updateError) {
      console.error('Error promoting from waitlist:', updateError)
      return NextResponse.json({ error: 'Failed to promote from waitlist' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      promoted_count: promoted?.length || 0,
      promoted_users: promoted?.map(p => ({
        user_id: p.user_id,
        name: p.user?.full_name,
        email: p.user?.email
      })),
      message: `Successfully promoted ${promoted?.length || 0} member(s) from waitlist`
    })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/waitlist/promote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
