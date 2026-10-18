// Test script to check API response for event registrations
// Run with: node test-api-response.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  console.log('🔍 Testing API response for event registrations...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/event-registrations?eventId=4');
    const data = await response.json();
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Response OK:', response.ok);
    
    if (response.ok) {
      console.log('\n📊 Stats:');
      console.log('- Total registrations:', data.registrations?.length || 0);
      console.log('- Free registrations:', data.stats?.free_registrations || 0);
      console.log('- Ticket purchasers:', data.stats?.ticket_purchasers || 0);
      console.log('- Guests:', data.stats?.guests || 0);
      
      if (data.registrations && data.registrations.length > 0) {
        console.log('\n📋 Sample Attendee (first):');
        const first = data.registrations[0];
        console.log('- Type:', first.type);
        console.log('- Full Name:', first.full_name);
        console.log('- Email:', first.email);
        console.log('- Phone:', first.phone_number);
        console.log('- Passport:', first.passport_number);
        console.log('- Ticket Number:', first.ticket_number);
        console.log('- Source Type:', first.source_type);
        console.log('- Guest:', first.is_guest ? 'Yes' : 'No');
        console.log('- Guest of:', first.guest_of);
        
        console.log('\n🔍 All Attendee Types:');
        const types = {};
        data.registrations.forEach(attendee => {
          const type = attendee.type || 'unknown';
          types[type] = (types[type] || 0) + 1;
        });
        console.log('- Types:', types);
        
        console.log('\n🔍 Check for phone number "7054636640":');
        const phoneMatch = data.registrations.filter(a => {
          const phone = a.phone_number || a.user?.phone_number;
          return phone && phone.includes('7054636640');
        });
        console.log(`- Found ${phoneMatch.length} matches`);
        
        console.log('\n🔍 Check for "640" in ticket numbers:');
        const ticket640 = data.registrations.filter(a => {
          return a.ticket_number && a.ticket_number.includes('640');
        });
        console.log(`- Found ${ticket640.length} matches`);
      } else {
        console.log('\n⚠️ No registrations found for event 4');
        console.log('Possible issues:');
        console.log('1. No data exists in database for event 4');
        console.log('2. API not fetching all attendee types properly');
        console.log('3. Check database schema for missing columns');
      }
    } else {
      console.log('\n❌ API Error:', data.error);
      console.log('Details:', data.details || 'No details');
    }
  } catch (error) {
    console.error('\n❌ Fetch error:', error.message);
    console.log('\nIs the development server running? Start with:');
    console.log('cd buls-main && npm run dev');
  }
}

// Also create a function to test search logic
function testSearchLogic() {
  console.log('\n🔍 Testing Search Logic:');
  
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
  
  const testAttendeeWithNested = {
    id: 2,
    event_id: 4,
    user_id: 'test-user-456',
    user: {
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      phone_number: '7054636641',
      passport_number: 'CD789012'
    },
    ticket_number: 'TKT0000000641',
    type: 'ticket',
    status: 'confirmed'
  };
  
  // Helper functions from the checkin page
  const getFullName = (attendee) => {
    return attendee.full_name || attendee.user?.full_name || 'Unknown User';
  };
  
  const getEmail = (attendee) => {
    return attendee.email || attendee.user?.email || 'unknown@example.com';
  };
  
  const getPhoneNumber = (attendee) => {
    return attendee.phone_number || attendee.user?.phone_number || null;
  };
  
  const getPassportNumber = (attendee) => {
    return attendee.passport_number || attendee.user?.passport_number || null;
  };
  
  const formatTicketNumber = (ticketNumber, purchaseId) => {
    if (!ticketNumber && !purchaseId) return 'N/A';
    
    if (ticketNumber && ticketNumber.toUpperCase().startsWith('TKT')) {
      return ticketNumber.toUpperCase();
    }
    
    let numericPart = '';
    if (ticketNumber) {
      numericPart = ticketNumber.replace(/[^0-9]/g, '');
    } else if (purchaseId) {
      numericPart = purchaseId.toString().replace(/[^0-9]/g, '');
    }
    
    numericPart = numericPart.slice(0, 10).padStart(10, '0');
    return `TKT${numericPart}`;
  };
  
  const testSearch = (attendee, searchTerm) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    
    // Name search
    const fullName = getFullName(attendee);
    if (fullName.toLowerCase().includes(search)) return true;
    
    // Email search
    const email = getEmail(attendee);
    if (email.toLowerCase().includes(search)) return true;
    
    // Phone number search
    const phoneNumber = getPhoneNumber(attendee);
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.includes(cleanSearch)) return true;
    }
    
    // Passport search
    const passportNumber = getPassportNumber(attendee);
    if (passportNumber?.toLowerCase().includes(search)) return true;
    
    // Ticket number search
    if (attendee.type === 'ticket') {
      const formattedTicket = formatTicketNumber(attendee.ticket_number, attendee.id).toLowerCase();
      const numericPart = formattedTicket.replace('tkt', '');
      
      if (formattedTicket.includes(search)) return true;
      if (numericPart.includes(search)) return true;
      
      if (search.length >= 3) {
        const last3 = numericPart.slice(-3);
        if (last3 === search || numericPart.includes(search)) return true;
      }
    }
    
    return false;
  };
  
  console.log('1. Test search for "7054636640":', testSearch(testAttendee, '7054636640'));
  console.log('2. Test search for "640":', testSearch(testAttendee, '640'));
  console.log('3. Test search for "john":', testSearch(testAttendee, 'john'));
  console.log('4. Test nested search for "7054636641":', testSearch(testAttendeeWithNested, '7054636641'));
  console.log('5. Test search for "CD789012":', testSearch(testAttendeeWithNested, 'CD789012'));
}

if (require.main === module) {
  testAPI();
  testSearchLogic();
}

module.exports = { testAPI, testSearchLogic };