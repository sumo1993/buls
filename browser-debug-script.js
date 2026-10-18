/**
 * Browser Console Debug Script for Checkin Page
 * 
 * Copy and paste this into browser console when on /secretary/events/4/checkin
 * 
 * Usage:
 * 1. Go to /secretary/events/4/checkin
 * 2. Open browser console (F12 → Console tab)
 * 3. Paste this entire script and press Enter
 */

(async function debugCheckinPage() {
  console.log('🔍 === CHECKIN PAGE DEBUG SCRIPT === 🔍\n');
  
  // Test API endpoints
  console.log('📡 Testing API endpoints...\n');
  
  const endpoints = [
    { name: 'Event details', url: '/api/events?id=4' },
    { name: 'Checkins', url: '/api/events/4/checkins' },
    { name: 'Registrations', url: '/api/event-registrations?eventId=4' }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();
      
      console.log(`  ✅ Status: ${response.status} (${response.ok ? 'OK' : 'Error'})`);
      
      if (endpoint.name === 'Registrations') {
        console.log(`  👥 Total attendees: ${data.registrations?.length || 0}`);
        
        if (data.registrations && data.registrations.length > 0) {
          const sample = data.registrations[0];
          console.log('  📋 Sample attendee structure:');
          console.log('  ', {
            type: sample.type,
            full_name: sample.full_name,
            email: sample.email,
            phone_number: sample.phone_number || sample.user?.phone_number || 'MISSING',
            passport_number: sample.passport_number || sample.user?.passport_number || 'MISSING',
            ticket_number: sample.ticket_number,
            source_type: sample.source_type,
            is_guest: sample.is_guest
          });
          
          // Check if any attendees have phone numbers
          const withPhone = data.registrations.filter(a => {
            const phone = a.phone_number || a.user?.phone_number;
            return phone && phone.trim().length > 0;
          });
          
          const withPassport = data.registrations.filter(a => {
            const passport = a.passport_number || a.user?.passport_number;
            return passport && passport.trim().length > 0;
          });
          
          console.log(`  📱 Attendees with phone numbers: ${withPhone.length}/${data.registrations.length}`);
          console.log(`  🛂 Attendees with passport numbers: ${withPassport.length}/${data.registrations.length}`);
          
          if (withPhone.length === 0) {
            console.log('  ❗ No phone numbers found in data - database schema issue!');
            console.log('  Solution: Run ADD_MISSING_COLUMNS_MIGRATION.sql in Supabase');
          }
        } else {
          console.log('  ⚠️ No attendees found');
          console.log('  Possible issues:');
          console.log('  1. No data for event 4 in database');
          console.log('  2. User permissions issue');
          console.log('  3. Database schema mismatch');
        }
      }
      
      if (!response.ok) {
        console.log(`  ❌ Error: ${data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Fetch error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test search logic
  console.log('🔍 Testing search logic...\n');
  
  // Get current search term from page
  const searchInput = document.querySelector('input[placeholder*="Search by name"]');
  const currentSearch = searchInput ? searchInput.value : '';
  
  if (currentSearch) {
    console.log(`Current search term: "${currentSearch}"`);
    
    // Get attendees data from page (if available)
    const pageScript = document.querySelector('script');
    if (pageScript && pageScript.textContent.includes('attendees')) {
      console.log('Page state found - checking search logic...');
    }
  }
  
  // Add helper functions to window for testing
  window.testSearch = function(searchTerm) {
    console.log(`\n🧪 Testing search for "${searchTerm}":`);
    
    fetch('/api/event-registrations?eventId=4')
      .then(r => r.json())
      .then(data => {
        if (!data.registrations) {
          console.log('  ❌ No data available');
          return;
        }
        
        // Use same logic as page
        const attendees = data.registrations;
        const search = searchTerm.toLowerCase().trim();
        
        // Helper functions
        const getFullName = (a) => a.full_name || a.user?.full_name || '';
        const getEmail = (a) => a.email || a.user?.email || '';
        const getPhone = (a) => a.phone_number || a.user?.phone_number || '';
        const getPassport = (a) => a.passport_number || a.user?.passport_number || '';
        
        const formatTicketNumber = (ticketNumber, purchaseId) => {
          if (!ticketNumber && !purchaseId) return '';
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
        
        const filtered = attendees.filter(a => {
          if (!search) return true;
          
          // Name
          if (getFullName(a).toLowerCase().includes(search)) return true;
          
          // Email
          if (getEmail(a).toLowerCase().includes(search)) return true;
          
          // Phone
          const phone = getPhone(a);
          if (phone) {
            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.includes(cleanSearch)) return true;
          }
          
          // Passport
          const passport = getPassport(a);
          if (passport && passport.toLowerCase().includes(search)) return true;
          
          // Ticket number
          if (a.type === 'ticket') {
            const formattedTicket = formatTicketNumber(a.ticket_number, a.id).toLowerCase();
            const numericPart = formattedTicket.replace('tkt', '');
            
            if (formattedTicket.includes(search)) return true;
            if (numericPart.includes(search)) return true;
            
            if (search.length >= 3) {
              const last3 = numericPart.slice(-3);
              if (last3 === search || numericPart.includes(search)) return true;
            }
          }
          
          return false;
        });
        
        console.log(`  Found ${filtered.length} matches out of ${attendees.length} total`);
        
        if (filtered.length > 0) {
          console.log('  Matches:');
          filtered.slice(0, 3).forEach((match, i) => {
            console.log(`  ${i + 1}. ${getFullName(match)} (${match.type})`);
            console.log(`     Phone: ${getPhone(match) || 'none'}`);
            console.log(`     Passport: ${getPassport(match) || 'none'}`);
            console.log(`     Ticket: ${match.ticket_number || 'none'}`);
          });
          
          if (filtered.length > 3) {
            console.log(`  ... and ${filtered.length - 3} more`);
          }
        } else {
          console.log('  No matches found');
          console.log('  Possible reasons:');
          console.log('  1. No data matches search term');
          console.log('  2. Phone/passport columns missing in database');
          console.log('  3. Search term format mismatch');
        }
      })
      .catch(err => console.error('  ❌ Error:', err));
  };
  
  console.log('✅ Debug functions added:');
  console.log('   - window.testSearch("search term") - Test search logic');
  
  console.log('\n📋 Quick Tests:');
  console.log('   testSearch("7054636640") - Search by phone');
  console.log('   testSearch("640") - Search by ticket number');
  console.log('   testSearch("john") - Search by name');
  
  console.log('\n🔧 If search returns 0 results:');
  console.log('   1. Check API response for phone/passport data');
  console.log('   2. Verify database migration was run');
  console.log('   3. Add test data to users table');
  
  console.log('\n🔍 === DEBUG SCRIPT COMPLETE === 🔍');
})();

// Add this to run immediately
debugCheckinPage();