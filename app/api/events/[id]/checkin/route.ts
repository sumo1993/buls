import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/events/[id]/checkin - Check in a member (manual or QR scan)
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

    // Get user performing check-in
    const { data: checkerData, error: checkerError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (checkerError || !checkerData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission
    if (!['admin', 'secretary'].includes(checkerData.role)) {
      const { data: collaborator } = await adminClient
        .from('event_collaborators')
        .select('permissions')
        .eq('event_id', eventId)
        .eq('user_id', checkerData.id)
        .maybeSingle()

      if (!collaborator || !collaborator.permissions.includes('check_in')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { user_id, check_in_method, notes, registration_id, registration_type } = body

    // For non-members, user_id will be null, so we need registration_id and registration_type
    if (!user_id && !registration_id) {
      return NextResponse.json({ error: 'user_id or registration_id is required' }, { status: 400 })
    }

    let registration: any = null
    let purchase: any = null
    let nonMemberRegistration: any = null

    // Check non-member / public registration if user_id is null
    if (!user_id && registration_id && (registration_type === 'non_member' || registration_type === 'public')) {
      console.log('Checking non-member/public registration:', registration_id, 'event:', eventId)

      let { data: nonMemberReg } = await adminClient
        .from('non_member_registrations')
        .select('*')
        .eq('id', registration_id)
        .eq('event_id', eventId)
        .maybeSingle()

      // Fall back to public_registrations (parallel public signup path)
      if (!nonMemberReg) {
        const { data: publicReg } = await adminClient
          .from('public_registrations')
          .select('*')
          .eq('id', registration_id)
          .eq('event_id', eventId)
          .maybeSingle()
        nonMemberReg = publicReg
      }

      console.log('Non-member registration check result:', nonMemberReg ? 'found' : 'not found')

      if (!nonMemberReg) {
        return NextResponse.json({ 
          error: 'Non-member registration not found' 
        }, { status: 400 })
      }

      // Treasurer must approve payment first (approved). Legacy synonym: verified.
      if (!['approved', 'verified'].includes(nonMemberReg.status)) {
        console.log('Non-member registration status not valid:', nonMemberReg.status)
        return NextResponse.json({ 
          error: nonMemberReg.status === 'payment_pending' || nonMemberReg.status === 'pending'
            ? 'Non-member payment is not verified by treasurer yet'
            : `Non-member registration status is not valid for check-in: ${nonMemberReg.status}`,
          status: nonMemberReg.status,
          unpaid: true
        }, { status: 403 })
      }

      if (nonMemberReg.status === 'refunded') {
        return NextResponse.json({
          error: 'This registration has been refunded and cannot be checked in',
          refunded: true
        }, { status: 403 })
      }

      nonMemberRegistration = nonMemberReg
    } else if (user_id) {
      // Verify user is registered or has purchased ticket (existing logic for members)
      console.log('Checking registration for user:', user_id, 'event:', eventId)
      const { data: reg } = await adminClient
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user_id)
        .eq('status', 'registered')
        .maybeSingle()

      console.log('Registration check result:', reg ? 'found' : 'not found')
      registration = reg

      const { data: pur } = await adminClient
        .from('ticket_purchases')
        .select('id, payment_status')
        .eq('event_id', eventId)
        .eq('user_id', user_id)
        .maybeSingle()

      console.log('Ticket purchase check result:', pur ? 'found' : 'not found')
      purchase = pur

      // Check if ticket is refunded
      if (purchase && purchase.payment_status === 'refunded') {
        return NextResponse.json({ 
          error: 'This ticket has been refunded and cannot be checked in',
          refunded: true
        }, { status: 403 })
      }

      // Only allow paid tickets
      const paidPurchase = purchase?.payment_status === 'paid' ? purchase : null

      if (!registration && !paidPurchase) {
        console.log('❌ ERROR: User not registered and no paid ticket')
        return NextResponse.json({ 
          error: 'User is not registered for this event' 
        }, { status: 400 })
      }
    }

    // Check if already checked in (for both members and non-members)
    const checkinQuery = adminClient
      .from('event_checkins')
      .select('id, checked_in_at')
      .eq('event_id', eventId)

    if (user_id) {
      checkinQuery.eq('user_id', user_id)
    } else if (registration_id) {
      checkinQuery.eq('registration_id', registration_id)
    }

    const { data: existingCheckin } = await checkinQuery.maybeSingle()

    if (existingCheckin) {
      console.log('Already checked in:', existingCheckin)
      return NextResponse.json({ 
        error: 'Already checked in',
        checked_in_at: existingCheckin.checked_in_at
      }, { status: 409 })
    }

    // Create check-in record
    // Fix: Handle type mismatch between registration.id (integer) and purchase.id (UUID)
    let final_registration_id = registration_id;
    let final_registration_type = registration_type;
    let final_user_id = user_id;
    
    // Helper function to convert integer to UUID format for free registrations
    const integerToUUID = (intId: number): string => {
      // Convert integer to 12-digit padded string
      const paddedId = intId.toString().padStart(12, '0');
      // Return in UUID format: 00000000-0000-0000-0000-xxxxxxxxxxxx
      return `00000000-0000-0000-0000-${paddedId}`;
    };
    
    // Handle non-member registrations
    if (nonMemberRegistration) {
      final_registration_id = nonMemberRegistration.id;
      final_registration_type = 'non_member';
      final_user_id = null; // Non-members don't have user_id
    } 
    // If registration_id is provided, check if it needs conversion
    else if (final_registration_id) {
      // Check if it's an integer (free registration)
      const idAsNumber = Number(final_registration_id);
      if (!isNaN(idAsNumber) && Number.isInteger(idAsNumber) && final_registration_type !== 'ticket_purchase') {
        // It's an integer ID for free registration, convert to UUID format
        final_registration_id = integerToUUID(idAsNumber);
        if (!final_registration_type) {
          final_registration_type = 'registration';
        }
      }
    } else {
      // No registration_id provided, determine from registration/purchase
      if (registration?.id) {
        // For free registrations, convert integer to UUID format
        final_registration_id = integerToUUID(registration.id);
        final_registration_type = 'registration';
      } else if (purchase?.id) {
        final_registration_id = purchase.id;
        final_registration_type = 'ticket_purchase';
      }
    }
    
    console.log('Checkin data:', {
      event_id: parseInt(eventId),
      user_id: final_user_id,
      registration_id: final_registration_id,
      registration_type: final_registration_type,
      checked_in_by: checkerData.id,
      is_non_member: !!nonMemberRegistration,
      registration_original_id: registration?.id,
      purchase_original_id: purchase?.id,
      non_member_registration_id: nonMemberRegistration?.id
    });
    
    const { data: checkin, error: insertError } = await adminClient
      .from('event_checkins')
      .insert({
        event_id: parseInt(eventId),
        user_id: final_user_id, // null for non-members
        registration_id: final_registration_id,
        registration_type: final_registration_type || 'registration',
        checked_in_by: checkerData.id,
        check_in_method: check_in_method || 'manual',
        notes: notes || null
      })
      .select(`
        *,
        user:users!event_checkins_user_id_fkey(full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating check-in:', insertError)
      return NextResponse.json({ error: 'Failed to check in: ' + insertError.message }, { status: 500 })
    }

    // Get display name (for non-members, use registration data)
    let displayName = checkin.user?.full_name;
    if (!displayName && nonMemberRegistration) {
      displayName = nonMemberRegistration.full_name;
    }

    return NextResponse.json({ 
      checkin,
      message: `${displayName || 'Attendee'} checked in successfully!`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/events/[id]/checkin - Remove check-in (undo)
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
    const { id: eventId } = await params

    const { searchParams } = new URL(req.url)
    const checkinUserId = searchParams.get('user_id')
    const registrationId = searchParams.get('registration_id')
    const registrationType = searchParams.get('registration_type')

    if (!checkinUserId && !registrationId) {
      return NextResponse.json({ error: 'user_id or registration_id parameter required' }, { status: 400 })
    }

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

    // Delete check-in based on identifier
    const deleteQuery = adminClient
      .from('event_checkins')
      .delete()
      .eq('event_id', eventId)

    if (checkinUserId) {
      deleteQuery.eq('user_id', checkinUserId)
    } else if (registrationId && registrationType) {
      deleteQuery.eq('registration_id', registrationId).eq('registration_type', registrationType)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error removing check-in:', deleteError)
      return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Check-in removed successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/events/[id]/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
