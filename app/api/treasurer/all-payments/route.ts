import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch all loan repayments across all loans (comprehensive payment ledger)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const verificationStatus = searchParams.get('verificationStatus') // pending, verified, rejected
    const paymentMethod = searchParams.get('paymentMethod')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const memberSearch = searchParams.get('memberSearch')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('loan_repayments')
      .select(`
        *,
        loans!inner(
          id,
          amount,
          remaining_balance,
          total_repaid,
          user_id,
          users!inner(
            id,
            full_name,
            email
          )
        ),
        verified_by_user:users!loan_repayments_verified_by_fkey(
          id,
          full_name
        )
      `, { count: 'exact' })

    // Apply filters
    if (verificationStatus) {
      query = query.eq('verification_status', verificationStatus)
    }

    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod)
    }

    if (startDate) {
      query = query.gte('payment_date', startDate)
    }

    if (endDate) {
      query = query.lte('payment_date', endDate)
    }

    if (memberSearch) {
      // Search in member name or email
      query = query.or(
        `loans.users.full_name.ilike.%${memberSearch}%,loans.users.email.ilike.%${memberSearch}%`
      )
    }

    // Order by payment date (newest first)
    query = query.order('payment_date', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: payments, error, count } = await query

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payments: ' + error.message },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const { data: stats } = await supabase
      .from('loan_repayments')
      .select('amount, verification_status, payment_method')

    const summary = {
      totalPayments: stats?.length || 0,
      totalAmount: stats?.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0,
      verifiedPayments: stats?.filter(p => p.verification_status === 'verified').length || 0,
      pendingPayments: stats?.filter(p => p.verification_status === 'pending').length || 0,
      rejectedPayments: stats?.filter(p => p.verification_status === 'rejected').length || 0,
      byPaymentMethod: {
        cash: stats?.filter(p => p.payment_method === 'cash').length || 0,
        bank: stats?.filter(p => p.payment_method === 'bank_transfer').length || 0,
        mobile: stats?.filter(p => ['wechat', 'alipay', 'mobile_money'].includes(p.payment_method)).length || 0
      }
    }

    return NextResponse.json({
      payments: payments || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      summary
    })

  } catch (error: any) {
    console.error('Error in all-payments endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
