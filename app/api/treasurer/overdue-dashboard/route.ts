import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch overdue loans dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Fetch overdue loans directly with proper query
    const { data: overdueLoans, error: overdueError } = await supabase
      .from('loans')
      .select(`
        id,
        user_id,
        amount,
        remaining_balance,
        final_repayment_date,
        last_payment_date,
        status,
        is_overdue,
        users!loans_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'disbursed')
      .eq('is_overdue', true)
      .gt('remaining_balance', 0)
      .order('final_repayment_date', { ascending: true })

    if (overdueError) {
      console.error('Error fetching overdue loans:', overdueError)
      return NextResponse.json(
        { error: 'Failed to fetch overdue loans: ' + overdueError.message },
        { status: 500 }
      )
    }

    // Calculate days overdue and enrich data
    const enrichedLoans = (overdueLoans || []).map(loan => {
      const daysOverdue = loan.final_repayment_date 
        ? Math.floor((new Date().getTime() - new Date(loan.final_repayment_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        loan_id: loan.id,
        user_id: loan.user_id,
        member_name: loan.users.full_name,
        member_email: loan.users.email,
        member_phone: 'N/A', // Phone removed as it's not in users table
        loan_amount: loan.amount,
        remaining_balance: loan.remaining_balance,
        final_repayment_date: loan.final_repayment_date,
        days_overdue: daysOverdue,
        last_payment_date: loan.last_payment_date,
        severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'warning' : 'recent'
      }
    })

    // Calculate summary statistics
    const summary = {
      totalOverdue: enrichedLoans.length,
      totalOverdueAmount: enrichedLoans.reduce((sum, loan) => sum + parseFloat(loan.remaining_balance || '0'), 0),
      criticalOverdue: enrichedLoans.filter(l => l.days_overdue > 60).length,
      warningOverdue: enrichedLoans.filter(l => l.days_overdue > 30 && l.days_overdue <= 60).length,
      recentOverdue: enrichedLoans.filter(l => l.days_overdue <= 30).length
    }

    return NextResponse.json({
      overdueLoans: enrichedLoans,
      summary
    })

  } catch (error: any) {
    console.error('Error in overdue-dashboard endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
