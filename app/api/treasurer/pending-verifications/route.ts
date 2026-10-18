import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch pending loan repayment verifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    console.log('🔍 API: Fetching pending loan repayment verifications...')
    
    const { data, error } = await supabase
      .from('loan_repayments')
      .select(`
        *,
        loans!inner(
          id,
          amount,
          remaining_balance,
          users!loans_user_id_fkey(
            id,
            full_name,
            email
          )
        )
      `)
      .eq('verification_status', 'pending')
      .eq('payment_type', 'member')
      .order('payment_date', { ascending: false })
    
    console.log('📊 API: Pending verifications result:', {
      success: !error,
      count: data?.length || 0,
      error: error?.message
    })
    
    if (error) {
      console.error('❌ API: Error fetching pending verifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending verifications' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      verifications: data || []
    })
  } catch (error) {
    console.error('❌ API: Error in pending verifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
