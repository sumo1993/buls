const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

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

const ref = 'jsvjdrnhvxlxzqhkijpj'
const sql = fs.readFileSync(path.join(process.cwd(), 'ADD_EMBASSY_CASES.sql'), 'utf8')

const candidates = []
if (env.DATABASE_URL) candidates.push({ label: 'DATABASE_URL', connectionString: env.DATABASE_URL })
if (env.SUPABASE_DB_PASSWORD) {
  candidates.push({
    label: 'db.host + SUPABASE_DB_PASSWORD',
    connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  })
  candidates.push({
    label: 'pooler + SUPABASE_DB_PASSWORD',
    connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  })
}
// Unlikely but try service role as password
candidates.push({
  label: 'db.host + service_role',
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_SERVICE_ROLE_KEY)}@db.${ref}.supabase.co:5432/postgres`,
})

async function tryOne(c) {
  const client = new Client({
    connectionString: c.connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    console.log('Connected via', c.label)
    await client.query(sql)
    console.log('SQL applied successfully')
    await client.end()
    return true
  } catch (e) {
    console.log('Fail', c.label, e.message.slice(0, 160))
    try {
      await client.end()
    } catch {}
    return false
  }
}

async function main() {
  for (const c of candidates) {
    if (await tryOne(c)) {
      process.exit(0)
    }
  }
  console.error(
    'Could not apply SQL. Add DATABASE_URL or SUPABASE_DB_PASSWORD to .env.local, or run ADD_EMBASSY_CASES.sql in the Supabase SQL Editor.'
  )
  process.exit(1)
}

main()
