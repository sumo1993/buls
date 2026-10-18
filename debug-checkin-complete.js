// Complete debug script for checkin page
// Run in browser console when on /secretary/events/4/checkin

async function debugCheckinComplete() {
  console.log('🔍 === COMPLETE CHECKIN DEBUG === 🔍');
  
  try {
    // 1. Test all API endpoints
    console.log('\n📡 1. TESTING ALL API ENDPOINTS:');
    
    const endpoints = [
      { name: 'Event details', url: '/api/events?id=4' },
      { name: 'Checkins', url: '/api/events/4/checkins' },
      { name: 'Registrations', url: '/api/event-registrations?eventId=4' }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n   Testing: ${endpoint.name}`);
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log(`   OK: ${response.ok}`);
        
        if (response.ok) {
          if (endpoint.name === 'Registrations') {
            console.log(`   Registrations count: ${data.registrations?.length || 0}`);
            if (data.registrations && data.registrations.length > 0) {
              console.log('   Sample registration:', data.registrations[0]);
              console.log('   Has full_name:', 'full_name' in data.registrations[0]);
              console.log('   Has email:', 'email' in data.registrations[0]);
              console.log('   Has type:', 'type' in data.registrations[0]);
              console.log('   Has user:', 'user' in data.registrations[0]);
              if (data.registrations[0].user) {
                console.log('   User has full_name:', 'full_name' in data.registrations[0].user);
              }
            }
          }
        } else {
          console.log('   Error:', data.error);
        }
      } catch (error) {
        console.log(`   Fetch error: ${error.message}`);
      }
    }
    
    // 2. Check page state
    console.log('\n📄 2. CHECKING PAGE STATE:');
    
    // Try to access page variables
    try {
      // Get React component state (might not be accessible directly)
      console.log('   Looking for React component...');
      
      // Check if we can find the search input
      const searchInput = document.querySelector('input[placeholder*="Search by name"]');
      console.log('   Search input found:', !!searchInput);
      if (searchInput) {
        console.log('   Search value:', searchInput.value);
      }
      
      // Check if table exists
      const table = document.querySelector('table');
      console.log('   Table found:', !!table);
      
      // Check for loading state
      const loadingElements = document.querySelectorAll('.animate-spin, [class*="Loader"]');
      console.log('   Loading indicators:', loadingElements.length);
      
    } catch (error) {
      console.log('   Cannot access page state:', error.message);
    }
    
    // 3. Test search logic
    console.log('\n🔎 3. TESTING SEARCH LOGIC:');
    
    // Create a test attendee object
    const testAttendee = {
      id: 1,
      event_id: 4,
      user_id: 'test-user-123',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone_number: '7054636640',
      passport_number: 'AB123456',
      ticket_number: 'TKT0000000640',
      type: 'ticket',
      status: 'confirmed'
    };
    
    // Test the search filter logic from the page
    const testSearch = (attendee, searchTerm) => {
      const search = searchTerm.toLowerCase().trim();
      if (!search) return true;
      
      // Name search
      const fullName = attendee.full_name || attendee.user?.full_name || '';
      if (fullName.toLowerCase().includes(search)) {
        return true;
      }
      
      // Email search
      const email = attendee.email || attendee.user?.email || '';
      if (email.toLowerCase().includes(search)) {
        return true;
      }
      
      // Ticket number search (for ticket purchases)
      if (attendee.type === 'ticket') {
        const formattedTicket = (attendee.ticket_number || '').toLowerCase();
        if (formattedTicket.includes(search)) {
          return true;
        }
        
        // Search by numeric part
        const numericPart = formattedTicket.replace('tkt', '');
        if (numericPart.includes(search)) {
          return true;
        }
        
        // Last 3 digits
        if (search.length >= 3) {
          const last3 = numericPart.slice(-3);
          if (last3 === search || numericPart.includes(search)) {
            return true;
          }
        }
      }
      
      // Phone number search
      const phoneNumber = attendee.phone_number || attendee.user?.phone_number || '';
      if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
        const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
        if (cleanPhone.includes(cleanSearch)) {
          return true;
        }
      }
      
      // Passport search
      const passportNumber = attendee.passport_number || attendee.user?.passport_number || '';
      if (passportNumber.toLowerCase().includes(search)) {
        return true;
      }
      
      return false;
    };
    
    console.log('   Testing search for "7054636640":', testSearch(testAttendee, '7054636640'));
    console.log('   Testing search for "640":', testSearch(testAttendee, '640'));
    console.log('   Testing search for "john":', testSearch(testAttendee, 'john'));
    console.log('   Testing search for "example":', testSearch(testAttendee, 'example'));
    
    // 4. Manual API test with different search terms
    console.log('\n🔧 4. MANUAL DATA TEST:');
    
    console.log('   To manually test, run in console:');
    console.log(`
      // Test API response
      fetch('/api/event-registrations?eventId=4')
        .then(r => r.json())
        .then(data => {
          console.log('Total registrations:', data.registrations?.length);
          console.log('All registrations:', data.registrations);
          
          // Test if any have phone number 7054636640
          const withPhone = data.registrations?.filter(a => {
            const phone = a.phone_number || a.user?.phone_number;
            return phone && phone.includes('7054636640');
          });
          console.log('With phone 7054636640:', withPhone);
          
          // Test if any have "640" in ticket number
          const with640 = data.registrations?.filter(a => {
            return a.ticket_number && a.ticket_number.includes('640');
          });
          console.log('With 640 in ticket:', with640);
        });
    `);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log('\n🔍 === DEBUG COMPLETE === 🔍');
  console.log('\nNext steps:');
  console.log('1. Check if data exists in database for event 4');
  console.log('2. Check API response structure');
  console.log('3. Verify search logic matches data structure');
  console.log('4. Test with known search terms like "640"');
}

// Also add a quick test function
function quickTest() {
  console.log('🚀 Quick test: Checking API response...');
  fetch('/api/event-registrations?eventId=4')
    .then(r => r.json())
    .then(data => {
      console.log('API Response:', data);
      console.log('Registrations count:', data.registrations?.length || 0);
      if (data.registrations && data.registrations.length > 0) {
        console.log('First registration:', data.registrations[0]);
        console.log('Keys:', Object.keys(data.registrations[0]));
      }
    })
    .catch(err => console.error('Fetch error:', err));
}

console.log('Run debugCheckinComplete() for full debug or quickTest() for quick check');