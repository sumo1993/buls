const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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
  const { data, error } = await sb
    .from('qr_codes')
    .select('id, role, payment_method, title, created_at')
    .order('created_at', { ascending: false })

  console.log(JSON.stringify({ error, count: data?.length ?? 0, rows: data }, null, 2))

  // Also test the exact public query
  const { data: treas, error: e2 } = await sb
    .from('qr_codes')
    .select('id, role, payment_method, title')
    .eq('role', 'treasurer')
    .in('payment_method', ['wechat', 'alipay', 'bank_transfer'])
    .order('updated_at', { ascending: false })

  console.log('\nTreasurer query:', JSON.stringify({ error: e2, rows: treas }, null, 2))
}

main()
