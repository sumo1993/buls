const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('=== DEBUGGING DATABASE ===');
  
  // Check if we can connect at all
  console.log('1. Testing connection...');
  const { data: test, error: testError } = await supabase
    .from('ticket_purchases')
    .select('count');
  
  if (testError) {
    console.log('Connection error:', testError.message);
    return;
  }
  
  console.log('Connection OK. Total ticket purchases:', test?.[0]?.count);
  
  // Check ALL tables
  console.log('\n2. Checking all tables...');
  const tables = ['ticket_purchases', 'event_registrations', 'events', 'users'];
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log('  ' + table + ': ' + (count || 0) + ' records');
  }
  
  // Check specific ticket
  console.log('\n3. Looking for Theos ticket...');
  const { data: theoUser } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('email', 'committee+clerk_test@example.com')
    .single();
  
  if (theoUser) {
    console.log('Found Theo:', theoUser.full_name, '(ID:', theoUser.id + ')');
    
    const { data: theoTicket } = await supabase
      .from('ticket_purchases')
      .select('*')
      .eq('user_id', theoUser.id)
      .eq('event_id', 4);
    
    console.log('Theos tickets for event 4:', theoTicket?.length || 0);
    if (theoTicket && theoTicket.length > 0) {
      theoTicket.forEach(t => {
        console.log('  Ticket:', t.ticket_number, '(ID:', t.id + ', Status:', t.payment_status + ')');
      });
    }
  } else {
    console.log('Theo not found in users table');
  }
}

debugDatabase().catch(console.error);