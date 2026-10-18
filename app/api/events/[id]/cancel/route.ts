import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/events/[id]/cancel - Cancel an event
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

    const body = await req.json()
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    // Update event to cancelled
    const { data: event, error: updateError } = await adminClient
      .from('events')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userData.id,
        cancellation_reason: reason
      })
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling event:', updateError)
      return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 })
    }

    // TODO: Send cancellation notifications to all registered members
    // This can be added later with the notification system

    return NextResponse.json({ 
      success: true, 
      event,
      message: 'Event cancelled successfully. Registered members will be notified.'
    })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/cancel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
