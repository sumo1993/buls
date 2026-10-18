// Add proper ticket purchase with all required fields
const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addProperTicket() {
  console.log('🎫 Adding proper ticket purchase...')
  
  try {
    // Get one user
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.error('No users found')
      return
    }
    
    const user = users[0]
    console.log(`Using user: ${user.full_name} (ID: ${user.id})`)
    
    // Create proper ticket data
    const ticketData = {
      id: uuidv4(), // This is the main ID
      ticket_id: uuidv4(), // This is ticket_id column
      event_id: 6,
      user_id: user.id,
      ticket_number: 'TKT001640', // Test ticket number ending in 640
      quantity: 1,
      unit_price: 50.00,
      total_price: 50.00,
      payment_status: 'paid',
      payment_method: 'cash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Inserting ticket with data:', JSON.stringify(ticketData, null, 2))
    
    const { data: ticket, error: insertError } = await supabase
      .from('ticket_purchases')
      .insert(ticketData)
      .select()
    
    if (insertError) {
      console.error('❌ Insert error:', insertError.message)
      console.error('Error details:', insertError)
    } else {
      console.log('✅ Success! Added ticket purchase:', ticket)
      console.log('\n🎫 Ticket added successfully!')
      console.log(`   Ticket number: ${ticketData.ticket_number}`)
      console.log(`   User: ${user.full_name}`)
      console.log(`   Event ID: 6`)
      console.log('\n💡 Now you can:')
      console.log('   1. Refresh http://localhost:3000/secretary/events/6/checkin')
      console.log('   2. Search for "640" to find the ticket')
      console.log('   3. Try checking in the attendee')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addProperTicket()