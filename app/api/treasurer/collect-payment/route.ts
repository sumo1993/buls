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
      .select('id, role, full_name')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const { paymentId, collectionMethod, collectionNotes } = body

    // Get the payment first to check its source
    const { data: payment, error: fetchError } = await adminClient
      .from('payments')
      .select('payment_source, payment_method')
      .eq('id', paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // For digital payments (student uploads), don't override the payment method
    // For cash payments, use the collection method provided by treasurer
    const updateData: any = {
      status: 'collected',
      collected_by: userData.id,
      collected_at: new Date().toISOString()
    }

    if (payment.payment_source === 'cash') {
      // For cash payments, store how treasurer collected it
      updateData.collection_method = collectionMethod || 'in_person'
      updateData.collection_notes = collectionNotes || null
    } else {
      // For digital payments, just mark as verified - keep original payment method
      updateData.collection_method = 'verified' // Mark that treasurer verified it
      updateData.collection_notes = collectionNotes || 'Verified by treasurer'
    }

    // Update payment to collected status
    const { error: updateError } = await adminClient
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error marking payment as collected:', updateError)
      return NextResponse.json({ error: 'Failed to collect payment' }, { status: 500 })
    }

    console.log('✅ Payment', paymentId, 'marked as collected by', userData.full_name)

    return NextResponse.json({ success: true, message: 'Payment marked as collected' })
  } catch (error: any) {
    console.error('Error in collect payment API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
