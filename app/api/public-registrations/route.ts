import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy, isEventFull } from '@/lib/event-capacity'

// POST - Create public registration (no auth required for public)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      event_id,
      full_name,
      email,
      phone,
      address,
      message,
      registration_type,
      ticket_id,
      amount_paid,
      payment_option,
      payment_method,
      payment_proof_url
    } = body

    // Validate required fields
    if (!event_id || !full_name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, full_name, email, phone' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get event details
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, allow_public_registration, require_guest_approval, capacity, event_type')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.allow_public_registration) {
      return NextResponse.json(
        { error: 'This event does not allow public registration' },
        { status: 403 }
      )
    }

    // Check capacity (same rules as member / non-member paths)
    const occupancy = await getEventOccupancy(adminClient, event_id)
    if (isEventFull(event.capacity, occupancy.total)) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    // Check for duplicate registration
    const { data: existing } = await adminClient
      .from('public_registrations')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already registered for this event' },
          { status: 400 }
        )
      } else if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Your registration is pending approval' },
          { status: 400 }
        )
      }
    }

    // Determine initial status
    let initialStatus = 'pending'
    
    if (registration_type === 'paid') {
      initialStatus = 'payment_pending'
    } else if (event.require_guest_approval === false) {
      initialStatus = 'approved'
    }

    // Create registration
    const { data: registration, error: insertError } = await adminClient
      .from('public_registrations')
      .insert({
        event_id,
        full_name,
        email,
        phone,
        address,
        message,
        registration_type: registration_type || 'free',
        ticket_id,
        amount_paid,
        payment_option: payment_option || 'online',
        payment_method,
        payment_proof_url,
        status: initialStatus,
        registered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating registration:', insertError)
      return NextResponse.json(
        { error: 'Failed to create registration', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      registration,
      message: initialStatus === 'approved' 
        ? 'Successfully registered!' 
        : initialStatus === 'payment_pending'
        ? 'Registration submitted. Awaiting payment verification.'
        : 'Registration submitted. Awaiting approval.'
    })
  } catch (error: any) {
    console.error('Error in POST /api/public-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Fetch public registrations (admin/secretary only)
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (!userData || !['admin', 'secretary', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    const status = searchParams.get('status')

    let query = adminClient
      .from('public_registrations')
      .select('*')
      .order('registered_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: registrations, error } = await query

    if (error) {
      console.error('Error fetching registrations:', error)
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
    }

    return NextResponse.json({ registrations })
  } catch (error: any) {
    console.error('Error in GET /api/public-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update registration status (admin/secretary only)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (!userData || !['admin', 'secretary', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { registration_id, status, rejection_reason, payment_notes } = body

    if (!registration_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: registration_id, status' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = userData.id
    }

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    if (payment_notes) {
      updateData.payment_notes = payment_notes
    }

    const { data: registration, error } = await adminClient
      .from('public_registrations')
      .update(updateData)
      .eq('id', registration_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating registration:', error)
      return NextResponse.json(
        { error: 'Failed to update registration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ registration, message: 'Registration updated successfully' })
  } catch (error: any) {
    console.error('Error in PUT /api/public-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete registration (admin/secretary only)
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (!userData || !['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const registrationId = searchParams.get('id')

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registration ID' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('public_registrations')
      .delete()
      .eq('id', registrationId)

    if (error) {
      console.error('Error deleting registration:', error)
      return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Registration deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/public-registrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
