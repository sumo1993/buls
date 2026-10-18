import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get loan ID from params
    const params = await context.params
    const loanId = params.id

    // Create admin Supabase client (same as Finance API)
    const supabase = createAdminClient()

    // First, get the loan with user details (specify the relationship)
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        user_id,
        users!loans_user_id_fkey (
          id,
          email,
          full_name,
          clerk_id
        )
      `)
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError)
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    console.log('📋 Fetching payments for loan applicant:', {
      loan_id: loanId,
      loan_user_id: loan.user_id,
      user_email: (loan.users as any)?.email,
      user_name: (loan.users as any)?.full_name
    })

    // Get year from query params, default to current year
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear()
    const currentYear = new Date().getFullYear()

    // Use the SAME query as Finance API - fetch ALL payments first
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (allPaymentsError) {
      console.error('Error fetching all payments:', allPaymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    console.log('📊 ALL PAYMENTS FETCHED:', {
      total_count: allPayments?.length || 0
    })

    // Find payments for this specific user by matching email
    const userEmail = (loan.users as any)?.email
    const userPayments = allPayments?.filter((payment: any) => 
      payment.users?.email === userEmail && 
      payment.year === selectedYear &&
      ['approved', 'collected'].includes(payment.status)
    ) || []

    console.log('✅ FILTERED PAYMENTS FOR USER:', {
      user_email: userEmail,
      selected_year: selectedYear,
      payments_count: userPayments.length,
      months: userPayments.map((p: any) => p.month)
    })

    return NextResponse.json({
      payments: userPayments,
      selectedYear,
      currentYear,
      currentMonth: new Date().getMonth() + 1,
      userEmail: userEmail
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
