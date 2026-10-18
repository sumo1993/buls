import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import {
  EMBASSY_FEE_STATUSES,
  EMBASSY_PAYMENT_CHANNELS,
  EMBASSY_STATUSES,
  isEmbassyStaff,
  sanitizeCaseForMember,
  validatePayload,
  type EmbassyCaseStatus,
  type EmbassyFeeStatus,
  type EmbassyPaymentChannel,
  type EmbassyServiceType,
} from '@/lib/embassy'

async function loadCase(supabase: ReturnType<typeof createAdminClient>, id: string) {
  const result = await supabase
    .from('embassy_cases')
    .select(`
      *,
      member:users!embassy_cases_user_id_fkey(id, full_name, email, phone_number, status),
      assignee:users!embassy_cases_assigned_to_fkey(id, full_name),
      documents:embassy_case_documents(*),
      history:embassy_case_status_history(*)
    `)
    .eq('id', id)
    .single()

  if (result.data) {
    if (Array.isArray(result.data.documents)) {
      result.data.documents.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    if (Array.isArray(result.data.history)) {
      result.data.history.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
  }
  return result
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()
    const staff = isEmbassyStaff(user.role)

    const { data, error } = await loadCase(supabase, id)
    if (error || !data) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (!staff && data.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prefill helper: member profile passport fields
    let profile: Record<string, any> | null = null
    if (staff || data.user_id === user.id) {
      const { data: mp } = await supabase
        .from('members_profile')
        .select(
          'date_of_birth, passport_number, passport_issue_date, passport_expiration_date, phone, beijing_address, address, university'
        )
        .eq('user_id', data.user_id)
        .maybeSingle()
      profile = mp
        ? {
            ...mp,
            china_address: mp.beijing_address || mp.address || '',
          }
        : null
    }

    return NextResponse.json({
      case: staff ? data : sanitizeCaseForMember(data),
      profile,
      staff,
    })
  } catch (error: any) {
    console.error('GET /api/embassy/cases/[id]:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()
    const staff = isEmbassyStaff(user.role)

    const { data: existing, error: findError } = await supabase
      .from('embassy_cases')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (!staff && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const updates: Record<string, any> = {}
    let statusNote: string | null = body.status_note ? String(body.status_note) : null

    // Member-allowed fields
    if (!staff) {
      if (body.payload !== undefined) {
        updates.payload = { ...(existing.payload || {}), ...body.payload }
      }
      if (body.member_notes !== undefined) {
        updates.member_notes = body.member_notes
      }
      if (body.payment_channel !== undefined) {
        if (!EMBASSY_PAYMENT_CHANNELS.includes(body.payment_channel)) {
          return NextResponse.json({ error: 'Invalid payment channel' }, { status: 400 })
        }
        updates.payment_channel = body.payment_channel as EmbassyPaymentChannel
      }
      if (body.lra_bill_number !== undefined) {
        updates.lra_bill_number = body.lra_bill_number || null
      }
      if (body.payment_receipt_number !== undefined) {
        updates.payment_receipt_number = body.payment_receipt_number || null
      }
      if (body.official_transaction_id !== undefined) {
        updates.official_transaction_id = body.official_transaction_id || null
      }

      // Member can resubmit after docs_requested, or cancel own submitted/draft
      if (body.status !== undefined) {
        const next = body.status as EmbassyCaseStatus
        if (next === 'cancelled' && ['draft', 'submitted', 'docs_requested'].includes(existing.status)) {
          updates.status = 'cancelled'
        } else if (next === 'submitted' && ['draft', 'docs_requested', 'awaiting_payment_proof'].includes(existing.status)) {
          const payload = updates.payload || existing.payload || {}
          const err = validatePayload(existing.service_type as EmbassyServiceType, payload)
          if (err) return NextResponse.json({ error: err }, { status: 400 })
          updates.status = 'submitted'
        } else if (next !== existing.status) {
          return NextResponse.json({ error: 'Members cannot set that status' }, { status: 403 })
        }
      }

      // If payment proof fields added, bump fee status
      if (
        updates.lra_bill_number ||
        updates.payment_receipt_number ||
        updates.official_transaction_id ||
        body.mark_proof_uploaded
      ) {
        if (existing.embassy_fee_status !== 'verified_by_embassy') {
          updates.embassy_fee_status = 'proof_uploaded'
        }
      }
    } else {
      // Staff fields
      if (body.payload !== undefined) {
        updates.payload = { ...(existing.payload || {}), ...body.payload }
      }
      if (body.embassy_internal_notes !== undefined) {
        updates.embassy_internal_notes = body.embassy_internal_notes
      }
      if (body.assigned_to !== undefined) {
        updates.assigned_to = body.assigned_to || null
      }
      if (body.payment_channel !== undefined) {
        if (!EMBASSY_PAYMENT_CHANNELS.includes(body.payment_channel)) {
          return NextResponse.json({ error: 'Invalid payment channel' }, { status: 400 })
        }
        updates.payment_channel = body.payment_channel
      }
      if (body.lra_bill_number !== undefined) updates.lra_bill_number = body.lra_bill_number || null
      if (body.payment_receipt_number !== undefined) {
        updates.payment_receipt_number = body.payment_receipt_number || null
      }
      if (body.official_transaction_id !== undefined) {
        updates.official_transaction_id = body.official_transaction_id || null
      }
      if (body.embassy_fee_status !== undefined) {
        if (!EMBASSY_FEE_STATUSES.includes(body.embassy_fee_status)) {
          return NextResponse.json({ error: 'Invalid fee status' }, { status: 400 })
        }
        updates.embassy_fee_status = body.embassy_fee_status as EmbassyFeeStatus
      }
      if (body.verify_payment === true) {
        updates.embassy_fee_status = 'verified_by_embassy'
        statusNote = statusNote || 'Payment proof verified by Embassy'
      }
      if (body.status !== undefined) {
        if (!EMBASSY_STATUSES.includes(body.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        updates.status = body.status as EmbassyCaseStatus
      }
      if (body.assign_to_me === true) {
        updates.assigned_to = user.id
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('embassy_cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update embassy case error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (updates.status && updates.status !== existing.status) {
      await supabase.from('embassy_case_status_history').insert({
        case_id: id,
        from_status: existing.status,
        to_status: updates.status,
        changed_by: user.id,
        note: statusNote,
      })
    } else if (body.verify_payment === true) {
      await supabase.from('embassy_case_status_history').insert({
        case_id: id,
        from_status: existing.status,
        to_status: existing.status,
        changed_by: user.id,
        note: statusNote || 'Payment proof verified by Embassy',
      })
    }

    const { data: full } = await loadCase(supabase, id)

    return NextResponse.json({
      case: staff ? (full || updated) : sanitizeCaseForMember(full || updated),
      staff,
    })
  } catch (error: any) {
    console.error('PATCH /api/embassy/cases/[id]:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
