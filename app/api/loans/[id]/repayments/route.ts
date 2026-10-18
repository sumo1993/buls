import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Fixed: Specify exact foreign key relationships to avoid ambiguity
// GET - Fetch repayment history for a loan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id: loanId } = await params

    console.log('📜 GET /api/loans/[id]/repayments - Fetching history for loan:', loanId)

    // Get repayment history
    const { data: repayments, error } = await supabase
      .from('loan_repayments')
      .select(`
        *,
        recorded_by_user:users!loan_repayments_recorded_by_fkey(full_name, email)
      `)
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching repayments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch repayments' },
        { status: 500 }
      )
    }

    // Get loan details - specify which users relationship to use
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, users!loans_user_id_fkey(full_name, email)')
      .eq('id', loanId)
      .single()

    if (loanError) {
      console.error('❌ Error fetching loan:', loanError)
      return NextResponse.json(
        { error: 'Failed to fetch loan details' },
        { status: 500 }
      )
    }

    console.log('✅ Payment history fetched successfully:', repayments?.length || 0, 'payments')
    
    // Debug: Log the repayments data to verify recorded_by_user is included
    console.log('🔍 Repayments data:', JSON.stringify(repayments, null, 2))

    return NextResponse.json({
      success: true,
      loan,
      repayments,
      summary: {
        totalRepaid: loan.total_repaid || 0,
        remainingBalance: loan.remaining_balance || 0,
        paymentCount: repayments.length,
        lastPaymentDate: loan.last_payment_date
      }
    })
  } catch (error) {
    console.error('❌ Error in GET repayments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Record a new repayment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('💳💳💳 REPAYMENT POST HANDLER CALLED 💳💳💳')
  
  try {
    const supabase = createAdminClient()
    
    // Await params first
    const resolvedParams = await params
    const loanId = resolvedParams.id
    
    console.log('💳 Loan ID from params:', loanId)
    
    const body = await request.json()

    console.log('💳 POST /api/loans/[id]/repayments - Received:', {
      loanId,
      amount: body.amount,
      payment_method: body.payment_method,
      user_id: body.user_id,
      has_proof: !!body.payment_proof_url,
      proof_length: body.payment_proof_url?.length || 0
    })

    const {
      amount,
      payment_method,
      payment_proof_url,
      payment_date,
      notes,
      payment_type = 'member',  // Default to 'member' to match treasurer filter
      user_id,
      recorded_by,  // Who actually recorded the payment (can be different from loan owner)
      verification_status,  // ONLY set if treasurer_recorded, otherwise default to pending
      verified_by  // Treasurer ID if pre-verified
    } = body
    
    // Determine verification status based on payment type
    // Member payments are ALWAYS pending and need treasurer verification
    // Treasurer-recorded payments are pre-verified
    const finalVerificationStatus = payment_type === 'treasurer_recorded' ? 'verified' : 'pending'
    const finalVerifiedBy = payment_type === 'treasurer_recorded' ? verified_by : null
    const finalVerifiedAt = payment_type === 'treasurer_recorded' ? new Date().toISOString() : null

    // Validate required fields
    if (!amount || !payment_method) {
      console.log('❌ Validation failed: Missing amount or payment_method')
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      )
    }

    // Validate user_id is provided for member payments
    if (!user_id) {
      console.log('❌ Validation failed: Missing user_id')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get loan details to validate
    console.log('🔍 Fetching loan:', loanId)
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .maybeSingle()

    console.log('📊 Loan query result:', { 
      found: !!loan, 
      error: loanError?.message,
      errorCode: loanError?.code,
      loan_user_id: loan?.user_id,
      requesting_user_id: user_id,
      loan_status: loan?.status,
      repayment_status: loan?.repayment_status
    })

    if (loanError) {
      console.log('❌ Loan query error:', loanError)
      return NextResponse.json(
        { error: 'Database error', details: loanError?.message },
        { status: 500 }
      )
    }
    
    if (!loan) {
      console.log('❌ Loan not found with ID:', loanId)
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Verify that the user owns this loan (for member payments)
    if (payment_type === 'member' && loan.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only make payments on your own loans' },
        { status: 403 }
      )
    }

    // Check if loan is disbursed
    if (loan.status !== 'disbursed') {
      return NextResponse.json(
        { error: 'Loan must be disbursed before payments can be recorded' },
        { status: 400 }
      )
    }

    // Check if already fully repaid
    if (loan.repayment_status === 'completed') {
      return NextResponse.json(
        { error: 'Loan is already fully repaid' },
        { status: 400 }
      )
    }

    // Check if payment amount exceeds remaining balance
    if (parseFloat(amount) > loan.remaining_balance) {
      return NextResponse.json(
        { 
          error: 'Payment amount exceeds remaining balance',
          remainingBalance: loan.remaining_balance
        },
        { status: 400 }
      )
    }

    // Insert repayment record
    const { data: repayment, error: insertError } = await supabase
      .from('loan_repayments')
      .insert({
        loan_id: loanId,
        amount: parseFloat(amount),
        payment_method,
        payment_proof_url,
        payment_date: payment_date || new Date().toISOString(),
        recorded_by: recorded_by || user_id,  // Use recorded_by if provided, otherwise use user_id
        payment_type,
        notes,
        verification_status: finalVerificationStatus,  // pending for member, verified for treasurer_recorded
        verified_by: finalVerifiedBy,  // Only set if treasurer_recorded
        verified_at: finalVerifiedAt  // Only set if treasurer_recorded
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting repayment:', insertError)
      return NextResponse.json(
        { error: 'Failed to record repayment' },
        { status: 500 }
      )
    }

    console.log('✅ Repayment recorded successfully:', repayment.id)

    // Fetch updated loan details - don't join users to avoid ambiguity
    const { data: updatedLoan } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single()

    console.log('📊 Updated loan balance:', {
      totalRepaid: updatedLoan?.total_repaid || 0,
      remainingBalance: updatedLoan?.remaining_balance || 0,
      repaymentStatus: updatedLoan?.repayment_status
    })

    return NextResponse.json({
      success: true,
      message: 'Repayment recorded successfully',
      repayment,
      updatedLoan,
      summary: {
        totalRepaid: updatedLoan?.total_repaid || 0,
        remainingBalance: updatedLoan?.remaining_balance || 0,
        repaymentStatus: updatedLoan?.repayment_status
      }
    })
  } catch (error) {
    console.error('❌ Error in POST repayment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
