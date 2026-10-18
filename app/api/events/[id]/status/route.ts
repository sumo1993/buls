import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT /api/events/[id]/status - Update event status
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
    const { status } = body

    // Validate status
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Update event status
    const { data: event, error: updateError } = await adminClient
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating event status:', updateError)
      return NextResponse.json({ error: 'Failed to update event status' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      event,
      message: `Event status updated to ${status}`
    })
  } catch (error: any) {
    console.error('Error in PUT /api/events/[id]/status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
