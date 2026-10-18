import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Get all payments for Finance Panel (uses admin client to bypass RLS)
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user from Supabase by clerk_id
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role, full_name')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      console.error('❌ User lookup error:', userError)
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Check if user is finance or admin
    if (!['admin', 'finance'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied. Finance panel requires finance or admin role.' }, { status: 403 })
    }

    console.log('✅ Finance user:', { id: userData.id, role: userData.role, name: userData.full_name })

    // Fetch payments with collected, approved, or rejected status
    // Use admin client to bypass RLS
    const { data: payments, error: paymentsError } = await adminClient
      .from('payments')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email
        ),
        collector:collected_by (
          id,
          full_name,
          email
        )
      `)
      .in('status', ['collected', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments: ' + paymentsError.message }, { status: 500 })
    }

    console.log('✅ Finance API: Fetched payments:', {
      total: payments?.length || 0,
      collected: payments?.filter(p => p.status === 'collected').length || 0,
      approved: payments?.filter(p => p.status === 'approved').length || 0,
      rejected: payments?.filter(p => p.status === 'rejected').length || 0
    })

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error('💥 Error in GET /api/finance/payments:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
