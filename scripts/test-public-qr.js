const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Simulate the API route logic exactly
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      let v = l.slice(i + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1)
      return [l.slice(0, i).trim(), v]
    })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const role = 'treasurer'
  const { data: qrCodes, error } = await sb
    .from('qr_codes')
    .select('id, role, qr_code_url, payment_method, title, description')
    .eq('role', role)
    .in('payment_method', ['wechat', 'alipay', 'bank_transfer'])
    .order('updated_at', { ascending: false })

  console.log('error', error)
  console.log(
    'rows',
    (qrCodes || []).map((q) => ({
      payment_method: q.payment_method,
      hasUrl: !!q.qr_code_url,
      urlLen: q.qr_code_url?.length || 0,
    }))
  )
  const wechat = qrCodes?.find((qr) => qr.payment_method === 'wechat')
  console.log('wechat found', !!wechat, 'urlLen', wechat?.qr_code_url?.length)
}

main()
