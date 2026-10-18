// Simple script to check events
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('Supabase Key:', supabaseKey ? '✓ Set' : '✗ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.log('Check .env.local file for:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL');
  console.log('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
  console.log('\nChecking events...');
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date')
      .order('id', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No events found in database.');
      console.log('\nYou need to create events first.');
      return;
    }

    console.log(`Found ${data.length} event(s):`);
    console.log('--------------------------------');
    data.forEach(event => {
      console.log(`ID: ${event.id} | Title: "${event.title}" | Date: ${event.event_date}`);
    });
    console.log('--------------------------------');

    // Suggest which event ID to use
    const firstEventId = data[0].id;
    console.log(`\nTo fix the "No attendees yet" issue:`);
    console.log(`1. You're likely viewing event ID: ${firstEventId}`);
    console.log(`2. Run the SQL script: ADD_TEST_CHECKIN_DATA.sql`);
    console.log(`3. Change "event_id = 4" to "event_id = ${firstEventId}" in the script`);
    console.log(`\nOr use the web interface to:`);
    console.log(`1. Create ticket purchases for event ${firstEventId}`);
    console.log(`2. Create event registrations`);
    console.log(`\nThen refresh the check-in page.`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkEvents();