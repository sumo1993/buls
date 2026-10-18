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

// GET - fetch payment records
export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const userData = await getDbUser(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get proposal_id from query params if provided
    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('proposal_id')

    let query = adminClient
      .from('payment_records')
      .select(`
        *,
        proposal:budget_proposals(
          title,
          status,
          total_amount,
          committee_id,
          committees(committee_name)
        )
      `)
      .order('payment_date', { ascending: false })

    // Filter by proposal_id if provided
    if (proposalId) {
      query = query.eq('proposal_id', proposalId)
    } else if (!['treasurer', 'finance', 'admin', 'secretary'].includes(userData.role)) {
      // If no proposal_id and not staff, show only user's own payments
      query = query.eq('recorded_by', userData.id)
    }

    const { data: records, error } = await query

    if (error) throw error

    return NextResponse.json({ records: records || [] })
  } catch (error) {
    console.error('Error fetching payment records:', error)
    return NextResponse.json({ error: 'Failed to fetch payment records' }, { status: 500 })
  }
}

// POST - create payment record
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      proposal_id,
      amount,
      payment_method,
      paid_to_committee_id,
      paid_to_name,
      paid_to_account,
      notes,
      receipt_url,
    } = body

    if (!proposal_id || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'Proposal ID, amount, and payment method are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const userData = await getDbUser(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['treasurer', 'finance', 'admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: proposal } = await adminClient
      .from('budget_proposals')
      .select('id, status, total_amount, committee_id, paid_at')
      .eq('id', proposal_id)
      .maybeSingle()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (proposal.status !== 'approved' && proposal.status !== 'paid') {
      return NextResponse.json(
        { error: 'Proposal must be approved before payment' },
        { status: 400 }
      )
    }

    if (proposal.paid_at) {
      return NextResponse.json({ error: 'Proposal already paid' }, { status: 400 })
    }

    // Auto-generate payment reference number
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
    
    // Get count of payments today to generate sequential number
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
    
    const { count } = await adminClient
      .from('payment_records')
      .select('*', { count: 'exact', head: true })
      .gte('payment_date', startOfDay)
      .lte('payment_date', endOfDay)
    
    const sequentialNumber = String((count || 0) + 1).padStart(5, '0')
    const autoReference = `BP-${dateStr}-${sequentialNumber}`

    const { data: record, error } = await adminClient
      .from('payment_records')
      .insert({
        proposal_id,
        amount,
        payment_method,
        payment_reference: autoReference,
        paid_to_committee_id: paid_to_committee_id || proposal.committee_id,
        paid_to_name,
        paid_to_account,
        recorded_by: userData.id,
        notes,
        receipt_url,
        payment_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    await adminClient
      .from('budget_proposals')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: autoReference,
      })
      .eq('id', proposal_id)

    return NextResponse.json({ record })
  } catch (error) {
    console.error('Error creating payment record:', error)
    return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
  }
}

// DELETE - delete payment record
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Payment record ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const userData = await getDbUser(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: existing } = await adminClient
      .from('payment_records')
      .select('id, recorded_by')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (
      existing.recorded_by !== userData.id &&
      !['admin', 'treasurer'].includes(userData.role)
    ) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { error } = await adminClient.from('payment_records').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment record:', error)
    return NextResponse.json({ error: 'Failed to delete payment record' }, { status: 500 })
  }
}
