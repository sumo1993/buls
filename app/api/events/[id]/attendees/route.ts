import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET all attendees for a free event
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch event to check type and permissions
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, event_type, allow_door_guest_addition')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = ['admin', 'secretary', 'treasurer'].includes(userData.role)
    
    // For free events, users can view their own attendees, admins can view all
    const { data: attendees, error: attendeesError } = await adminClient
      .from('event_attendees')
      .select(`
        *,
        user:user_id(id, full_name, email),
        created_by_user:created_by(id, full_name),
        checked_in_by_user:checked_in_by(id, full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (attendeesError) {
      console.error('Error fetching event attendees:', attendeesError)
      return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
    }

    // Filter for regular users (only show their own)
    let filteredAttendees = attendees || []
    if (!isAdmin) {
      filteredAttendees = filteredAttendees.filter((attendee: any) => 
        attendee.user_id === userData.id
      )
    }

    return NextResponse.json({ attendees: filteredAttendees })
  } catch (error: any) {
    console.error('Error fetching event attendees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST add an attendee to a free event
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch event to check type
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, event_type, max_total_guests_per_member')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is free (should allow attendees)
    if (event.event_type !== 'free' && event.event_type !== 'hybrid') {
      return NextResponse.json({ 
        error: 'Attendee management only available for free or hybrid events' 
      }, { status: 400 })
    }

    const body = await req.json()
    const { 
      full_name, 
      email, 
      phone, 
      relationship,
      relationship_detail,
      additional_info,
      is_walk_in
    } = body

    // Validate required fields
    if (!full_name) {
      return NextResponse.json({ error: 'Attendee full name is required' }, { status: 400 })
    }

    // Check current attendee count for this user
    const { data: currentAttendees, error: countError } = await adminClient
      .from('event_attendees')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('user_id', userData.id)

    if (countError) {
      console.error('Error counting current attendees:', countError)
    }

    const currentAttendeeCount = currentAttendees?.length || 0
    
    // Check if exceeding max attendees per member
    if (event?.max_total_guests_per_member && currentAttendeeCount >= event.max_total_guests_per_member) {
      return NextResponse.json({ 
        error: `Maximum attendees limit reached (${event.max_total_guests_per_member} attendees allowed)` 
      }, { status: 400 })
    }

    // Add attendee to free event
    const { data: newAttendee, error: insertError } = await adminClient
      .from('event_attendees')
      .insert({
        event_id: parseInt(eventId),
        user_id: userData.id,
        full_name,
        email: email || null,
        phone: phone || null,
        relationship: relationship || null,
        additional_info: additional_info || null,
        is_walk_in: is_walk_in || false,
        created_by: userData.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding attendee:', insertError)
      return NextResponse.json({ error: 'Failed to add attendee' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Attendee added successfully',
      attendee: newAttendee 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding event attendee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update attendee check-in status
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admins and secretaries can check in attendees
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { attendee_id, checked_in } = body

    if (!attendee_id) {
      return NextResponse.json({ error: 'Attendee ID is required' }, { status: 400 })
    }

    if (checked_in === undefined) {
      return NextResponse.json({ error: 'checked_in status is required' }, { status: 400 })
    }

    // Update attendee check-in status
    const updateData: any = {
      checked_in,
      updated_at: new Date().toISOString()
    }

    if (checked_in) {
      updateData.checked_in_at = new Date().toISOString()
      updateData.checked_in_by = userData.id
    } else {
      updateData.checked_in_at = null
      updateData.checked_in_by = null
    }

    const { data: updatedAttendee, error: updateError } = await adminClient
      .from('event_attendees')
      .update(updateData)
      .eq('id', attendee_id)
      .eq('event_id', eventId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating attendee check-in:', updateError)
      return NextResponse.json({ error: 'Failed to update attendee' }, { status: 500 })
    }

    if (!updatedAttendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: checked_in ? 'Attendee checked in successfully' : 'Attendee check-in removed',
      attendee: updatedAttendee 
    })
  } catch (error: any) {
    console.error('Error updating event attendee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE remove an attendee from a free event
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const attendeeId = searchParams.get('attendee_id')

    if (!attendeeId) {
      return NextResponse.json({ error: 'Attendee ID is required' }, { status: 400 })
    }

    // Fetch attendee to check ownership
    const { data: attendee, error: attendeeError } = await adminClient
      .from('event_attendees')
      .select('*')
      .eq('id', attendeeId)
      .single()

    if (attendeeError || !attendee) {
      return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
    }

    // Check if user has permission to delete attendee
    // Users can delete their own attendees, admins can delete any
    const isOwner = attendee.user_id === userData.id
    const isAdmin = ['admin', 'secretary'].includes(userData.role)
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete attendee
    const { error: deleteError } = await adminClient
      .from('event_attendees')
      .delete()
      .eq('id', attendeeId)

    if (deleteError) {
      console.error('Error deleting attendee:', deleteError)
      return NextResponse.json({ error: 'Failed to delete attendee' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Attendee removed successfully' })
  } catch (error: any) {
    console.error('Error deleting event attendee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}