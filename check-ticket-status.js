// Check the specific ticket that's failing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkTicket() {
  const ticketId = '3c6574d9-63f1-473f-b32f-e2b2bbc46c97'
  
  console.log('🔍 Checking specific ticket:', ticketId)
  console.log('='.repeat(50))
  
  // Try the EXACT same query the API uses
  const { data, error } = await supabase
    .from('ticket_purchases')
    .select(`
      id,
      user_id,
      event_id,
      status,
      quantity,
      unit_price,
      total_price,
      events:event_id(
        id,
        title,
        max_total_guests_per_member,
        allow_guest_addition_after_purchase,
        allow_door_guest_addition,
        door_guest_price,
        event_type
      )
    `)
    .eq('id', ticketId)
    .single()
  
  if (error) {
    console.log('❌ ERROR:', error.message)
    console.log('Code:', error.code)
    console.log('Details:', error.details)
    return
  }
  
  if (!data) {
    console.log('❌ NO DATA RETURNED (ticket not found)')
    return
  }
  
  console.log('✅ Ticket found!')
  console.log('Status field:', data.status || 'NULL/UNDEFINED')
  console.log('Event:', data.events?.title)
  console.log('Event type:', data.events?.event_type)
  console.log('\n📊 Full data:')
  console.log(JSON.stringify(data, null, 2))
}

checkTicket()