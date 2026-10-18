// Check what data exists for event 6
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkEventData() {
  console.log('🔍 Checking data for event 6')
  console.log('============================')
  
  try {
    // 1. Check event
    const { data: event } = await supabase
      .from('events')
      .select('id, title, event_type')
      .eq('id', 6)
      .single()
    
    console.log('📅 Event:', event)
    
    // 2. Check event registrations
    const { data: registrations } = await supabase
      .from('event_registrations')
      .select('*, users!inner(full_name, email)')
      .eq('event_id', 6)
    
    console.log(`\n📋 Event registrations: ${registrations?.length || 0}`)
    if (registrations && registrations.length > 0) {
      registrations.forEach((reg, i) => {
        console.log(`  ${i + 1}. ${reg.users.full_name} - ${reg.status}`)
      })
    }
    
    // 3. Check ticket purchases
    const { data: tickets } = await supabase
      .from('ticket_purchases')
      .select('*, users!inner(full_name, email)')
      .eq('event_id', 6)
    
    console.log(`\n🎫 Ticket purchases: ${tickets?.length || 0}`)
    if (tickets && tickets.length > 0) {
      tickets.forEach((ticket, i) => {
        console.log(`  ${i + 1}. ${ticket.users.full_name} - ${ticket.ticket_number} - ${ticket.payment_status}`)
      })
    }
    
    // 4. Total attendees
    const totalAttendees = (registrations?.length || 0) + (tickets?.length || 0)
    console.log(`\n👥 Total attendees for event 6: ${totalAttendees}`)
    
    if (totalAttendees === 0) {
      console.log('\n⚠️ Still no attendees! The checkin page will show "No attendees yet"')
      console.log('💡 Try running: node add-test-data.js again')
    } else {
      console.log('\n✅ Great! The checkin page should now show attendees')
      console.log('💡 Refresh http://localhost:3000/secretary/events/6/checkin')
    }
    
  } catch (error) {
    console.error('Error checking data:', error.message)
  }
}

checkEventData()