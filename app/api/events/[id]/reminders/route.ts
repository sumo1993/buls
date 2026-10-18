import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/events/[id]/reminders - Schedule reminders for event
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

    // Get user to check role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get event details
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('title, event_date, registration_deadline')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventDate = new Date(event.event_date)
    const now = new Date()

    if (eventDate < now) {
      return NextResponse.json({ error: 'Cannot schedule reminders for past events' }, { status: 400 })
    }

    // Get all registered users and ticket purchasers
    const { data: registrations } = await adminClient
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'registered')

    const { data: purchases } = await adminClient
      .from('ticket_purchases')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid')

    const allUserIds = [
      ...(registrations?.map(r => r.user_id) || []),
      ...(purchases?.map(p => p.user_id) || [])
    ]
    const uniqueUserIds = [...new Set(allUserIds)]

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ error: 'No registered users found' }, { status: 400 })
    }

    // Calculate reminder dates
    const reminders: any[] = []

    // 7 days before
    const sevenDaysBefore = new Date(eventDate)
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7)
    if (sevenDaysBefore > now) {
      uniqueUserIds.forEach(user_id => {
        reminders.push({
          event_id: parseInt(eventId),
          user_id,
          reminder_type: '7_days_before',
          scheduled_for: sevenDaysBefore.toISOString(),
          status: 'pending'
        })
      })
    }

    // 1 day before
    const oneDayBefore = new Date(eventDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)
    if (oneDayBefore > now) {
      uniqueUserIds.forEach(user_id => {
        reminders.push({
          event_id: parseInt(eventId),
          user_id,
          reminder_type: '1_day_before',
          scheduled_for: oneDayBefore.toISOString(),
          status: 'pending'
        })
      })
    }

    // 2 hours before
    const twoHoursBefore = new Date(eventDate)
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2)
    if (twoHoursBefore > now) {
      uniqueUserIds.forEach(user_id => {
        reminders.push({
          event_id: parseInt(eventId),
          user_id,
          reminder_type: '2_hours_before',
          scheduled_for: twoHoursBefore.toISOString(),
          status: 'pending'
        })
      })
    }

    // Registration deadline reminder (if applicable)
    if (event.registration_deadline) {
      const regDeadline = new Date(event.registration_deadline)
      const oneDayBeforeDeadline = new Date(regDeadline)
      oneDayBeforeDeadline.setDate(oneDayBeforeDeadline.getDate() - 1)
      
      if (oneDayBeforeDeadline > now) {
        // Get all users who haven't registered yet (this would need additional logic)
        // For now, skip this feature
      }
    }

    if (reminders.length === 0) {
      return NextResponse.json({ 
        error: 'All reminder times have passed. Cannot schedule reminders.' 
      }, { status: 400 })
    }

    // Delete existing pending reminders for this event
    await adminClient
      .from('event_reminders')
      .delete()
      .eq('event_id', eventId)
      .eq('status', 'pending')

    // Insert new reminders
    const { data: scheduledReminders, error: insertError } = await adminClient
      .from('event_reminders')
      .insert(reminders)
      .select()

    if (insertError) {
      console.error('Error scheduling reminders:', insertError)
      return NextResponse.json({ error: 'Failed to schedule reminders' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scheduled_count: scheduledReminders.length,
      recipients_count: uniqueUserIds.length,
      reminder_times: {
        seven_days: sevenDaysBefore > now ? sevenDaysBefore.toISOString() : null,
        one_day: oneDayBefore > now ? oneDayBefore.toISOString() : null,
        two_hours: twoHoursBefore > now ? twoHoursBefore.toISOString() : null,
      },
      message: `Scheduled ${scheduledReminders.length} reminders for ${uniqueUserIds.length} recipients`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/events/[id]/reminders - Get scheduled reminders for event
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

    const { data: reminders, error } = await adminClient
      .from('event_reminders')
      .select(`
        *,
        user:users(full_name, email)
      `)
      .eq('event_id', eventId)
      .order('scheduled_for', { ascending: true })

    if (error) {
      console.error('Error fetching reminders:', error)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    const stats = {
      total: reminders.length,
      pending: reminders.filter(r => r.status === 'pending').length,
      sent: reminders.filter(r => r.status === 'sent').length,
      failed: reminders.filter(r => r.status === 'failed').length,
      by_type: {
        '7_days_before': reminders.filter(r => r.reminder_type === '7_days_before').length,
        '1_day_before': reminders.filter(r => r.reminder_type === '1_day_before').length,
        '2_hours_before': reminders.filter(r => r.reminder_type === '2_hours_before').length,
      }
    }

    return NextResponse.json({ reminders, stats })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
