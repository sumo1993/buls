import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import { EMBASSY_DOC_TYPES, type EmbassyDocType } from '@/lib/embassy'

/**
 * Private upload for Embassy consular case documents.
 * Embassy fees / receipts are handled by Embassy staff only; BULS Treasurer is not involved.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const caseId = String(formData.get('caseId') || '').trim()
    const docType = String(formData.get('docType') || 'other').trim() as EmbassyDocType

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }
    if (!EMBASSY_DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload PDF, Word, or image files only.',
      }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Access: case owner or embassy/admin
    const { data: caseRow, error: caseError } = await supabase
      .from('embassy_cases')
      .select('id, user_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const isStaff = user.role === 'embassy' || user.role === 'admin'
    if (caseRow.user_id !== user.id && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileExt = file.name.split('.').pop() || 'bin'
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const filePath = `embassy-cases/${caseId}/${docType}_${fileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Embassy upload error:', uploadError)
      return NextResponse.json({
        error: 'Failed to upload file: ' + uploadError.message,
      }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      filePath: data.path,
      docType,
    })
  } catch (error: any) {
    console.error('Embassy upload error:', error)
    return NextResponse.json({
      error: 'Internal server error: ' + error.message,
    }, { status: 500 })
  }
}
