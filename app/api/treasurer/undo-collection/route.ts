import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify user is treasurer or admin
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const { paymentId } = body

    // Move payment back to pending
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'pending',
        collected_by: null,
        collected_at: null,
        collection_method: null,
        collection_notes: null
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error undoing collection:', updateError)
      return NextResponse.json({ error: 'Failed to undo collection' }, { status: 500 })
    }

    console.log('✅ Payment', paymentId, 'moved back to pending')

    return NextResponse.json({ success: true, message: 'Payment moved back to pending' })
  } catch (error: any) {
    console.error('Error in undo collection API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
