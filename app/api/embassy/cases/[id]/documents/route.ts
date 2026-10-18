import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import { EMBASSY_DOC_TYPES, isEmbassyStaff, type EmbassyDocType } from '@/lib/embassy'

/**
 * Attach a document record to an embassy case (after upload-embassy-document).
 * Embassy fees / receipts: Embassy staff only — BULS Treasurer is not involved.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: caseId } = await params
    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()
    const staff = isEmbassyStaff(user.role)

    const { data: caseRow, error: caseError } = await supabase
      .from('embassy_cases')
      .select('id, user_id, embassy_fee_status, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (!staff && caseRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const docType = (body.doc_type || 'other') as EmbassyDocType
    const fileUrl = String(body.file_url || '').trim()
    const fileName = body.file_name ? String(body.file_name) : null

    if (!EMBASSY_DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }
    if (!fileUrl) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 })
    }

    const { data: doc, error } = await supabase
      .from('embassy_case_documents')
      .insert({
        case_id: caseId,
        doc_type: docType,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert embassy document error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Receipt upload → mark proof_uploaded (never treasurer)
    if (docType === 'receipt' && caseRow.embassy_fee_status !== 'verified_by_embassy') {
      await supabase
        .from('embassy_cases')
        .update({ embassy_fee_status: 'proof_uploaded' })
        .eq('id', caseId)

      await supabase.from('embassy_case_status_history').insert({
        case_id: caseId,
        from_status: caseRow.status,
        to_status: caseRow.status,
        changed_by: user.id,
        note: 'Payment receipt uploaded',
      })
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/embassy/cases/[id]/documents:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
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

    const { id: caseId } = await params
    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()
    const staff = isEmbassyStaff(user.role)

    const { data: caseRow } = await supabase
      .from('embassy_cases')
      .select('id, user_id')
      .eq('id', caseId)
      .single()

    if (!caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }
    if (!staff && caseRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('embassy_case_documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
