import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getDbUser(clerkId: string) {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .maybeSingle()
  return data
}

// PATCH - update payment record (mainly for adding receipt)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params for Next.js 15
    const params = await context.params
    const paymentId = params.id
    const body = await req.json()
    const { receipt_url } = body

    if (!receipt_url) {
      return NextResponse.json(
        { error: 'Receipt URL is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const userData = await getDbUser(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (treasurer, admin, or the person who recorded it)
    const { data: existing } = await adminClient
      .from('payment_records')
      .select('id, recorded_by')
      .eq('id', paymentId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    if (
      existing.recorded_by !== userData.id &&
      !['admin', 'treasurer'].includes(userData.role)
    ) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Update the payment record with receipt URL
    const { data: updated, error } = await adminClient
      .from('payment_records')
      .update({ receipt_url })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ record: updated })
  } catch (error) {
    console.error('Error updating payment record:', error)
    return NextResponse.json(
      { error: 'Failed to update payment record' },
      { status: 500 }
    )
  }
}
