import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST refund ticket purchase
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { purchase_id, refund_reason } = body

    if (!purchase_id || !refund_reason) {
      return NextResponse.json({ error: 'Purchase ID and refund reason required' }, { status: 400 })
    }

    // Get purchase details
    const { data: purchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('*')
      .eq('id', purchase_id)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Only paid tickets can be refunded' 
      }, { status: 400 })
    }

    // Update purchase to refunded status
    const { data: updatedPurchase, error: updateError } = await adminClient
      .from('ticket_purchases')
      .update({
        payment_status: 'refunded',
        rejection_reason: refund_reason, // Store refund reason
        refunded_by: userData.id,
        refunded_at: new Date().toISOString()
      })
      .eq('id', purchase_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error refunding purchase:', updateError)
      return NextResponse.json({ error: 'Failed to refund purchase' }, { status: 500 })
    }

    return NextResponse.json({ 
      purchase: updatedPurchase,
      message: 'Ticket refunded successfully'
    })
  } catch (error: any) {
    console.error('Error in POST /api/tickets/refund:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
