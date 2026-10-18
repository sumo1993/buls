import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch comprehensive loan statistics for secretary dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Use the database function to get statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_loan_statistics')

    if (statsError) {
      console.error('Error fetching loan statistics:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch loan statistics: ' + statsError.message },
        { status: 500 }
      )
    }

    // Get additional data for secretary view
    const { data: recentLoans, error: recentError } = await supabase
      .from('loans')
      .select('id, amount, status, created_at, users(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      statistics: stats?.[0] || {
        total_applications: 0,
        pending_secretary: 0,
        pending_finance: 0,
        approved_loans: 0,
        disbursed_loans: 0,
        repaid_loans: 0,
        overdue_loans: 0,
        rejected_loans: 0,
        total_amount_disbursed: 0,
        total_amount_repaid: 0,
        total_outstanding: 0,
        average_loan_amount: 0
      },
      recentLoans: recentLoans || []
    })

  } catch (error: any) {
    console.error('Error in loan-statistics endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
