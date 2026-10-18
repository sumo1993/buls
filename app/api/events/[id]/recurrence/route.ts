import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/recurrence - Get recurrence info and related events
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

    // Get event details
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // If this is a child event, get parent and siblings
    if (event.parent_event_id) {
      const { data: parentEvent } = await adminClient
        .from('events')
        .select('*')
        .eq('id', event.parent_event_id)
        .single()

      const { data: siblingEvents } = await adminClient
        .from('events')
        .select('id, title, event_date, status')
        .eq('parent_event_id', event.parent_event_id)
        .order('event_date', { ascending: true })

      return NextResponse.json({
        event,
        is_recurring_instance: true,
        parent_event: parentEvent,
        sibling_events: siblingEvents,
        total_in_series: siblingEvents?.length || 0
      })
    }

    // If this is a parent event, get all children
    if (event.is_recurring) {
      const { data: childEvents } = await adminClient
        .from('events')
        .select('id, title, event_date, status')
        .eq('parent_event_id', eventId)
        .order('event_date', { ascending: true })

      return NextResponse.json({
        event,
        is_recurring_parent: true,
        child_events: childEvents,
        total_occurrences: childEvents?.length || 0,
        recurrence_info: {
          pattern: event.recurrence_pattern,
          interval: event.recurrence_interval,
          end_date: event.recurrence_end_date,
          exceptions: event.recurrence_exceptions
        }
      })
    }

    // Not a recurring event
    return NextResponse.json({
      event,
      is_recurring: false
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/recurrence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/events/[id]/recurrence - Update recurrence pattern
export async function PUT(
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

    const body = await req.json()
    const { add_exception, remove_exception, end_date } = body

    // Get current event
    const { data: event } = await adminClient
      .from('events')
      .select('recurrence_exceptions, is_recurring')
      .eq('id', eventId)
      .single()

    if (!event || !event.is_recurring) {
      return NextResponse.json({ error: 'Not a recurring event' }, { status: 400 })
    }

    const updateData: any = {}

    // Add exception date
    if (add_exception) {
      const currentExceptions = event.recurrence_exceptions || []
      if (!currentExceptions.includes(add_exception)) {
        updateData.recurrence_exceptions = [...currentExceptions, add_exception]
      }
    }

    // Remove exception date
    if (remove_exception) {
      const currentExceptions = event.recurrence_exceptions || []
      updateData.recurrence_exceptions = currentExceptions.filter((d: string) => d !== remove_exception)
    }

    // Update end date
    if (end_date) {
      updateData.recurrence_end_date = new Date(end_date).toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Update parent event
    const { data: updatedEvent, error: updateError } = await adminClient
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating recurrence:', updateError)
      return NextResponse.json({ error: 'Failed to update recurrence' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Recurrence pattern updated successfully'
    })
  } catch (error: any) {
    console.error('Error in PUT /api/events/[id]/recurrence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
