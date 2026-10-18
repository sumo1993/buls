import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify user is finance or admin
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role, full_name')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'finance'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const { paymentId, rejectionReason } = body

    if (!paymentId || !rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Payment ID and rejection reason required' }, { status: 400 })
    }

    // Get payment details first
    const { data: payment, error: fetchError } = await adminClient
      .from('payments')
      .select('*, users:user_id(full_name, email)')
      .eq('id', paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if already processed
    if (payment.status === 'rejected') {
      return NextResponse.json({ 
        error: 'Payment already rejected'
      }, { status: 400 })
    }

    // Update payment to rejected status
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'rejected',
        reviewed_by: userData.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error rejecting payment:', updateError)
      return NextResponse.json({ error: 'Failed to reject payment' }, { status: 500 })
    }

    console.log(`❌ Payment ${paymentId} rejected by Finance (${userData.full_name})`)

    return NextResponse.json({ 
      success: true, 
      message: 'Payment rejected successfully',
      student_name: payment.users?.full_name,
      amount: payment.amount,
      month: payment.month,
      year: payment.year
    })
  } catch (error: any) {
    console.error('Error in reject payment API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
