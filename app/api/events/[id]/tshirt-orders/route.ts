import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatTshirtPaymentStatus } from '@/lib/event-tshirts'

/**
 * GET all T-shirt orders for an event (members + guests + free-event registrations).
 * Used for printing / packing lists by size and name.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const adminClient = createAdminClient()

    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData || !['admin', 'secretary', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, title, event_date, tshirt_enabled, tshirt_pricing, tshirt_price, tshirt_sizes')
      .eq('id', eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    type OrderRow = {
      id: string
      source: 'ticket' | 'guest' | 'registration'
      name: string
      email: string | null
      phone: string | null
      size: string
      payment_status: string | null
      payment_label: string
      picked_up: boolean
      host_name: string | null
      ticket_number: string | null
      purchase_payment_status: string | null
    }

    const orders: OrderRow[] = []

    // Run the three sources in parallel
    const [purchasesRes, guestsRes, regsRes] = await Promise.all([
      adminClient
        .from('ticket_purchases')
        .select(`
          id,
          ticket_number,
          payment_status,
          tshirt_wanted,
          tshirt_size,
          tshirt_payment_status,
          tshirt_picked_up,
          users:users!ticket_purchases_user_id_fkey(full_name, email, phone_number)
        `)
        .eq('event_id', eventId)
        .eq('tshirt_wanted', true)
        .neq('payment_status', 'cancelled')
        .neq('payment_status', 'rejected'),
      adminClient
        .from('ticket_guests')
        .select(`
          id,
          full_name,
          email,
          phone,
          tshirt_wanted,
          tshirt_size,
          tshirt_payment_status,
          tshirt_picked_up,
          payment_status,
          ticket_purchase_id,
          ticket_purchases!inner(
            id,
            event_id,
            ticket_number,
            payment_status,
            users:users!ticket_purchases_user_id_fkey(full_name)
          )
        `)
        .eq('ticket_purchases.event_id', eventId)
        .eq('tshirt_wanted', true),
      adminClient
        .from('event_registrations')
        .select(`
          id,
          status,
          tshirt_wanted,
          tshirt_size,
          tshirt_payment_status,
          tshirt_picked_up,
          user:users(full_name, email, phone_number)
        `)
        .eq('event_id', eventId)
        .eq('tshirt_wanted', true),
    ])

    if (purchasesRes.error) console.error('tshirt-orders purchases:', purchasesRes.error)
    if (guestsRes.error) console.error('tshirt-orders guests:', guestsRes.error)
    if (regsRes.error) console.error('tshirt-orders registrations:', regsRes.error)

    const purchases = purchasesRes.data
    const guests = guestsRes.data
    const regs = regsRes.data

    for (const p of purchases || []) {
      if (p.payment_status === 'refunded') continue
      const user = Array.isArray(p.users) ? p.users[0] : p.users
      const size = String(p.tshirt_size || '?').toUpperCase()
      orders.push({
        id: `ticket-${p.id}`,
        source: 'ticket',
        name: user?.full_name || 'Member',
        email: user?.email || null,
        phone: user?.phone_number || null,
        size,
        payment_status: p.tshirt_payment_status,
        payment_label: formatTshirtPaymentStatus(p.tshirt_payment_status),
        picked_up: !!p.tshirt_picked_up,
        host_name: null,
        ticket_number: p.ticket_number || null,
        purchase_payment_status: p.payment_status,
      })
    }

    for (const g of guests || []) {
      if (g.payment_status === 'refunded') continue
      const purchase = Array.isArray(g.ticket_purchases)
        ? g.ticket_purchases[0]
        : g.ticket_purchases
      if (purchase?.payment_status === 'refunded') continue
      const host = Array.isArray(purchase?.users) ? purchase.users[0] : purchase?.users
      orders.push({
        id: `guest-${g.id}`,
        source: 'guest',
        name: g.full_name || 'Guest',
        email: g.email || null,
        phone: g.phone || null,
        size: String(g.tshirt_size || '?').toUpperCase(),
        payment_status: g.tshirt_payment_status,
        payment_label: formatTshirtPaymentStatus(g.tshirt_payment_status),
        picked_up: !!g.tshirt_picked_up,
        host_name: host?.full_name || null,
        ticket_number: purchase?.ticket_number || null,
        purchase_payment_status: purchase?.payment_status || null,
      })
    }

    for (const r of regs || []) {
      if (r.status === 'cancelled' || r.status === 'refunded') continue
      const user = Array.isArray(r.user) ? r.user[0] : r.user
      orders.push({
        id: `reg-${r.id}`,
        source: 'registration',
        name: user?.full_name || 'Member',
        email: user?.email || null,
        phone: user?.phone_number || null,
        size: String(r.tshirt_size || '?').toUpperCase(),
        payment_status: r.tshirt_payment_status,
        payment_label: formatTshirtPaymentStatus(r.tshirt_payment_status),
        picked_up: !!r.tshirt_picked_up,
        host_name: null,
        ticket_number: null,
        purchase_payment_status: r.status,
      })
    }

    // Sort by size then name
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '?']
    orders.sort((a, b) => {
      const ai = sizeOrder.indexOf(a.size)
      const bi = sizeOrder.indexOf(b.size)
      const aIdx = ai === -1 ? 99 : ai
      const bIdx = bi === -1 ? 99 : bi
      if (aIdx !== bIdx) return aIdx - bIdx
      return a.name.localeCompare(b.name)
    })

    const bySize: Record<string, number> = {}
    for (const o of orders) {
      bySize[o.size] = (bySize[o.size] || 0) + 1
    }

    return NextResponse.json({
      event,
      total: orders.length,
      by_size: bySize,
      orders,
    })
  } catch (error: any) {
    console.error('GET /api/events/[id]/tshirt-orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
