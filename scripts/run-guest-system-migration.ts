import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Starting Enhanced Guest System Migration...')
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', '..', 'ENHANCED_GUEST_SYSTEM.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    console.log('📋 SQL Migration Content:')
    console.log('-' .repeat(50))
    console.log(sqlContent.substring(0, 500) + '...') // Show first 500 chars
    console.log('-' .repeat(50))
    
    console.log('\n🔧 Executing SQL migration...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Error executing SQL:', error.message)
      
      // Try direct SQL execution if RPC not available
      console.log('🔄 Trying direct SQL execution...')
      
      // Split SQL into individual statements
      const sqlStatements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)
      
      let successCount = 0
      let errorCount = 0
      
      for (const [index, statement] of sqlStatements.entries()) {
        try {
          console.log(`\n📝 Executing statement ${index + 1}/${sqlStatements.length}:`)
          console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''))
          
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          
          if (stmtError) {
            console.error(`❌ Error in statement ${index + 1}:`, stmtError.message)
            errorCount++
          } else {
            console.log(`✅ Statement ${index + 1} executed successfully`)
            successCount++
          }
        } catch (stmtError: any) {
          console.error(`❌ Error in statement ${index + 1}:`, stmtError.message)
          errorCount++
        }
        
        // Add small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log('\n' + '='.repeat(50))
      console.log(`📊 Migration Summary:`)
      console.log(`✅ Successful statements: ${successCount}`)
      console.log(`❌ Failed statements: ${errorCount}`)
      console.log(`📋 Total statements: ${sqlStatements.length}`)
      console.log('='.repeat(50))
      
      if (errorCount > 0) {
        console.log('\n⚠️ Some statements failed. Manual execution in Supabase SQL Editor recommended.')
        console.log('📋 Open Supabase SQL Editor and copy-paste the content of ENHANCED_GUEST_SYSTEM.sql')
      } else {
        console.log('\n🎉 Migration completed successfully!')
      }
    } else {
      console.log('✅ SQL migration executed successfully via RPC')
      console.log('📊 Result:', data)
    }
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    console.error('💡 Please execute the SQL manually in Supabase SQL Editor:')
    console.error('1. Go to https://supabase.com/dashboard/project/jsvjdrnhvxlxzqhkijpj/sql/editor')
    console.error('2. Copy the content of ENHANCED_GUEST_SYSTEM.sql')
    console.error('3. Paste and execute')
  }
}

// Run the migration
runMigration()