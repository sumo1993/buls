import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET event configuration
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

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch event with configuration fields
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select(`
        id,
        title,
        event_type,
        requires_registration,
        registration_deadline,
        max_guests_per_member,
        allow_guest_registration,
        is_public,
        capacity,
        waitlist_enabled,
        ticket_only,
        event_date,
        allow_public_registration,
        require_guest_approval,
        payment_qr_code_url
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Default values if columns don't exist yet
    const configuration = {
      id: event.id,
      title: event.title,
      event_type: event.event_type || 'free', // free, ticket_only, registration_required, hybrid
      requires_registration: event.requires_registration || false,
      registration_deadline: event.registration_deadline,
      max_guests_per_member: event.max_guests_per_member || 0,
      allow_guest_registration: event.allow_guest_registration || false,
      is_public: event.is_public ?? true,
      capacity: event.capacity,
      waitlist_enabled: event.waitlist_enabled || false,
      ticket_only: event.ticket_only || false,
      event_date: event.event_date,
      allow_public_registration: event.allow_public_registration || false,
      require_guest_approval: event.require_guest_approval ?? true,
      payment_qr_code_url: event.payment_qr_code_url || null
    }

    return NextResponse.json({ configuration })
  } catch (error: any) {
    console.error('Error fetching event configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update event configuration
export async function PATCH(
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

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const {
      event_type,
      requires_registration,
      registration_deadline,
      max_guests_per_member,
      allow_guest_registration,
      is_public,
      capacity,
      waitlist_enabled,
      ticket_only,
      allow_public_registration,
      require_guest_approval,
      payment_qr_code_url
    } = body

    // Validate event_type
    const validEventTypes = ['free', 'ticket_only', 'registration_required', 'hybrid']
    if (event_type && !validEventTypes.includes(event_type)) {
      return NextResponse.json({ 
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Validate max_guests_per_member
    if (max_guests_per_member !== undefined && (max_guests_per_member < 0 || max_guests_per_member > 10)) {
      return NextResponse.json({ 
        error: 'max_guests_per_member must be between 0 and 10' 
      }, { status: 400 })
    }

    // Validate capacity
    if (capacity !== undefined && capacity !== null && capacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 })
    }

    // Validate registration_deadline
    let regDeadline = null
    if (registration_deadline) {
      regDeadline = new Date(registration_deadline)
      if (isNaN(regDeadline.getTime())) {
        return NextResponse.json({ error: 'Invalid registration deadline' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: any = {}
    if (event_type !== undefined) updateData.event_type = event_type
    if (requires_registration !== undefined) updateData.requires_registration = requires_registration
    if (registration_deadline !== undefined) updateData.registration_deadline = regDeadline?.toISOString() || null
    if (max_guests_per_member !== undefined) updateData.max_guests_per_member = max_guests_per_member
    if (allow_guest_registration !== undefined) updateData.allow_guest_registration = allow_guest_registration
    if (is_public !== undefined) updateData.is_public = is_public
    if (capacity !== undefined) updateData.capacity = capacity
    if (waitlist_enabled !== undefined) updateData.waitlist_enabled = waitlist_enabled
    if (ticket_only !== undefined) updateData.ticket_only = ticket_only
    if (allow_public_registration !== undefined) updateData.allow_public_registration = allow_public_registration
    if (require_guest_approval !== undefined) updateData.require_guest_approval = require_guest_approval
    if (payment_qr_code_url !== undefined) updateData.payment_qr_code_url = payment_qr_code_url

    // Update event configuration
    const { data: event, error: updateError } = await adminClient
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select(`
        id,
        title,
        event_type,
        requires_registration,
        registration_deadline,
        max_guests_per_member,
        allow_guest_registration,
        is_public,
        capacity,
        waitlist_enabled,
        ticket_only,
        allow_public_registration,
        require_guest_approval,
        payment_qr_code_url
      `)
      .single()

    if (updateError) {
      console.error('Error updating event configuration:', updateError)
      return NextResponse.json({ error: 'Failed to update event configuration' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Event configuration updated successfully',
      configuration: event 
    })
  } catch (error: any) {
    console.error('Error updating event configuration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}