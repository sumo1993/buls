// Simple check: what ticket purchases exist?
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkTickets() {
  console.log('🎫 Checking ALL ticket purchases in database:')
  console.log('='.repeat(50))
  
  const { data: tickets, error } = await supabase
    .from('ticket_purchases')
    .select('id, ticket_id, ticket_number, event_id, user_id, payment_status, unit_price, total_price')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  if (!tickets || tickets.length === 0) {
    console.log('❌ NO TICKET PURCHASES FOUND!')
    console.log('This is why you get "Ticket purchase not found"')
    return
  }
  
  console.log(`✅ Found ${tickets.length} ticket purchases:\n`)
  
  tickets.forEach((ticket, i) => {
    console.log(`${i + 1}. Ticket Purchase:`)
    console.log(`   ID: ${ticket.id}`)
    console.log(`   Event ID: ${ticket.event_id}`)
    console.log(`   User ID: ${ticket.user_id}`)
    console.log(`   Ticket Number: ${ticket.ticket_number}`)
    console.log(`   Price: ¥${ticket.unit_price} (total: ¥${ticket.total_price})`)
    console.log(`   Status: ${ticket.payment_status}`)
    console.log('')
  })
  
  console.log('💡 When you click the 👤 icon, it should pass one of these IDs')
  console.log('   If the ID doesn\'t match, you get "Ticket purchase not found"')
}

checkTickets()