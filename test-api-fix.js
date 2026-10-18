// Test script to verify the API fix
// Run this in browser console when on the checkin page

async function testApiFix() {
  console.log('Testing API fix for /secretary/events/4/checkin...')
  
  try {
    // Test 1: Check event-registrations API
    console.log('\n1. Testing /api/event-registrations?eventId=4')
    const regResponse = await fetch('/api/event-registrations?eventId=4')
    const regData = await regResponse.json()
    
    console.log('Status:', regResponse.status)
    console.log('Response:', regData)
    
    if (regData.registrations && regData.registrations.length > 0) {
      const sample = regData.registrations[0]
      console.log('Sample attendee:')
      console.log('- Has full_name:', 'full_name' in sample, 'Value:', sample.full_name)
      console.log('- Has email:', 'email' in sample, 'Value:', sample.email)
      console.log('- Has type:', 'type' in sample, 'Value:', sample.type)
      console.log('- Has user_id:', 'user_id' in sample, 'Value:', sample.user_id)
      
      // Check if nested user object exists
      console.log('- Has nested user object:', 'user' in sample)
      if (sample.user) {
        console.log('  Nested user has full_name:', 'full_name' in sample.user)
      }
    }
    
    // Test 2: Check events API
    console.log('\n2. Testing /api/events?id=4')
    const eventResponse = await fetch('/api/events?id=4')
    const eventData = await eventResponse.json()
    console.log('Status:', eventResponse.status)
    console.log('Event data:', eventData.event ? 'Found' : 'Not found')
    
    // Test 3: Check checkins API
    console.log('\n3. Testing /api/events/4/checkins')
    const checkinsResponse = await fetch('/api/events/4/checkins')
    const checkinsData = await checkinsResponse.json()
    console.log('Status:', checkinsResponse.status)
    console.log('Checkins data:', checkinsData)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Also test the page's fetchData function
async function testPageFetch() {
  console.log('\nTesting page fetchData function...')
  
  // Simulate what the page does
  const eventId = '4'
  
  try {
    const responses = await Promise.all([
      fetch(`/api/events?id=${eventId}`),
      fetch(`/api/events/${eventId}/checkins`),
      fetch(`/api/event-registrations?eventId=${eventId}`)
    ])
    
    const [eventRes, checkinsRes, registrationsRes] = responses
    const [eventData, checkinsData, registrationsData] = await Promise.all([
      eventRes.json(),
      checkinsRes.json(),
      registrationsRes.json()
    ])
    
    console.log('Events API OK:', eventRes.ok)
    console.log('Checkins API OK:', checkinsRes.ok)
    console.log('Registrations API OK:', registrationsRes.ok)
    
    if (registrationsData.registrations) {
      console.log(`Found ${registrationsData.registrations.length} attendees`)
      
      // Check data structure
      const hasFullName = registrationsData.registrations.every(a => a.full_name)
      const hasEmail = registrationsData.registrations.every(a => a.email)
      const hasType = registrationsData.registrations.every(a => a.type)
      const hasUserId = registrationsData.registrations.every(a => a.user_id)
      
      console.log('All attendees have full_name:', hasFullName)
      console.log('All attendees have email:', hasEmail)
      console.log('All attendees have type:', hasType)
      console.log('All attendees have user_id:', hasUserId)
    }
    
  } catch (error) {
    console.error('Page fetch error:', error)
  }
}

console.log('Run testApiFix() or testPageFetch() to test the fix')