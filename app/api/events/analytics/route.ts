import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET /api/events/analytics - Get overall event analytics
export async function GET(req: Request) {
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

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'all' // all, month, year
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1

    // Get analytics from view
    let query = adminClient
      .from('event_analytics')
      .select('*')

    // Filter by period
    if (period === 'year') {
      const startDate = new Date(year, 0, 1).toISOString()
      const endDate = new Date(year + 1, 0, 1).toISOString()
      query = query.gte('event_date', startDate).lt('event_date', endDate)
    } else if (period === 'month') {
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 1).toISOString()
      query = query.gte('event_date', startDate).lt('event_date', endDate)
    }

    const { data: analytics, error } = await query

    if (error) {
      console.error('Error fetching analytics:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = {
      total_events: analytics.length,
      by_status: {
        upcoming: analytics.filter(e => e.status === 'upcoming').length,
        ongoing: analytics.filter(e => e.status === 'ongoing').length,
        completed: analytics.filter(e => e.status === 'completed').length,
        cancelled: analytics.filter(e => e.status === 'cancelled').length,
      },
      total_registrations: analytics.reduce((sum, e) => sum + (e.registration_count || 0), 0),
      total_tickets_sold: analytics.reduce((sum, e) => sum + (e.total_tickets_sold || 0), 0),
      total_revenue: analytics.reduce((sum, e) => sum + parseFloat(e.total_revenue || 0), 0),
      total_checked_in: analytics.reduce((sum, e) => sum + (e.checked_in_count || 0), 0),
      average_attendance_rate: analytics.length > 0
        ? (analytics.reduce((sum, e) => sum + parseFloat(e.attendance_rate || 0), 0) / analytics.length).toFixed(2)
        : 0,
      average_rating: analytics.length > 0
        ? (analytics
            .filter(e => e.average_rating > 0)
            .reduce((sum, e) => sum + parseFloat(e.average_rating || 0), 0) / 
           analytics.filter(e => e.average_rating > 0).length || 1).toFixed(2)
        : 0,
      total_feedback: analytics.reduce((sum, e) => sum + (e.feedback_count || 0), 0),
    }

    // Get top performing events (by attendance rate)
    const topEvents = analytics
      .filter(e => e.status === 'completed')
      .sort((a, b) => parseFloat(b.attendance_rate || '0') - parseFloat(a.attendance_rate || '0'))
      .slice(0, 5)
      .map(e => ({
        event_id: e.event_id,
        title: e.title,
        attendance_rate: e.attendance_rate,
        rating: e.average_rating
      }))

    // Get monthly trends (if period is year or all)
    const monthlyTrends = []
    if (period === 'year' || period === 'all') {
      for (let m = 1; m <= 12; m++) {
        const monthEvents = analytics.filter(e => {
          const eventDate = new Date(e.event_date)
          return eventDate.getMonth() + 1 === m && eventDate.getFullYear() === year
        })

        monthlyTrends.push({
          month: m,
          total_events: monthEvents.length,
          total_attendees: monthEvents.reduce((sum, e) => sum + (e.checked_in_count || 0), 0),
          revenue: monthEvents.reduce((sum, e) => sum + parseFloat(e.total_revenue || 0), 0)
        })
      }
    }

    return NextResponse.json({
      summary,
      topEvents,
      monthlyTrends: period !== 'month' ? monthlyTrends : null,
      events: analytics,
      period: {
        type: period,
        year,
        month: period === 'month' ? month : null
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
