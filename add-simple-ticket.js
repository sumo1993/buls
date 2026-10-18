// Simple script to add one ticket purchase with minimal fields
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addSimpleTicket() {
  console.log('🎫 Adding simple ticket purchase...')
  
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
    
    // Try to add ticket purchase with minimal fields
    // First, let's see what the table structure is
    const { data: tableInfo, error: infoError } = await supabase
      .from('ticket_purchases')
      .select('*')
      .limit(1)
    
    if (infoError) {
      console.error('Error checking table:', infoError.message)
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('Existing ticket purchase columns:', Object.keys(tableInfo[0]))
    }
    
    // Try inserting with just required fields
    const ticketData = {
      event_id: 6,
      user_id: user.id,
      ticket_number: 'TKT001640',
      quantity: 1,
      total_price: 50.00,
      payment_status: 'paid'
    }
    
    console.log('Attempting to insert:', ticketData)
    
    const { data: ticket, error: insertError } = await supabase
      .from('ticket_purchases')
      .insert(ticketData)
      .select()
    
    if (insertError) {
      console.error('Insert error:', insertError.message)
      console.error('Error details:', insertError)
      
      // Maybe try with a generated UUID for ticket_id
      const { v4: uuidv4 } = require('uuid')
      ticketData.ticket_id = uuidv4()
      
      console.log('Trying with generated ticket_id:', ticketData.ticket_id)
      
      const { data: ticket2, error: insertError2 } = await supabase
        .from('ticket_purchases')
        .insert(ticketData)
        .select()
      
      if (insertError2) {
        console.error('Second insert error:', insertError2.message)
      } else {
        console.log('✅ Success! Added ticket:', ticket2)
      }
    } else {
      console.log('✅ Success! Added ticket:', ticket)
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Check if uuid is available
try {
  require('uuid')
  addSimpleTicket()
} catch (e) {
  console.log('UUID not available, trying without...')
  addSimpleTicket()
}