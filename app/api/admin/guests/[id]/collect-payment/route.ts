import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = typeof (params as any)?.then === 'function'
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string })
    const guestId = resolved.id
    const adminClient = createAdminClient()

    // Check user role - only treasurers, secretaries, and admins can collect payments
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { amount, payment_method, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 })
    }

    // Fetch guest details
    const { data: guest, error: guestError } = await adminClient
      .from('ticket_guests')
      .select(`
        *,
        ticket_purchases!inner(
          id,
          event_id,
          user_id,
          events:event_id(title, door_guest_price)
        )
      `)
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Check if guest has pending payment
    if (guest.payment_status !== 'pending') {
      return NextResponse.json({ 
        error: `Guest payment status is ${guest.payment_status}, not pending` 
      }, { status: 400 })
    }

    // Update guest payment status
    const { data: updatedGuest, error: updateError } = await adminClient
      .from('ticket_guests')
      .update({
        payment_status: 'paid_at_door',
        amount_paid: amount,
        payment_notes: notes || `Payment collected by ${userData.role} via ${payment_method || 'cash'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', guestId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating guest payment:', updateError)
      return NextResponse.json({ error: 'Failed to collect payment' }, { status: 500 })
    }

    // Create payment record (optional - could link to payments table)
    const eventTitle = guest.ticket_purchases.events?.title || 'Unknown Event'
    
    console.log(`Payment collected: ¥${amount} for guest ${guest.full_name} at ${eventTitle}`)

    return NextResponse.json({ 
      message: 'Payment collected successfully',
      guest: updatedGuest,
      payment_details: {
        amount,
        payment_method,
        collected_by: userData.role,
        event: eventTitle,
        guest_name: guest.full_name
      }
    })
  } catch (error: any) {
    console.error('Error collecting payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}