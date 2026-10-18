// Check if the specific ticket purchase exists
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTicketExists() {
  const ticketPurchaseId = '3c6574d9-63f1-473f-b32f-e2b2bbc46c97'
  console.log(`🔍 Checking if ticket purchase exists: ${ticketPurchaseId}`)
  
  try {
    // Check by id (UUID field)
    const { data: byId, error: idError } = await supabase
      .from('ticket_purchases')
      .select('id, ticket_id, ticket_number, event_id, user_id')
      .eq('id', ticketPurchaseId)
      .maybeSingle()
    
    if (idError) {
      console.error('Error checking by id:', idError.message)
    } else if (byId) {
      console.log('✅ Found by id:', byId)
      return
    }
    
    // Check by ticket_id field
    const { data: byTicketId, error: ticketIdError } = await supabase
      .from('ticket_purchases')
      .select('id, ticket_id, ticket_number, event_id, user_id')
      .eq('ticket_id', ticketPurchaseId)
      .maybeSingle()
    
    if (ticketIdError) {
      console.error('Error checking by ticket_id:', ticketIdError.message)
    } else if (byTicketId) {
      console.log('✅ Found by ticket_id:', byTicketId)
      return
    }
    
    // Check all ticket purchases to see structure
    const { data: allTickets, error: allError } = await supabase
      .from('ticket_purchases')
      .select('id, ticket_id, ticket_number')
      .limit(5)
    
    if (allError) {
      console.error('Error checking all tickets:', allError.message)
    } else if (allTickets && allTickets.length > 0) {
      console.log('📋 Sample ticket purchases:')
      allTickets.forEach(ticket => {
        console.log(`  - ID: ${ticket.id}, Ticket ID: ${ticket.ticket_id}, Number: ${ticket.ticket_number}`)
      })
    } else {
      console.log('📭 No ticket purchases found in database')
    }
    
    console.log(`\n❌ Ticket purchase ${ticketPurchaseId} NOT FOUND`)
    console.log('💡 This explains the "Ticket purchase not found" error')
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkTicketExists()