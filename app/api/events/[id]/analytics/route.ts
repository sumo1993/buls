import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/analytics - Get single event analytics
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

    // Get analytics from view
    const { data: analytics, error } = await adminClient
      .from('event_analytics')
      .select('*')
      .eq('event_id', eventId)
      .single()

    if (error) {
      console.error('Error fetching event analytics:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Get hourly check-in distribution
    const { data: checkins } = await adminClient
      .from('event_checkins')
      .select('checked_in_at')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: true })

    const hourlyCheckIns: { [key: string]: number } = {}
    checkins?.forEach(c => {
      const hour = new Date(c.checked_in_at).getHours()
      const hourKey = `${hour}:00`
      hourlyCheckIns[hourKey] = (hourlyCheckIns[hourKey] || 0) + 1
    })

    // Get feedback breakdown
    const { data: feedbackBreakdown } = await adminClient
      .from('event_feedback')
      .select('rating, feedback_type')
      .eq('event_id', eventId)

    const ratingDistribution = {
      5: feedbackBreakdown?.filter(f => f.rating === 5).length || 0,
      4: feedbackBreakdown?.filter(f => f.rating === 4).length || 0,
      3: feedbackBreakdown?.filter(f => f.rating === 3).length || 0,
      2: feedbackBreakdown?.filter(f => f.rating === 2).length || 0,
      1: feedbackBreakdown?.filter(f => f.rating === 1).length || 0,
    }

    const feedbackByType = {
      general: feedbackBreakdown?.filter(f => f.feedback_type === 'general').length || 0,
      venue: feedbackBreakdown?.filter(f => f.feedback_type === 'venue').length || 0,
      content: feedbackBreakdown?.filter(f => f.feedback_type === 'content').length || 0,
      organization: feedbackBreakdown?.filter(f => f.feedback_type === 'organization').length || 0,
    }

    // Get registration timeline
    const { data: registrations } = await adminClient
      .from('event_registrations')
      .select('registered_at')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    const { data: purchases } = await adminClient
      .from('ticket_purchases')
      .select('created_at, quantity')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true })

    // Combine and group by day
    const registrationTimeline: { [key: string]: number } = {}
    
    registrations?.forEach(r => {
      const day = new Date(r.registered_at).toISOString().split('T')[0]
      registrationTimeline[day] = (registrationTimeline[day] || 0) + 1
    })

    purchases?.forEach(p => {
      const day = new Date(p.created_at).toISOString().split('T')[0]
      registrationTimeline[day] = (registrationTimeline[day] || 0) + p.quantity
    })

    return NextResponse.json({
      ...analytics,
      detailed_stats: {
        hourly_checkins: Object.entries(hourlyCheckIns).map(([hour, count]) => ({
          hour,
          count
        })),
        rating_distribution: ratingDistribution,
        feedback_by_type: feedbackByType,
        registration_timeline: Object.entries(registrationTimeline)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({
            date,
            count
          }))
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
