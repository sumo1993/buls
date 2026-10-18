import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Get loan statistics for treasurer dashboard
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch all loans with statistics
    const { data: loans, error: loansError } = await adminClient
      .from('loans')
      .select('id, status, amount, created_at')

    if (loansError) {
      console.error('❌ Error fetching loans for statistics:', loansError)
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
    }

    // Calculate statistics
    // Loan workflow: pending → secretary_approved → finance_approved → disbursed → repaid
    const totalApplications = loans?.length || 0
    const pendingSecretary = loans?.filter((l: any) => l.status === 'pending').length || 0
    const pendingFinance = loans?.filter((l: any) => l.status === 'secretary_approved').length || 0
    const pendingTreasurer = loans?.filter((l: any) => l.status === 'finance_approved').length || 0
    const disbursed = loans?.filter((l: any) => l.status === 'disbursed').length || 0
    const repaid = loans?.filter((l: any) => l.status === 'repaid').length || 0
    
    // Calculate amounts
    const totalAmountDisbursed = loans
      ?.filter((l: any) => l.status === 'disbursed')
      .reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) || 0
    
    const totalAmountRepaid = loans
      ?.filter((l: any) => l.status === 'repaid')
      .reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) || 0
    
    const averageLoanAmount = totalApplications > 0 
      ? totalAmountDisbursed / totalApplications 
      : 0
    
    // Calculate total outstanding and overdue
    let totalOutstanding = 0
    let activeLoans = 0
    let overdueLoans = 0
    let totalOverdueAmount = 0
    
    const currentDate = new Date()
    
    const { data: loanDetails, error: loanDetailsError } = await adminClient
      .from('loans')
      .select('id, remaining_balance, total_amount_with_interest, total_repaid, disbursed_at, status')

    if (!loanDetailsError && loanDetails) {
      loanDetails.forEach((loan: any) => {
        if (loan.status === 'disbursed' || loan.status === 'repaid') {
          activeLoans++
          const remaining = parseFloat(loan.remaining_balance || '0')
          totalOutstanding += remaining
          
          // Calculate if loan is overdue based on disbursement date
          if (loan.disbursed_at && remaining > 0) {
            const disbursedDate = new Date(loan.disbursed_at)
            const daysSinceDisbursement = Math.floor((currentDate.getTime() - disbursedDate.getTime()) / (1000 * 60 * 60 * 24))
            
            // Assume 12-month repayment period (365 days)
            // If more than 30 days past expected repayment, mark as overdue
            const expectedRepaymentDays = 365
            if (daysSinceDisbursement > expectedRepaymentDays) {
              overdueLoans++
              totalOverdueAmount += remaining
            }
          }
        }
      })
    }

    // Calculate collection rate
    const collectionRate = totalAmountDisbursed > 0
      ? ((totalAmountRepaid / totalAmountDisbursed) * 100).toFixed(1)
      : '0.0'

    const statistics = {
      total_applications: totalApplications,
      pending_secretary: pendingSecretary,
      pending_finance: pendingFinance,
      pending_treasurer: pendingTreasurer,  // This is what treasurer needs to disburse
      approved_loans: pendingTreasurer + disbursed + repaid,  // Fully approved
      disbursed_loans: disbursed,
      repaid_loans: repaid,
      overdue_loans: overdueLoans,
      total_overdue_amount: totalOverdueAmount.toFixed(2),
      total_amount_disbursed: totalAmountDisbursed.toFixed(2),
      total_amount_repaid: totalAmountRepaid.toFixed(2),
      total_outstanding: totalOutstanding.toFixed(2),
      average_loan_amount: averageLoanAmount.toFixed(2),
      active_loans: activeLoans,
      collection_rate: collectionRate
    }

    console.log('📊 Loan Statistics:', statistics)

    return NextResponse.json({ statistics })
  } catch (error) {
    console.error('Error fetching loan statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}