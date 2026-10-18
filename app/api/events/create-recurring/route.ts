import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/events/create-recurring - Create a recurring event series
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

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

    const body = await req.json()
    const {
      title,
      description,
      location,
      event_type,
      start_date,
      start_time,
      recurrence_pattern, // daily, weekly, monthly, yearly
      recurrence_interval, // Every X days/weeks/months
      recurrence_end_date,
      exceptions, // Array of dates to skip
      capacity,
      requires_registration,
      registration_deadline_days_before, // Number of days before event
      cover_image_url
    } = body

    // Validate required fields
    if (!title || !start_date || !recurrence_pattern) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, start_date, recurrence_pattern' 
      }, { status: 400 })
    }

    // Validate recurrence pattern
    const validPatterns = ['daily', 'weekly', 'monthly', 'yearly']
    if (!validPatterns.includes(recurrence_pattern)) {
      return NextResponse.json({ 
        error: `Invalid recurrence_pattern. Must be one of: ${validPatterns.join(', ')}` 
      }, { status: 400 })
    }

    const validEventTypes = ['free', 'ticket_only', 'registration_required', 'hybrid']
    const resolvedEventType = event_type || 'free'
    if (!validEventTypes.includes(resolvedEventType)) {
      return NextResponse.json({
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
      }, { status: 400 })
    }

    // Generate event dates based on recurrence pattern
    const eventDates = generateRecurringDates(
      new Date(start_date),
      recurrence_pattern,
      recurrence_interval || 1,
      recurrence_end_date ? new Date(recurrence_end_date) : null,
      exceptions || []
    )

    if (eventDates.length === 0) {
      return NextResponse.json({ error: 'No valid event dates generated' }, { status: 400 })
    }

    // Create parent event (template)
    const { data: parentEvent, error: parentError } = await adminClient
      .from('events')
      .insert({
        title: `${title} (Series)`,
        description,
        event_date: new Date(start_date).toISOString(),
        location,
        event_type: resolvedEventType,
        is_recurring: true,
        recurrence_pattern,
        recurrence_interval: recurrence_interval || 1,
        recurrence_end_date: recurrence_end_date ? new Date(recurrence_end_date).toISOString() : null,
        recurrence_exceptions: exceptions || [],
        capacity,
        requires_registration: requires_registration || false,
        cover_image_url,
        status: 'upcoming',
        created_by: userData.id
      })
      .select()
      .single()

    if (parentError) {
      console.error('Error creating parent event:', parentError)
      return NextResponse.json({ error: 'Failed to create event series' }, { status: 500 })
    }

    // Create individual event instances
    const eventInstances = eventDates.map(date => {
      const eventDateTime = new Date(date)
      if (start_time) {
        const [hours, minutes] = start_time.split(':')
        eventDateTime.setHours(parseInt(hours), parseInt(minutes))
      }

      // Calculate registration deadline if needed
      let regDeadline = null
      if (requires_registration && registration_deadline_days_before) {
        regDeadline = new Date(eventDateTime)
        regDeadline.setDate(regDeadline.getDate() - registration_deadline_days_before)
      }

      return {
        title,
        description,
        event_date: eventDateTime.toISOString(),
        location,
        event_type: resolvedEventType,
        parent_event_id: parentEvent.id,
        is_recurring: false,
        capacity,
        requires_registration: requires_registration || false,
        registration_deadline: regDeadline ? regDeadline.toISOString() : null,
        cover_image_url,
        status: 'upcoming',
        created_by: userData.id
      }
    })

    const { data: createdEvents, error: insertError } = await adminClient
      .from('events')
      .insert(eventInstances)
      .select()

    if (insertError) {
      console.error('Error creating event instances:', insertError)
      // Clean up parent event
      await adminClient.from('events').delete().eq('id', parentEvent.id)
      return NextResponse.json({ error: 'Failed to create event instances' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      parent_event: parentEvent,
      created_events: createdEvents,
      total_events: createdEvents.length,
      message: `Successfully created ${createdEvents.length} recurring events`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/create-recurring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate recurring dates
function generateRecurringDates(
  startDate: Date,
  pattern: string,
  interval: number,
  endDate: Date | null,
  exceptions: string[]
): Date[] {
  const dates: Date[] = []
  const maxEvents = 100 // Safety limit
  let currentDate = new Date(startDate)
  const finalEndDate = endDate || new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate())

  while (currentDate <= finalEndDate && dates.length < maxEvents) {
    // Check if date is not in exceptions
    const dateStr = currentDate.toISOString().split('T')[0]
    if (!exceptions.includes(dateStr)) {
      dates.push(new Date(currentDate))
    }

    // Calculate next date based on pattern
    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval)
        break
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval))
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval)
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval)
        break
    }
  }

  return dates
}
