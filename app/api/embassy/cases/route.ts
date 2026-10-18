import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import {
  EMBASSY_PAYMENT_CHANNELS,
  EMBASSY_SERVICE_TYPES,
  isEmbassyStaff,
  sanitizeCaseForMember,
  validatePayload,
  type EmbassyPaymentChannel,
  type EmbassyServiceType,
} from '@/lib/embassy'

/**
 * Embassy consular cases.
 * Embassy fees are handled by Embassy staff only; BULS Treasurer is not involved.
 */

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const serviceType = searchParams.get('service_type')
    const staff = isEmbassyStaff(user.role)

    let query = supabase
      .from('embassy_cases')
      .select(`
        *,
        member:users!embassy_cases_user_id_fkey(id, full_name, email, phone_number, status),
        assignee:users!embassy_cases_assigned_to_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false })

    if (!staff) {
      query = query.eq('user_id', user.id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const { data, error } = await query
    if (error) {
      console.error('List embassy cases error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const cases = (data || []).map((row) =>
      staff ? row : sanitizeCaseForMember(row)
    )

    return NextResponse.json({ cases, staff })
  } catch (error: any) {
    console.error('GET /api/embassy/cases:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)

    // Approved / active members only (staff may also create for testing)
    const staff = isEmbassyStaff(user.role)
    if (!staff && user.status !== 'active' && user.status !== 'approved') {
      return NextResponse.json({
        error: 'Only approved members can submit Embassy requests.',
      }, { status: 403 })
    }

    const body = await req.json()
    const serviceType = body.service_type as EmbassyServiceType
    const payload = (body.payload || {}) as Record<string, any>
    const memberNotes = body.member_notes ? String(body.member_notes) : null
    const paymentChannel = (body.payment_channel || 'none') as EmbassyPaymentChannel
    const status = body.status === 'draft' ? 'draft' : 'submitted'

    if (!EMBASSY_SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }
    if (!EMBASSY_PAYMENT_CHANNELS.includes(paymentChannel)) {
      return NextResponse.json({ error: 'Invalid payment channel' }, { status: 400 })
    }

    if (status !== 'draft') {
      const validationError = validatePayload(serviceType, payload)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
    }

    let embassyFeeStatus = 'not_required'
    if (paymentChannel === 'liberia_lra' || paymentChannel === 'overseas_official' || paymentChannel === 'embassy_direct') {
      const hasProof =
        Boolean(body.lra_bill_number || body.payment_receipt_number || body.official_transaction_id) ||
        Boolean(payload.receipt_uploaded)
      embassyFeeStatus = hasProof ? 'proof_uploaded' : 'unpaid'
    }

    const supabase = createAdminClient()
    const insertRow = {
      user_id: user.id,
      service_type: serviceType,
      status,
      payload,
      member_notes: memberNotes,
      payment_channel: paymentChannel,
      lra_bill_number: body.lra_bill_number || null,
      payment_receipt_number: body.payment_receipt_number || null,
      official_transaction_id: body.official_transaction_id || null,
      embassy_fee_status: embassyFeeStatus,
    }

    const { data: created, error } = await supabase
      .from('embassy_cases')
      .insert(insertRow)
      .select()
      .single()

    if (error) {
      console.error('Create embassy case error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('embassy_case_status_history').insert({
      case_id: created.id,
      from_status: null,
      to_status: status,
      changed_by: user.id,
      note: 'Case created',
    })

    return NextResponse.json({
      case: staff ? created : sanitizeCaseForMember(created),
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/embassy/cases:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
