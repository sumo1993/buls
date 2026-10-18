// Debug script for phone search issue
// Run in browser console on the checkin page

async function debugPhoneSearch() {
  console.log('🔍 DEBUGGING PHONE SEARCH ISSUE\n');
  
  // 1. Get API data
  console.log('1️⃣ Fetching API data...');
  const response = await fetch('/api/event-registrations?eventId=4');
  const data = await response.json();
  
  console.log(`✅ API Status: ${response.status}`);
  console.log(`📊 Total attendees: ${data.registrations?.length || 0}`);
  
  if (!data.registrations || data.registrations.length === 0) {
    console.log('❌ No attendees found');
    return;
  }
  
  // 2. Check data structure
  console.log('\n2️⃣ Checking data structure...');
  const first = data.registrations[0];
  console.log('Sample attendee structure:');
  console.log('- Type:', first.type);
  console.log('- Full name:', first.full_name);
  console.log('- Email:', first.email);
  console.log('- Phone number:', first.phone_number);
  console.log('- Passport number:', first.passport_number);
  console.log('- Has user object?', !!first.user);
  console.log('- User phone:', first.user?.phone_number);
  console.log('- User passport:', first.user?.passport_number);
  
  // 3. Check all attendees for phone numbers
  console.log('\n3️⃣ Checking phone number availability...');
  const attendeesWithPhone = data.registrations.filter(a => {
    const phone = a.phone_number || a.user?.phone_number;
    return phone && phone.trim().length > 0;
  });
  
  console.log(`📱 Attendees with phone numbers: ${attendeesWithPhone.length}/${data.registrations.length}`);
  
  if (attendeesWithPhone.length > 0) {
    console.log('Sample phones found:');
    attendeesWithPhone.slice(0, 3).forEach((a, i) => {
      const phone = a.phone_number || a.user?.phone_number;
      console.log(`  ${i + 1}. ${a.full_name}: ${phone}`);
    });
  }
  
  // 4. Test search for "7054636640"
  console.log('\n4️⃣ Testing search for "7054636640"...');
  const searchTerm = '7054636640';
  const matches = data.registrations.filter(a => {
    const phone = a.phone_number || a.user?.phone_number;
    return phone && phone.includes(searchTerm);
  });
  
  console.log(`🔍 Found ${matches.length} matches for "${searchTerm}"`);
  
  if (matches.length > 0) {
    console.log('Matches found:');
    matches.forEach((match, i) => {
      const phone = match.phone_number || match.user?.phone_number;
      console.log(`  ${i + 1}. ${match.full_name}: ${phone}`);
    });
  } else {
    console.log('❌ No matches found');
    console.log('Available phone numbers:');
    attendeesWithPhone.slice(0, 5).forEach((a, i) => {
      const phone = a.phone_number || a.user?.phone_number;
      console.log(`  ${i + 1}. ${phone}`);
    });
  }
  
  // 5. Test the actual search logic from the page
  console.log('\n5️⃣ Testing page search logic...');
  
  const testSearchLogic = (attendee, searchTerm) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    
    // Name search
    const fullName = attendee.full_name || attendee.user?.full_name || '';
    if (fullName.toLowerCase().includes(search)) return true;
    
    // Email search
    const email = attendee.email || attendee.user?.email || '';
    if (email.toLowerCase().includes(search)) return true;
    
    // Phone number search
    const phoneNumber = attendee.phone_number || attendee.user?.phone_number || '';
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      const cleanSearch = search.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.includes(cleanSearch)) return true;
    }
    
    // Passport search
    const passportNumber = attendee.passport_number || attendee.user?.passport_number || '';
    if (passportNumber.toLowerCase().includes(search)) return true;
    
    return false;
  };
  
  const testAttendee = attendeesWithPhone.length > 0 ? attendeesWithPhone[0] : data.registrations[0];
  const phoneToTest = (testAttendee.phone_number || testAttendee.user?.phone_number || '').substring(0, 10);
  
  if (phoneToTest) {
    console.log(`Testing search for "${phoneToTest}" on attendee: ${testAttendee.full_name}`);
    const wouldMatch = testSearchLogic(testAttendee, phoneToTest);
    console.log(`Search logic result: ${wouldMatch ? '✅ Would match' : '❌ Would not match'}`);
  }
  
  // 6. Check if search is actually being triggered
  console.log('\n6️⃣ Checking search input...');
  const searchInput = document.querySelector('input[placeholder*="Search"]');
  if (searchInput) {
    console.log('Search input found:', searchInput);
    console.log('Current value:', searchInput.value);
    console.log('Placeholder:', searchInput.placeholder);
  } else {
    console.log('❌ Search input not found');
  }
  
  console.log('\n🔧 DIAGNOSIS:');
  if (matches.length > 0) {
    console.log('✅ Data exists with phone numbers');
    console.log('✅ Search should work');
    console.log('🚨 Issue may be:');
    console.log('   - Search input not updating');
    console.log('   - React state not refreshing');
    console.log('   - Search logic bug in component');
  } else if (attendeesWithPhone.length > 0) {
    console.log('✅ Phone numbers exist in data');
    console.log(`❌ But none match "${searchTerm}"`);
    console.log('Try searching with different phone numbers from the list above');
  } else {
    console.log('❌ No phone numbers in data at all');
    console.log('Check database for phone_number column data');
  }
}

// Also add quick test functions
window.testPhone = function(phoneNumber) {
  console.log(`Testing search for "${phoneNumber}"...`);
  fetch('/api/event-registrations?eventId=4')
    .then(r => r.json())
    .then(data => {
      const matches = data.registrations?.filter(a => {
        const phone = a.phone_number || a.user?.phone_number;
        return phone && phone.includes(phoneNumber);
      }) || [];
      console.log(`Found ${matches.length} matches`);
      if (matches.length > 0) {
        matches.forEach(m => console.log(`- ${m.full_name}: ${m.phone_number || m.user?.phone_number}`));
      }
    });
};

window.showAllPhones = function() {
  fetch('/api/event-registrations?eventId=4')
    .then(r => r.json())
    .then(data => {
      const phones = data.registrations
        ?.map(a => a.phone_number || a.user?.phone_number)
        .filter(p => p && p.trim().length > 0)
        .filter((v, i, a) => a.indexOf(v) === i); // Unique
      console.log('All phone numbers in data:', phones);
    });
};

console.log('📱 Debug functions available:');
console.log('  - debugPhoneSearch() - Full debug');
console.log('  - testPhone("7054636640") - Test specific phone');
console.log('  - showAllPhones() - Show all phone numbers');

// Run debug automatically
debugPhoneSearch();