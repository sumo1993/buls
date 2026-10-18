import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/checkins - Get all check-ins for an event
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

    // Get user to check role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin, secretary, or event collaborator)
    if (!['admin', 'secretary'].includes(userData.role)) {
      // Check if user is a collaborator
      const { data: collaborator } = await adminClient
        .from('event_collaborators')
        .select('permissions')
        .eq('event_id', eventId)
        .eq('user_id', userData.id)
        .maybeSingle()

      if (!collaborator || !collaborator.permissions.includes('check_in')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get all check-ins with user details
    const { data: checkins, error } = await adminClient
      .from('event_checkins')
      .select(`
        *,
        user:users!event_checkins_user_id_fkey(id, full_name, email),
        checked_in_by_user:users!event_checkins_checked_in_by_fkey(full_name)
      `)
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })

    if (error) {
      console.error('Error fetching check-ins:', error)
      return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
    }

    // Get total registered/purchased count
    const { data: registrations } = await adminClient
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)

    const { data: purchases } = await adminClient
      .from('ticket_purchases')
      .select('id, quantity')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid')

    const totalRegistered = (registrations?.length || 0) + 
      (purchases?.reduce((sum, p) => sum + p.quantity, 0) || 0)

    const stats = {
      total_checked_in: checkins.length,
      total_registered: totalRegistered,
      attendance_rate: totalRegistered > 0 
        ? ((checkins.length / totalRegistered) * 100).toFixed(2)
        : 0,
      check_in_methods: {
        qr_scan: checkins.filter(c => c.check_in_method === 'qr_scan').length,
        manual: checkins.filter(c => c.check_in_method === 'manual').length,
        self_checkin: checkins.filter(c => c.check_in_method === 'self_checkin').length,
      }
    }

    return NextResponse.json({ checkins, stats })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/checkins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
