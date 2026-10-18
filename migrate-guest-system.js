const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL(sql) {
  try {
    console.log('Running SQL migration...');
    
    // Execute SQL via REST API (PostgREST doesn't support arbitrary SQL)
    // Instead, we'll execute via supabase-js with raw query
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('exec_sql function not available, trying alternative...');
      
      // We'll try to run SQL statements one by one
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`Running statement ${i + 1}/${statements.length}:`, stmt.substring(0, 100) + '...');
        
        try {
          const { data, error } = await supabase.rpc('execute_sql', { sql_statement: stmt });
          if (error && !error.message.includes('function "execute_sql" does not exist')) {
            console.error(`Error in statement ${i + 1}:`, error.message);
          }
        } catch (stmtError) {
          console.error(`Statement ${i + 1} failed:`, stmtError.message);
        }
      }
      
      console.log('SQL migration attempt completed. The migration should be applied manually in Supabase SQL editor.');
    } else {
      console.log('SQL migration completed successfully:', data);
    }
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

async function main() {
  const fs = require('fs');
  const sql = fs.readFileSync('../ENHANCED_GUEST_SYSTEM.sql', 'utf8');
  await runSQL(sql);
}

main();