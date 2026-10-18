import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventOccupancy, isEventFull } from '@/lib/event-capacity'

// Generate unique 5-digit verification code
async function generateVerificationCode(adminClient: any): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const code = Math.floor(10000 + Math.random() * 90000).toString()
    
    const { data, error } = await adminClient
      .from('non_member_registrations')
      .select('verification_code')
      .eq('verification_code', code)
      .single()
    
    if (error || !data) {
      return code
    }
    
    attempts++
  }
  
  return Date.now().toString().slice(-5)
}

// POST - Non-member registration (no auth required)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event_id, full_name, email, phone, country, city, address, education_level, message, payment_proof_url, amount_paid } = body

    if (!event_id || !full_name || !email || !phone || !country || !city || !education_level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, capacity, allow_public_registration, is_public, registration_deadline, status')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status === 'cancelled' || event.status === 'completed') {
      return NextResponse.json({ error: 'This event is not open for registration' }, { status: 400 })
    }

    if (!event.allow_public_registration && !event.is_public) {
      return NextResponse.json(
        { error: 'This event does not allow non-member registration' },
        { status: 403 }
      )
    }

    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
    }

    const occupancy = await getEventOccupancy(adminClient, event_id)
    if (isEventFull(event.capacity, occupancy.total)) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    // Duplicate check by email
    const { data: existing } = await adminClient
      .from('non_member_registrations')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('email', email)
      .maybeSingle()

    if (existing && !['rejected', 'refunded'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'You are already registered for this event' },
        { status: 400 }
      )
    }

    const verificationCode = await generateVerificationCode(adminClient)

    const { data: registration, error: insertError } = await adminClient
      .from('non_member_registrations')
      .insert({
        event_id,
        full_name,
        email,
        phone,
        country,
        city,
        address,
        education_level,
        message,
        payment_proof_url,
        amount_paid: amount_paid || 0,
        verification_code: verificationCode,
        status: payment_proof_url ? 'payment_pending' : 'pending',
        registered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Registration submitted successfully',
      registration,
      verification_code: verificationCode
    })
  } catch (error: any) {
    console.error('Error in non-member registration:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check registration status by verification code (no auth required)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { data: registration, error } = await adminClient
      .from('non_member_registrations')
      .select(`
        id,
        event_id,
        full_name,
        email,
        phone,
        status,
        registered_at,
        events (
          id,
          title,
          event_date,
          location
        )
      `)
      .eq('verification_code', code)
      .single()

    if (error || !registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Normalize for clients that still read start_date
    const events = registration.events as any
    if (events && !events.start_date && events.event_date) {
      events.start_date = events.event_date
    }

    return NextResponse.json({ registration })
  } catch (error: any) {
    console.error('Error checking registration status:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
