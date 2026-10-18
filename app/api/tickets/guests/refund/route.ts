import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST refund a guest
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role, full_name')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { guest_id, refund_reason, refund_amount, refund_proof_url } = body

    if (!guest_id) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 })
    }

    if (!refund_reason || !refund_reason.trim()) {
      return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 })
    }

    // Include purchase + catalog ticket price so we never refund a stale ¥100 snapshot
    const { data: guest, error: guestError } = await adminClient
      .from('ticket_guests')
      .select(`
        *,
        ticket_purchases!inner(
          id,
          user_id,
          event_id,
          unit_price,
          ticket_id,
          tickets:event_tickets(id, price, name),
          events(title)
        )
      `)
      .eq('id', guest_id)
      .single()

    if (guestError || !guest) {
      console.error('Guest not found:', guestError)
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    if (guest.payment_status === 'refunded') {
      return NextResponse.json({ error: 'Guest has already been refunded' }, { status: 400 })
    }

    const purchase = guest.ticket_purchases
    const catalogPrice = parseFloat(String(purchase?.tickets?.price ?? '')) || 0
    const storedUnit = parseFloat(String(purchase?.unit_price ?? '')) || 0
    const storedPaid = parseFloat(String(guest.amount_paid ?? '')) || 0
    const requested =
      refund_amount !== undefined && refund_amount !== null && refund_amount !== ''
        ? parseFloat(String(refund_amount))
        : NaN

    // Correct charge/refund amount = catalog ticket price (event ticket type)
    const correctAmount = catalogPrice || storedUnit || storedPaid || 0

    let finalRefundAmount = !Number.isNaN(requested) && requested >= 0 ? requested : correctAmount

    // If client/DB still has the stale wrong amount (e.g. 100) but catalog is 10, use catalog
    if (catalogPrice > 0 && finalRefundAmount !== catalogPrice) {
      const looksStale =
        finalRefundAmount === storedPaid ||
        finalRefundAmount === storedUnit ||
        finalRefundAmount > catalogPrice * 5 // clearly not the ticket price
      if (looksStale) {
        console.warn(
          `[guest-refund] Correcting stale refund amount for guest ${guest_id}: ` +
            `${finalRefundAmount} → catalog ${catalogPrice}`
        )
        finalRefundAmount = catalogPrice
      }
    }

    const updatePayload: Record<string, unknown> = {
      payment_status: 'refunded',
      refunded_by: userData.id,
      refunded_at: new Date().toISOString(),
      refund_reason: refund_reason.trim(),
      refund_amount: finalRefundAmount,
      // Keep amount_paid consistent with what should have been charged
      amount_paid: correctAmount > 0 ? correctAmount : guest.amount_paid,
      // Refunded guests cannot stay checked in
      checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
    }
    if (refund_proof_url) {
      updatePayload.refund_proof_url = refund_proof_url
    }

    const { data: refundedGuest, error: refundError } = await adminClient
      .from('ticket_guests')
      .update(updatePayload)
      .eq('id', guest_id)
      .select()
      .single()

    if (refundError) {
      console.error('Error refunding guest:', refundError)
      return NextResponse.json({
        error: 'Failed to refund guest',
        details: refundError.message
      }, { status: 500 })
    }

    // Reduce purchase total_price by the refunded guest amount (best effort)
    if (purchase?.id && finalRefundAmount > 0) {
      const { data: purchaseRow } = await adminClient
        .from('ticket_purchases')
        .select('total_price')
        .eq('id', purchase.id)
        .maybeSingle()

      const currentTotal = parseFloat(String(purchaseRow?.total_price ?? '')) || 0
      if (currentTotal > 0) {
        const nextTotal = Math.max(
          0,
          Math.round((currentTotal - finalRefundAmount) * 100) / 100
        )
        await adminClient
          .from('ticket_purchases')
          .update({ total_price: nextTotal })
          .eq('id', purchase.id)
      }
    }

    return NextResponse.json({
      message: 'Guest refunded successfully',
      guest: refundedGuest,
      corrected_from_stale_price: catalogPrice > 0 && storedPaid !== catalogPrice,
      catalog_price: catalogPrice || null
    })
  } catch (error: any) {
    console.error('Error refunding guest:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
