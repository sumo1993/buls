require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkEventPrice() {
  try {
    // Check event 6 details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', 6)
      .single()
    
    if (eventError) throw eventError
    
    console.log('Event 6 Details:')
    console.log('- Title:', event.title)
    console.log('- Event Type:', event.event_type)
    console.log('- Door Guest Price:', event.door_guest_price)
    console.log('- Ticket Price:', event.ticket_price)
    
    // Check ticket purchases for event 6
    const { data: tickets, error: ticketsError } = await supabase
      .from('ticket_purchases')
      .select('id, unit_price, total_price, quantity')
      .eq('event_id', 6)
    
    if (ticketsError) throw ticketsError
    
    console.log('\nTicket Purchases for Event 6:')
    tickets.forEach(ticket => {
      console.log(`- Ticket ID ${ticket.id}: unit_price=¥${ticket.unit_price}, total=¥${ticket.total_price}, qty=${ticket.quantity}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkEventPrice()
