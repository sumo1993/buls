import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/non-members/[id]/checkin - Check in a non-member registration
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
    const { id: registrationId } = await params

    const { data: checkerData, error: checkerError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (checkerError || !checkerData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(checkerData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: registration, error: regError } = await adminClient
      .from('non_member_registrations')
      .select('id, full_name, status, checked_in')
      .eq('id', registrationId)
      .maybeSingle()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Non-member registration not found' }, { status: 404 })
    }

    if (registration.status === 'refunded') {
      return NextResponse.json({
        error: 'This registration has been refunded and cannot be checked in',
        refunded: true
      }, { status: 403 })
    }

    // Treasurer must approve first (legacy synonym: verified)
    if (registration.status !== 'approved' && registration.status !== 'verified') {
      return NextResponse.json({
        error: registration.status === 'payment_pending' || registration.status === 'pending'
          ? 'Non-member payment is not verified by treasurer yet'
          : `Cannot check in registration with status "${registration.status}". Only approved registrations can be checked in.`,
        status: registration.status,
        unpaid: true
      }, { status: 403 })
    }

    if (registration.checked_in) {
      return NextResponse.json({
        error: 'Non-member already checked in',
        checked_in: true
      }, { status: 409 })
    }

    const { data: updated, error: updateError } = await adminClient
      .from('non_member_registrations')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: checkerData.id
      })
      .eq('id', registrationId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error checking in non-member:', updateError)
      return NextResponse.json({ error: 'Failed to check in non-member' }, { status: 500 })
    }

    return NextResponse.json({
      registration: updated,
      message: `${registration.full_name} checked in successfully!`
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error in POST /api/non-members/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/non-members/[id]/checkin - Undo non-member check-in
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
    const { id: registrationId } = await params

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: updated, error: updateError } = await adminClient
      .from('non_member_registrations')
      .update({
        checked_in: false,
        checked_in_at: null,
        checked_in_by: null
      })
      .eq('id', registrationId)
      .select('full_name')
      .single()

    if (updateError) {
      console.error('Error removing non-member check-in:', updateError)
      return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Check-in removed for ${updated.full_name}`
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/non-members/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
