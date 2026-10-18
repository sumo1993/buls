const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Supabase Connection Test ===\n');
console.log('URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Anon Key:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
console.log('Service Role Key:', supabaseServiceKey ? '✓ Set' : '✗ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required credentials in .env.local');
  process.exit(1);
}

// Test with service role key
console.log('\n--- Testing with Service Role Key ---');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

supabase
  .from('users')
  .select('email, full_name, role, status')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Connection failed:', error.message);
    } else {
      console.log('✓ Connection successful!');
      console.log('Sample data:', data);
    }
  })
  .catch(err => {
    console.error('❌ Network error:', err.message);
  });
