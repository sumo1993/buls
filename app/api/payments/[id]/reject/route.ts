import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (finance or admin)
    if (user.role !== 'finance' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if already processed
    if (payment.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Payment has already been processed' 
      }, { status: 400 })
    }

    // Reject payment
    const { data: updatedPayment, error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting payment:', updateError)
      return NextResponse.json({ error: 'Failed to reject payment' }, { status: 500 })
    }

    // Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        action_type: 'payment_rejected',
        performed_by: user.id,
        target_id: id,
        details: {
          month: payment.month,
          year: payment.year,
          amount: payment.amount,
          reason
        }
      })

    return NextResponse.json({ payment: updatedPayment })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
