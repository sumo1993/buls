import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Approve / reject paid T-shirts on free event registrations
 * (ticket+shirt is approved via /api/tickets/approve).
 *
 * POST { registration_id, action: 'approve' | 'reject', notes? }
 * GET  ?status=pending — list pending shirt payments from event_registrations
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData || !['admin', 'treasurer', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await adminClient
      .from('event_registrations')
      .select(`
        id,
        event_id,
        user_id,
        status,
        tshirt_wanted,
        tshirt_size,
        tshirt_payment_status,
        tshirt_payment_proof_url,
        tshirt_amount_paid,
        registered_at,
        user:users(id, full_name, email),
        event:events(id, title, event_date, tshirt_pricing, tshirt_price)
      `)
      .eq('tshirt_wanted', true)
      .eq('tshirt_payment_status', status)
      .order('registered_at', { ascending: false })

    if (error) {
      console.error('Error fetching tshirt payments:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ registrations: data || [] })
  } catch (error: any) {
    console.error('GET /api/tshirts/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData || !['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { registration_id, action, notes } = body

    if (!registration_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'registration_id and action required' }, { status: 400 })
    }

    const { data: reg, error: findError } = await adminClient
      .from('event_registrations')
      .select('*')
      .eq('id', registration_id)
      .single()

    if (findError || !reg) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    if (!reg.tshirt_wanted || reg.tshirt_payment_status !== 'pending') {
      return NextResponse.json({ error: 'No pending T-shirt payment on this registration' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      tshirt_payment_status: action === 'approve' ? 'paid' : 'refunded',
    }
    if (notes) {
      updateData.notes = reg.notes
        ? `${reg.notes}\n[T-shirt ${action}] ${notes}`
        : `[T-shirt ${action}] ${notes}`
    }

    const { data: updated, error: updateError } = await adminClient
      .from('event_registrations')
      .update(updateData)
      .eq('id', registration_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating tshirt payment:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({
      registration: updated,
      message:
        action === 'approve'
          ? 'T-shirt payment approved'
          : 'T-shirt payment rejected',
    })
  } catch (error: any) {
    console.error('POST /api/tshirts/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
