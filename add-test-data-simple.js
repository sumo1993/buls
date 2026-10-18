const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addTestData() {
  console.log('🚀 Adding test data for event 6 check-in')
  console.log('========================================')
  
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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', 6)
      .maybeSingle()
    
    if (eventError) {
      console.error('Error checking event:', eventError)
      return
    }
    
    if (!event) {
      console.log('⚠️ Event 6 not found, creating a test event...')
      // Create a test event
      const { data: newEvent, error: createEventError } = await supabase
        .from('events')
        .insert({
          id: 6,
          title: 'Test Event 6 for Check-in',
          description: 'Test event for check-in functionality testing',
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          event_type: 'ticket_only',
          max_total_guests_per_member: 5,
          allow_door_guest_addition: true,
          door_guest_price: 25.00
        })
        .select()
        .single()
      
      if (createEventError) {
        console.error('Error creating event:', createEventError)
        return
      }
      
      console.log('✅ Created test event:', newEvent.title)
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
          console.error(`Error adding registration for ${user.full_name}:`, regError)
        }
      } else if (reg) {
        registrations.push(reg)
        console.log(`✅ Added registration for ${user.full_name}`)
      }
    }
    
    // 4. Add ticket purchases
    console.log('\n📋 Step 4: Adding ticket purchases...')
    const ticketPurchases = []
    for (const user of users.slice(0, 2)) { // First 2 users get ticket purchases
      const { data: ticket, error: ticketError } = await supabase
        .from('ticket_purchases')
        .insert({
          event_id: 6,
          user_id: user.id,
          ticket_number: `TKT-${String(user.id).padStart(6, '0')}-640`,
          quantity: 1,
          total_price: 50.00,
          payment_status: 'paid',
          status: 'approved'
        })
        .select()
        .maybeSingle()
      
      if (ticketError) {
        if (ticketError.code === '23505') {
          console.log(`⚠️ Ticket purchase already exists for ${user.full_name}`)
        } else {
          console.error(`Error adding ticket for ${user.full_name}:`, ticketError)
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
      .select('*, users!inner(full_name, email)')
      .eq('event_id', 6)
    
    console.log(`📊 Event registrations for event 6: ${finalRegs?.length || 0}`)
    
    // Check ticket purchases
    const { data: finalTickets } = await supabase
      .from('ticket_purchases')
      .select('*, users!inner(full_name, email)')
      .eq('event_id', 6)
    
    console.log(`🎫 Ticket purchases for event 6: ${finalTickets?.length || 0}`)
    
    // 6. Summary
    console.log('\n✨ SUMMARY')
    console.log('==========')
    console.log(`✅ Users processed: ${users.length}`)
    console.log(`✅ Event registrations added: ${registrations.length}`)
    console.log(`✅ Ticket purchases added: ${ticketPurchases.length}`)
    console.log(`📋 Total attendees for event 6: ${(finalRegs?.length || 0) + (finalTickets?.length || 0)}`)
    
    if (ticketPurchases.length > 0) {
      console.log('\n🎫 Ticket numbers added:')
      ticketPurchases.forEach(ticket => {
        console.log(`   - ${ticket.ticket_number}`)
      })
      console.log('\n💡 Search for "640" on the check-in page to test ticket number search')
    }
    
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh http://localhost:3000/secretary/events/6/checkin')
    console.log('   2. You should now see attendees in the list')
    console.log('   3. Try checking in attendees using the Check In buttons')
    
  } catch (error) {
    console.error('❌ Error adding test data:', error)
  }
}

addTestData()