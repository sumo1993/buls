const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://xyzrukdtwpmjwvcbtqul.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enJ1a2R0d3BtandoY2J0cXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDM1NzM0MCwiZXhwIjoyMDQ5OTMzMzQwfQ.Y3pckmMkotcoffZzE67eTIS8dKJi8ug1iSNiDYM0-HM'
);

async function runMigration() {
  try {
    const sql = fs.readFileSync('./ADD_PAYMENT_PROOF_TO_NON_MEMBER.sql', 'utf8');
    
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error('Error:', error);
        } else {
          console.log('Success!');
        }
      }
    }
    
    console.log('\nMigration completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
