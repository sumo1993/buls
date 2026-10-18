import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Secretary/admin marks T-shirt as collected (handed out) at the event.
 *
 * POST {
 *   source: 'ticket_purchase' | 'registration',
 *   id: purchase_id or registration_id,
 *   picked_up: boolean  // true = collected, false = undo
 * }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: staff, error: staffError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (staffError || !staff) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary', 'treasurer'].includes(staff.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { source, id, picked_up = true } = body

    if (!id || !['ticket_purchase', 'registration'].includes(source)) {
      return NextResponse.json(
        { error: 'source (ticket_purchase|registration) and id required' },
        { status: 400 }
      )
    }

    const table = source === 'ticket_purchase' ? 'ticket_purchases' : 'event_registrations'
    const { data: row, error: findError } = await adminClient
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError || !row) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (!row.tshirt_wanted) {
      return NextResponse.json({ error: 'No T-shirt on this record' }, { status: 400 })
    }

    // Paid shirts must be approved before handover (free/waived OK)
    if (
      picked_up &&
      row.tshirt_payment_status === 'pending'
    ) {
      return NextResponse.json(
        { error: 'T-shirt payment is still pending — treasurer must approve first' },
        { status: 400 }
      )
    }

    if (picked_up && row.tshirt_payment_status === 'refunded') {
      return NextResponse.json({ error: 'T-shirt payment was refunded' }, { status: 400 })
    }

    const updateData = picked_up
      ? {
          tshirt_picked_up: true,
          tshirt_picked_up_at: new Date().toISOString(),
          tshirt_picked_up_by: staff.id,
        }
      : {
          tshirt_picked_up: false,
          tshirt_picked_up_at: null,
          tshirt_picked_up_by: null,
        }

    const { data: updated, error: updateError } = await adminClient
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('T-shirt pickup update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({
      record: updated,
      message: picked_up
        ? `T-shirt (${row.tshirt_size || '?'}) marked collected`
        : 'T-shirt collection undone',
    })
  } catch (error: any) {
    console.error('POST /api/tshirts/pickup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
