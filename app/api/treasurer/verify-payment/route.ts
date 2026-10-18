import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST: Verify or reject a member-submitted payment
// Updated with detailed logging for debugging
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log('🔍 VERIFY PAYMENT API CALLED with body:', body)
    
    const {
      repaymentId,
      action, // 'verify' or 'reject'
      treasurerId,
      rejectionReason,
      notes
    } = body

    console.log('📋 Parsed parameters:', { repaymentId, action, treasurerId })

    // Validate required fields
    if (!repaymentId || !action || !treasurerId) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: repaymentId, action, treasurerId' },
        { status: 400 }
      )
    }

    if (!['verify', 'reject'].includes(action)) {
      console.log('❌ Invalid action:', action)
      return NextResponse.json(
        { error: 'Action must be either "verify" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejectionReason) {
      console.log('❌ Missing rejection reason')
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a payment' },
        { status: 400 }
      )
    }

    // Get the repayment record
    console.log('🔍 Querying loan_repayments for ID:', repaymentId)
    
    const { data: repayment, error: repaymentError } = await supabase
      .from('loan_repayments')
      .select('*, loans(id, user_id, remaining_balance, total_repaid, users!loans_user_id_fkey(full_name, email))')
      .eq('id', repaymentId)
      .single()

    console.log('📊 Query result:', { 
      found: !!repayment, 
      error: repaymentError?.message,
      repayment_id: repayment?.id,
      verification_status: repayment?.verification_status
    })

    if (repaymentError || !repayment) {
      console.log('❌ Repayment record not found. Error:', repaymentError)
      return NextResponse.json(
        { error: 'Repayment record not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (repayment.verification_status === 'verified') {
      return NextResponse.json(
        { error: 'Payment has already been verified' },
        { status: 400 }
      )
    }

    if (action === 'verify') {
      // Update repayment verification status
      const { data: updated, error: updateError } = await supabase
        .from('loan_repayments')
        .update({
          verification_status: 'verified',
          verified_by: treasurerId,
          verified_at: new Date().toISOString()
        })
        .eq('id', repaymentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error verifying payment:', updateError)
        return NextResponse.json(
          { error: 'Failed to verify payment: ' + updateError.message },
          { status: 500 }
        )
      }

      // Create verification record
      await supabase
        .from('payment_verifications')
        .insert({
          repayment_id: repaymentId,
          verified_by: treasurerId,
          verified_at: new Date().toISOString(),
          verification_status: 'verified',
          notes: notes || 'Payment verified by treasurer'
        })

      return NextResponse.json({
        message: 'Payment verified successfully',
        repayment: updated
      })

    } else {
      // Reject payment
      const { data: updated, error: updateError } = await supabase
        .from('loan_repayments')
        .update({
          verification_status: 'rejected',
          verified_by: treasurerId,
          verified_at: new Date().toISOString()
        })
        .eq('id', repaymentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error rejecting payment:', updateError)
        return NextResponse.json(
          { error: 'Failed to reject payment: ' + updateError.message },
          { status: 500 }
        )
      }

      // Create verification record
      await supabase
        .from('payment_verifications')
        .insert({
          repayment_id: repaymentId,
          verified_by: treasurerId,
          verified_at: new Date().toISOString(),
          verification_status: 'rejected',
          rejection_reason: rejectionReason,
          notes: notes || 'Payment rejected by treasurer'
        })

      // If rejected, we should reverse the payment from the loan balance
      // The trigger should handle this, but we can also do it manually
      const { error: reverseError } = await supabase.rpc('reverse_loan_payment', {
        p_loan_id: repayment.loans.id,
        p_payment_amount: repayment.amount
      })

      if (reverseError) {
        console.error('Error reversing payment:', reverseError)
        // Continue anyway as this is not critical
      }

      return NextResponse.json({
        message: 'Payment rejected',
        repayment: updated,
        reason: rejectionReason
      })
    }

  } catch (error: any) {
    console.error('Error processing payment verification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
