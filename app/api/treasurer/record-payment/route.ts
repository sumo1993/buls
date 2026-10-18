import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// POST: Record an offline payment for a loan (treasurer records payment on behalf of member)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const {
      loanId,
      amount,
      paymentMethod,
      paymentProofUrl,
      notes,
      treasurerId
    } = body

    // Validate required fields
    if (!loanId || !amount || !treasurerId) {
      return NextResponse.json(
        { error: 'Missing required fields: loanId, amount, treasurerId' },
        { status: 400 }
      )
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get the loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, users(id, full_name, email)')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Check if loan is disbursed
    if (loan.status !== 'disbursed') {
      return NextResponse.json(
        { error: 'Can only record payments for disbursed loans' },
        { status: 400 }
      )
    }

    // Check if amount exceeds remaining balance
    if (parseFloat(amount) > parseFloat(loan.remaining_balance)) {
      return NextResponse.json(
        { error: `Payment amount (¥${amount}) exceeds remaining balance (¥${loan.remaining_balance})` },
        { status: 400 }
      )
    }

    // Insert the repayment record
    const { data: repayment, error: repaymentError } = await supabase
      .from('loan_repayments')
      .insert({
        loan_id: loanId,
        amount: parseFloat(amount),
        payment_method: paymentMethod || 'cash',
        payment_type: 'treasurer_recorded', // Mark as treasurer-recorded
        payment_proof_url: paymentProofUrl || null,
        notes: notes || `Recorded by treasurer on ${new Date().toLocaleDateString()}`,
        verification_status: 'verified', // Treasurer payments are pre-verified
        verified_by: treasurerId,
        verified_at: new Date().toISOString()
      })
      .select()
      .single()

    if (repaymentError) {
      console.error('Error inserting repayment:', repaymentError)
      return NextResponse.json(
        { error: 'Failed to record payment: ' + repaymentError.message },
        { status: 500 }
      )
    }

    // The database trigger will automatically update loan balances
    // Fetch updated loan to return current status
    const { data: updatedLoan } = await supabase
      .from('loans')
      .select('remaining_balance, total_repaid, repayment_status')
      .eq('id', loanId)
      .single()

    return NextResponse.json({
      message: 'Payment recorded successfully',
      repayment,
      updatedLoan: updatedLoan || {
        remaining_balance: loan.remaining_balance - parseFloat(amount),
        total_repaid: loan.total_repaid + parseFloat(amount)
      }
    })

  } catch (error: any) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
