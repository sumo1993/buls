import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get all payments with user info
    const { data: payments, error } = await adminClient
      .from('payments')
      .select(`
        id,
        user_id,
        month,
        year,
        amount,
        status,
        payment_source,
        reference_code,
        created_at,
        users:user_id (
          id,
          full_name,
          email,
          clerk_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      payments,
      currentUser: userId,
      message: 'Last 10 payments with user info'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
