import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST: Revoke a verified payment (set back to pending)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log('🔄 REVOKE VERIFICATION API CALLED with body:', body)
    
    const { repaymentId, treasurerId } = body

    console.log('📋 Parsed parameters:', { repaymentId, treasurerId })

    // Validate required fields
    if (!repaymentId || !treasurerId) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: repaymentId, treasurerId' },
        { status: 400 }
      )
    }

    // Get the repayment record
    console.log('🔍 Querying loan_repayments for ID:', repaymentId)
    
    const { data: repayment, error: repaymentError } = await supabase
      .from('loan_repayments')
      .select('*, loans!inner(id, user_id, remaining_balance, total_repaid)')
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

    // Check if actually verified
    if (repayment.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Payment is not verified, cannot revoke' },
        { status: 400 }
      )
    }

    // Update repayment verification status back to pending
    const { data: updated, error: updateError } = await supabase
      .from('loan_repayments')
      .update({
        verification_status: 'pending',
        verified_by: null,
        verified_at: null
      })
      .eq('id', repaymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error revoking verification:', updateError)
      return NextResponse.json(
        { error: 'Failed to revoke verification: ' + updateError.message },
        { status: 500 }
      )
    }

    // Update or delete the verification record
    await supabase
      .from('payment_verifications')
      .delete()
      .eq('repayment_id', repaymentId)

    console.log('✅ Verification revoked successfully')

    return NextResponse.json({
      message: 'Verification revoked successfully',
      repayment: updated
    })

  } catch (error: any) {
    console.error('Error revoking verification:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
