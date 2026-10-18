import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGuestPaymentCleared, isGuestRefunded } from '@/lib/event-attendance'

// POST /api/guests/[id]/checkin - Check in a guest
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
    const { id: guestId } = await params

    // Get user performing check-in
    const { data: checkerData, error: checkerError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (checkerError || !checkerData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(checkerData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get guest details
    const { data: guest, error: guestError } = await adminClient
      .from('ticket_guests')
      .select('id, ticket_purchase_id, full_name, payment_status, checked_in')
      .eq('id', guestId)
      .maybeSingle()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Check if guest is refunded
    if (isGuestRefunded(guest.payment_status)) {
      return NextResponse.json({ 
        error: 'This guest has been refunded and cannot be checked in',
        refunded: true
      }, { status: 403 })
    }

    // Paid events: guest must have cleared payment (treasurer/door/comp) before check-in
    if (!isGuestPaymentCleared(guest.payment_status)) {
      return NextResponse.json({
        error: 'Guest payment is not verified yet. Collect payment or mark complimentary before check-in.',
        payment_status: guest.payment_status,
        unpaid: true
      }, { status: 403 })
    }

    // Check if already checked in
    if (guest.checked_in) {
      return NextResponse.json({ 
        error: 'Guest already checked in',
        checked_in_at: guest.checked_in
      }, { status: 409 })
    }

    // Check in the guest
    const { data: updatedGuest, error: updateError } = await adminClient
      .from('ticket_guests')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: checkerData.id
      })
      .eq('id', guestId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error checking in guest:', updateError)
      return NextResponse.json({ error: 'Failed to check in guest' }, { status: 500 })
    }

    return NextResponse.json({ 
      guest: updatedGuest,
      message: `${guest.full_name} checked in successfully!`
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error in POST /api/guests/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/guests/[id]/checkin - Remove guest check-in (undo)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: guestId } = await params

    // Get user performing action
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permission
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Undo check-in
    const { data: updatedGuest, error: updateError } = await adminClient
      .from('ticket_guests')
      .update({
        checked_in: false,
        checked_in_at: null,
        checked_in_by: null
      })
      .eq('id', guestId)
      .select('full_name')
      .single()

    if (updateError) {
      console.error('Error removing guest check-in:', updateError)
      return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Check-in removed for ${updatedGuest.full_name}`
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/guests/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
