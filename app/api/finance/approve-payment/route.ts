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
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 })
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

    // Check if already approved
    if (payment.status === 'approved') {
      return NextResponse.json({ 
        error: 'Payment already approved',
        receipt_number: payment.receipt_number 
      }, { status: 400 })
    }

    // Generate receipt number
    const receiptNumber = `REC-${payment.year}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`

    // Update payment to approved status
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'approved',
        reviewed_by: userData.id,
        reviewed_at: new Date().toISOString(),
        receipt_number: receiptNumber,
        recorded_by: userData.id,
        recorded_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error approving payment:', updateError)
      return NextResponse.json({ error: 'Failed to approve payment' }, { status: 500 })
    }

    console.log(`✅ Payment ${paymentId} approved by Finance (${userData.full_name}). Receipt: ${receiptNumber}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Payment approved successfully',
      receipt_number: receiptNumber,
      student_name: payment.users?.full_name,
      amount: payment.amount,
      month: payment.month,
      year: payment.year
    })
  } catch (error: any) {
    console.error('Error in approve payment API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
