const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓ Set' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runSQLFile(filePath) {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`)
    const sqlContent = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL by semicolons to run individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n--- Executing statement ${i + 1}/${statements.length} ---`)
      
      // Check if it's a SELECT statement (show results)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`🔍 Running query: ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`)
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.error(`❌ Query error:`, error.message)
        } else {
          console.log(`✅ Query results:`)
          console.log(JSON.stringify(data, null, 2))
        }
      } else {
        // For non-SELECT statements
        console.log(`🚀 Executing: ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.error(`❌ Error:`, error.message)
        } else {
          console.log(`✅ Success`)
        }
      }
    }
    
    console.log('\n✨ SQL execution completed')
  } catch (error) {
    console.error('❌ Error running SQL file:', error.message)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const sqlFile = process.argv[2] || 'ADD_TEST_DATA_EVENT6.sql'
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL file not found: ${sqlFile}`)
    console.error('Available SQL files:')
    const files = fs.readdirSync('.').filter(f => f.endsWith('.sql'))
    files.forEach(f => console.log(`  - ${f}`))
    process.exit(1)
  }
  
  console.log('🚀 Running SQL test data script')
  console.log('================================')
  
  await runSQLFile(sqlFile)
  
  console.log('\n✅ Test data script completed successfully!')
  console.log('📋 Next steps:')
  console.log('   1. Refresh the check-in page at http://localhost:3000/secretary/events/6/checkin')
  console.log('   2. You should now see test attendees in the list')
  console.log('   3. Try searching for "640" to test ticket number search')
}

main().catch(console.error)