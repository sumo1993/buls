import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// POST /api/checkin/qr - Check in via QR code scan
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checkerData = await getUserOrSync(userId)

    if (!checkerData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    const body = await req.json()
    const { qr_data } = body

    if (!qr_data) {
      return NextResponse.json({ error: 'qr_data is required' }, { status: 400 })
    }

    // Parse QR code data
    // Expected format: JSON with event_id, user_id, ticket info
    let qrInfo: any
    try {
      qrInfo = JSON.parse(qr_data)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 })
    }

    const { event_id, user_id, ticket_purchase_id, attendee } = qrInfo

    if (!event_id || !user_id) {
      return NextResponse.json({ error: 'QR code missing required data' }, { status: 400 })
    }

    // Check if user has permission for this event
    if (!['admin', 'secretary'].includes(checkerData.role)) {
      const { data: collaborator } = await adminClient
        .from('event_collaborators')
        .select('permissions')
        .eq('event_id', event_id)
        .eq('user_id', checkerData.id)
        .maybeSingle()

      if (!collaborator || !collaborator.permissions.includes('check_in')) {
        return NextResponse.json({ error: 'Insufficient permissions for this event' }, { status: 403 })
      }
    }

    // Verify event exists and is valid
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, status, event_date')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return NextResponse.json({ error: 'This event has been cancelled' }, { status: 400 })
    }

    // Verify ticket purchase is valid
    const { data: purchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('id, payment_status, user_id')
      .eq('id', ticket_purchase_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Invalid ticket' }, { status: 400 })
    }

    if (purchase.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Ticket payment not confirmed',
        payment_status: purchase.payment_status
      }, { status: 400 })
    }

    // Check if already checked in
    const { data: existingCheckin } = await adminClient
      .from('event_checkins')
      .select('id, checked_in_at, user:users!event_checkins_user_id_fkey(full_name)')
      .eq('event_id', event_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingCheckin) {
      return NextResponse.json({ 
        error: 'Already checked in',
        attendee_name: existingCheckin.user.full_name,
        checked_in_at: existingCheckin.checked_in_at,
        duplicate: true
      }, { status: 409 })
    }

    // Create check-in record
    const { data: checkin, error: insertError } = await adminClient
      .from('event_checkins')
      .insert({
        event_id,
        user_id,
        registration_id: ticket_purchase_id,
        registration_type: 'ticket_purchase',
        checked_in_by: checkerData.id,
        check_in_method: 'qr_scan',
        notes: `QR scanned by ${checkerData.full_name}`
      })
      .select(`
        *,
        user:users!event_checkins_user_id_fkey(id, full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating check-in:', insertError)
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      checkin,
      event: {
        title: event.title,
        date: event.event_date
      },
      attendee: {
        name: checkin.user.full_name,
        email: checkin.user.email
      },
      message: `✅ ${checkin.user.full_name} checked in successfully!`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/checkin/qr:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
