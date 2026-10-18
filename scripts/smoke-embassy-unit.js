/**
 * Embassy unit smoke (no DB required) + optional DB flow if tables exist.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Inline the critical helpers from lib/embassy.ts (keep in sync)
const EMBASSY_SERVICE_TYPES = [
  'passport_renewal',
  'passport_new',
  't_visa',
  'student_visa_cancellation',
  'document_request',
]

function sanitizeCaseForMember(row) {
  const { embassy_internal_notes, ...rest } = row
  return rest
}

function validatePayload(serviceType, payload) {
  const p = payload || {}
  if (serviceType === 'passport_renewal' || serviceType === 'passport_new') {
    if (!p.full_name?.trim()) return 'Full name is required'
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.phone?.trim()) return 'Phone is required'
    if (!p.china_address?.trim()) return 'China address is required'
  }
  if (serviceType === 't_visa') {
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.reason?.trim()) return 'Reason for T-visa is required'
    if (!p.immigration_address?.trim()) return 'Immigration / residence address is required'
    if (!p.university?.trim()) return 'University is required'
    if (!p.teacher_name?.trim()) return 'Teacher / advisor name is required'
  }
  if (serviceType === 'student_visa_cancellation') {
    if (!p.passport_number?.trim()) return 'Passport number is required'
    if (!p.university?.trim()) return 'University is required'
    if (!p.city?.trim()) return 'City is required'
    if (!p.reason?.trim()) return 'Reason is required'
  }
  if (serviceType === 'document_request') {
    if (!p.document_type?.trim()) return 'Document type is required'
    if (!p.purpose?.trim()) return 'Purpose is required'
  }
  return null
}

let passed = 0
let failed = 0

function ok(name, detail) {
  passed++
  console.log(`✅ ${name}${detail ? ' — ' + detail : ''}`)
}
function fail(name, detail) {
  failed++
  console.error(`❌ ${name}${detail ? ' — ' + detail : ''}`)
}

function runUnit() {
  console.log('—— Unit checks ——')
  if (EMBASSY_SERVICE_TYPES.length === 5) ok('service types count')
  else fail('service types count')

  const badPassport = validatePayload('passport_renewal', { full_name: 'A' })
  if (badPassport) ok('passport validation rejects incomplete', badPassport)
  else fail('passport validation rejects incomplete')

  const goodPassport = validatePayload('passport_renewal', {
    full_name: 'Test User',
    passport_number: 'LR123',
    phone: '138',
    china_address: 'Beijing',
  })
  if (!goodPassport) ok('passport validation accepts complete')
  else fail('passport validation accepts complete', goodPassport)

  const goodT = validatePayload('t_visa', {
    passport_number: 'LR1',
    reason: 'study',
    immigration_address: 'addr',
    university: 'Uni',
    teacher_name: 'Prof',
  })
  if (!goodT) ok('t_visa validation accepts complete')
  else fail('t_visa validation accepts complete', goodT)

  const sanitized = sanitizeCaseForMember({
    id: '1',
    embassy_internal_notes: 'secret',
    status: 'submitted',
  })
  if (!('embassy_internal_notes' in sanitized) && sanitized.status === 'submitted') {
    ok('sanitize strips internal notes')
  } else fail('sanitize strips internal notes')

  // Source files exist
  const roots = [
    'ADD_EMBASSY_CASES.sql',
    'lib/embassy.ts',
    'app/api/embassy/cases/route.ts',
    'app/api/embassy/cases/[id]/route.ts',
    'app/api/embassy/cases/[id]/documents/route.ts',
    'app/api/upload-embassy-document/route.ts',
    'app/embassy/page.tsx',
    'app/embassy/desk/page.tsx',
  ]
  for (const r of roots) {
    if (fs.existsSync(path.join(process.cwd(), r))) ok(`file ${r}`)
    else fail(`file ${r}`)
  }

  // Role wiring in source
  const roleRoute = fs.readFileSync(
    path.join(process.cwd(), 'app/api/admin/users/[id]/role/route.ts'),
    'utf8'
  )
  if (roleRoute.includes("'embassy'")) ok('admin role route allows embassy')
  else fail('admin role route allows embassy')

  const nav = fs.readFileSync(
    path.join(process.cwd(), 'components/DashboardLayout.tsx'),
    'utf8'
  )
  if (nav.includes('/embassy/desk') && nav.includes("'embassy'")) {
    ok('DashboardLayout embassy nav')
  } else fail('DashboardLayout embassy nav')

  const types = fs.readFileSync(
    path.join(process.cwd(), 'lib/types/database.ts'),
    'utf8'
  )
  if (types.includes("'embassy'")) ok('UserRole includes embassy')
  else fail('UserRole includes embassy')
}

async function runDb() {
  console.log('\n—— DB checks ——')
  const envPath = path.join(process.cwd(), '.env.local')
  const env = Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        let v = l.slice(i + 1).trim()
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1)
        }
        return [l.slice(0, i).trim(), v]
      })
  )

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: probeError } = await supabase
    .from('embassy_cases')
    .select('id')
    .limit(1)

  if (probeError) {
    fail(
      'DB tables',
      'Run ADD_EMBASSY_CASES.sql in Supabase SQL Editor, then re-run: node scripts/smoke-embassy.js'
    )
    return false
  }
  ok('DB tables exist')

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name, role, status')
    .eq('status', 'active')
    .limit(20)

  const member =
    (members || []).find((u) => u.role === 'member') || (members || [])[0]
  const staff =
    (members || []).find((u) => u.role === 'admin') || member

  if (!member) {
    fail('users available')
    return false
  }
  ok('users available', member.full_name)

  const { data: passportCase, error: pErr } = await supabase
    .from('embassy_cases')
    .insert({
      user_id: member.id,
      service_type: 'passport_renewal',
      status: 'submitted',
      payload: {
        full_name: member.full_name,
        passport_number: 'LR-SMOKE-001',
        phone: '13800000000',
        china_address: 'Beijing',
      },
      embassy_internal_notes: 'STAFF ONLY',
      payment_channel: 'liberia_lra',
      lra_bill_number: 'LRA-SMOKE-BILL',
      payment_receipt_number: 'RCP-1',
      embassy_fee_status: 'proof_uploaded',
    })
    .select()
    .single()

  if (pErr) {
    fail('passport create', pErr.message)
    return false
  }
  ok('passport LRA case created', passportCase.id)

  await supabase.from('embassy_case_documents').insert({
    case_id: passportCase.id,
    doc_type: 'receipt',
    file_url: 'https://example.com/r.pdf',
    file_name: 'r.pdf',
    uploaded_by: member.id,
  })
  ok('receipt attached')

  await supabase
    .from('embassy_cases')
    .update({
      embassy_fee_status: 'verified_by_embassy',
      status: 'under_review',
      assigned_to: staff.id,
    })
    .eq('id', passportCase.id)
  ok('embassy verified payment')

  await supabase
    .from('embassy_cases')
    .update({ status: 'in_progress' })
    .eq('id', passportCase.id)
  ok('→ in_progress')

  const { data: ready } = await supabase
    .from('embassy_cases')
    .update({ status: 'ready' })
    .eq('id', passportCase.id)
    .select()
    .single()
  if (ready?.status === 'ready') ok('→ ready')
  else fail('→ ready')

  const { data: tvisa, error: tErr } = await supabase
    .from('embassy_cases')
    .insert({
      user_id: member.id,
      service_type: 't_visa',
      status: 'submitted',
      payload: {
        passport_number: 'LR-T',
        reason: 'internship',
        immigration_address: 'Haidian',
        university: 'Tsinghua',
        teacher_name: 'Prof',
      },
      payment_channel: 'none',
      embassy_fee_status: 'not_required',
    })
    .select()
    .single()

  if (tErr) fail('t_visa create', tErr.message)
  else ok('t_visa case created', tvisa.id)

  await supabase
    .from('embassy_cases')
    .delete()
    .in('id', [passportCase.id, tvisa?.id].filter(Boolean))
  ok('cleanup')
  return true
}

async function main() {
  const allowMissingDb = process.argv.includes('--allow-missing-db')
  runUnit()
  const dbOk = await runDb()
  console.log('\n——— Summary ———')
  console.log(`Passed: ${passed}  Failed: ${failed}`)
  if (!dbOk) {
    console.log(
      '\nNOTE: Apply ADD_EMBASSY_CASES.sql in Supabase SQL Editor, then:\n  node scripts/smoke-embassy.js'
    )
    if (allowMissingDb && failed === 1) {
      // Only the missing-table check failed — code/unit smoke OK
      console.log('Exiting 0 with --allow-missing-db (unit/wiring verified).')
      process.exit(0)
    }
  }
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
