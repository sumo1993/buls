import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch all loans with repayment tracking data for finance oversight
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const statusFilter = searchParams.get('status') // disbursed, repaid, overdue
    const sortBy = searchParams.get('sortBy') || 'remaining_balance' // remaining_balance, days_overdue, created_at
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build query for loans with repayment data
    let query = supabase
      .from('loans')
      .select(`
        id,
        amount,
        interest_rate,
        total_amount_with_interest,
        total_repaid,
        remaining_balance,
        monthly_installment,
        repayment_period_months,
        first_repayment_date,
        final_repayment_date,
        status,
        repayment_status,
        is_overdue,
        last_payment_date,
        disbursed_at,
        created_at,
        users!loans_user_id_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })

    // Filter by status
    if (statusFilter === 'disbursed') {
      query = query.eq('status', 'disbursed')
    } else if (statusFilter === 'repaid') {
      query = query.eq('status', 'repaid')
    } else if (statusFilter === 'overdue') {
      query = query.eq('is_overdue', true)
    } else {
      // Default: show all disbursed and repaid loans
      query = query.in('status', ['disbursed', 'repaid'])
    }

    // Sort
    if (sortBy === 'days_overdue') {
      query = query.order('is_overdue', { ascending: false })
      query = query.order('final_repayment_date', { ascending: true })
    } else {
      query = query.order(sortBy as any, { ascending: sortOrder === 'asc' })
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: loans, error, count } = await query

    if (error) {
      console.error('Error fetching repayment tracking data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch repayment data: ' + error.message },
        { status: 500 }
      )
    }

    // Calculate repayment statistics
    const { data: allLoans } = await supabase
      .from('loans')
      .select('total_repaid, remaining_balance, total_amount_with_interest, is_overdue, status')
      .in('status', ['disbursed', 'repaid'])

    const summary = {
      totalLoans: allLoans?.length || 0,
      totalDisbursed: allLoans?.reduce((sum, l) => sum + parseFloat(l.total_amount_with_interest || '0'), 0) || 0,
      totalRepaid: allLoans?.reduce((sum, l) => sum + parseFloat(l.total_repaid || '0'), 0) || 0,
      totalOutstanding: allLoans?.reduce((sum, l) => sum + parseFloat(l.remaining_balance || '0'), 0) || 0,
      overdueCount: allLoans?.filter(l => l.is_overdue).length || 0,
      completedCount: allLoans?.filter(l => l.status === 'repaid').length || 0
    }

    // Enrich loans with calculated fields
    const enrichedLoans = (loans || []).map(loan => {
      const daysOverdue = loan.is_overdue && loan.final_repayment_date
        ? Math.floor((new Date().getTime() - new Date(loan.final_repayment_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const repaymentPercentage = loan.total_amount_with_interest > 0
        ? Math.round((loan.total_repaid / loan.total_amount_with_interest) * 100)
        : 0

      const daysSinceLastPayment = loan.last_payment_date
        ? Math.floor((new Date().getTime() - new Date(loan.last_payment_date).getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        ...loan,
        daysOverdue,
        repaymentPercentage,
        daysSinceLastPayment
      }
    })

    return NextResponse.json({
      loans: enrichedLoans,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      summary
    })

  } catch (error: any) {
    console.error('Error in repayment-tracking endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
