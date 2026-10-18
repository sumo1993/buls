// Simple script to add test data using the existing Supabase configuration
// This script reads environment variables directly

const { createClient } = require('@supabase/supabase-js')

// Read environment variables directly from the environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDYxMjQ5NSwiZXhwIjoyMTA2MTg4NDk1fQ.__qrZBgPjyVt0VaXzuEG_ziXNjc9JGqQPnSmp4DO3hA'

console.log('🚀 Adding test data for event 6 check-in')
console.log('========================================')
console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
console.log('Service role key:', supabaseKey ? '✓ Set (first 10 chars: ' + supabaseKey.substring(0, 10) + '...)' : '✗ Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addTestData() {
  try {
    // 1. Get existing users
    console.log('\n📋 Step 1: Fetching existing users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .limit(3)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    if (!users || users.length === 0) {
      console.error('❌ No users found in database')
      return
    }
    
    console.log(`✅ Found ${users.length} users:`, users.map(u => u.full_name))
    
    // 2. Check if event 6 exists
    console.log('\n📋 Step 2: Checking event 6...')
    const { data: event } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', 6)
      .maybeSingle()
    
    if (!event) {
      console.log('⚠️ Event 6 not found, but that\'s OK - we\'ll add data anyway')
    } else {
      console.log('✅ Event found:', event.title)
    }
    
    // 3. Add event registrations
    console.log('\n📋 Step 3: Adding event registrations...')
    const registrations = []
    for (const user of users.slice(0, 2)) { // First 2 users get registrations
      const { data: reg, error: regError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: 6,
          user_id: user.id,
          status: 'registered',
          notes: 'Test registration for event 6'
        })
        .select()
        .maybeSingle()
      
      if (regError) {
        if (regError.code === '23505') {
          console.log(`⚠️ Registration already exists for ${user.full_name}`)
        } else {
          console.error(`Error adding registration for ${user.full_name}:`, regError.message)
        }
      } else if (reg) {
        registrations.push(reg)
        console.log(`✅ Added registration for ${user.full_name}`)
      }
    }
    
    // 4. Add ticket purchases (with ticket numbers ending in 640 for testing)
    console.log('\n📋 Step 4: Adding ticket purchases...')
    const ticketPurchases = []
    const ticketNumbers = ['TKT001640', 'TKT002640'] // Test ticket numbers ending in 640
    
    for (let i = 0; i < Math.min(2, users.length); i++) {
      const user = users[i]
      const ticketNumber = ticketNumbers[i] || `TKT${String(user.id).padStart(6, '0')}640`
      
      const { data: ticket, error: ticketError } = await supabase
        .from('ticket_purchases')
        .insert({
          event_id: 6,
          user_id: user.id,
          ticket_number: ticketNumber,
          quantity: 1,
          total_price: 50.00,
          payment_status: 'paid'
        })
        .select()
        .maybeSingle()
      
      if (ticketError) {
        if (ticketError.code === '23505') {
          console.log(`⚠️ Ticket purchase already exists for ${user.full_name}`)
        } else {
          console.error(`Error adding ticket for ${user.full_name}:`, ticketError.message)
        }
      } else if (ticket) {
        ticketPurchases.push(ticket)
        console.log(`✅ Added ticket purchase for ${user.full_name} (Ticket: ${ticket.ticket_number})`)
      }
    }
    
    // 5. Verify data
    console.log('\n📋 Step 5: Verifying data...')
    
    // Check registrations
    const { data: finalRegs } = await supabase
      .from('event_registrations')
      .select('count')
      .eq('event_id', 6)
    
    console.log(`📊 Event registrations for event 6: ${finalRegs?.length || 0}`)
    
    // Check ticket purchases
    const { data: finalTickets } = await supabase
      .from('ticket_purchases')
      .select('ticket_number')
      .eq('event_id', 6)
    
    console.log(`🎫 Ticket purchases for event 6: ${finalTickets?.length || 0}`)
    
    // 6. Summary
    console.log('\n✨ SUMMARY')
    console.log('==========')
    console.log(`✅ Users found: ${users.length}`)
    console.log(`✅ Event registrations added: ${registrations.length}`)
    console.log(`✅ Ticket purchases added: ${ticketPurchases.length}`)
    
    if (finalTickets && finalTickets.length > 0) {
      console.log('\n🎫 Ticket numbers added:')
      finalTickets.forEach(ticket => {
        console.log(`   - ${ticket.ticket_number}`)
      })
    }
    
    console.log('\n💡 Search tips for check-in page:')
    console.log('   - Search for "640" to test ticket number search')
    console.log('   - Search by user name or email')
    console.log('   - Try checking in attendees using the Check In buttons')
    
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh http://localhost:3000/secretary/events/6/checkin')
    console.log('   2. You should now see attendees in the list')
    console.log('   3. The "No attendees yet" message should be gone')
    
  } catch (error) {
    console.error('❌ Error adding test data:', error.message)
  }
}

addTestData()