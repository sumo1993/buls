import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'treasurer', 'finance'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Cap payload — full history is available via all-payments / filters
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
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error('Error in treasurer payments API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
