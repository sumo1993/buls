import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** GET heavy fields (QR / proof) for one purchase — kept off list endpoints for speed */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: purchaseId } = await params

    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData || !['admin', 'treasurer', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: purchase, error } = await adminClient
      .from('ticket_purchases')
      .select('id, qr_code_url, payment_proof_url, payment_status, ticket_number')
      .eq('id', purchaseId)
      .maybeSingle()

    if (error || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    return NextResponse.json({ purchase })
  } catch (error: any) {
    console.error('Error in GET /api/tickets/purchase/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE a ticket purchase (only refunded tickets)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: purchaseId } = await params

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

    // Get purchase details
    const { data: purchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Only allow deletion of refunded tickets
    if (purchase.payment_status !== 'refunded') {
      return NextResponse.json({ 
        error: 'Only refunded tickets can be deleted' 
      }, { status: 400 })
    }

    // Delete the purchase
    const { error: deleteError } = await adminClient
      .from('ticket_purchases')
      .delete()
      .eq('id', purchaseId)

    if (deleteError) {
      console.error('Error deleting purchase:', deleteError)
      return NextResponse.json({ error: 'Failed to delete purchase' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Refunded ticket deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/tickets/purchase/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
