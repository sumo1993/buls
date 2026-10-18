const http = require('http');

console.log('🔍 Testing API from terminal...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/event-registrations?eventId=4',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Status: ${res.statusCode} ${res.statusMessage}`);
  console.log(`📡 Content-Type: ${res.headers['content-type']}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`\n📊 Total attendees: ${json.registrations?.length || 0}`);
      
      if (json.registrations && json.registrations.length > 0) {
        console.log('\n📋 First 3 attendees:');
        json.registrations.slice(0, 3).forEach((attendee, i) => {
          console.log(`\n  ${i + 1}. ${attendee.full_name}`);
          console.log(`     Email: ${attendee.email}`);
          console.log(`     Phone: ${attendee.phone_number || attendee.user?.phone_number || 'MISSING'}`);
          console.log(`     Passport: ${attendee.passport_number || attendee.user?.passport_number || 'MISSING'}`);
          console.log(`     Type: ${attendee.type}`);
        });
        
        // Check for phone numbers
        const withPhone = json.registrations.filter(a => {
          const phone = a.phone_number || a.user?.phone_number;
          return phone && phone.trim().length > 0;
        });
        
        console.log(`\n📱 Attendees with phone numbers: ${withPhone.length}/${json.registrations.length}`);
        
        if (withPhone.length > 0) {
          console.log('\n🔍 Testing search for "7054636640":');
          const matches = json.registrations.filter(a => {
            const phone = a.phone_number || a.user?.phone_number;
            return phone && phone.includes('7054636640');
          });
          console.log(`   Found ${matches.length} matches`);
          
          if (matches.length === 0) {
            console.log('\n📞 Available phone numbers:');
            withPhone.slice(0, 5).forEach((a, i) => {
              const phone = a.phone_number || a.user?.phone_number;
              console.log(`   ${i + 1}. ${phone} (${a.full_name})`);
            });
          }
        }
      } else {
        console.log('\n⚠️ No attendees found for event 4');
        console.log('Possible issues:');
        console.log('   1. No registrations in database for event 4');
        console.log('   2. Authentication required (API returns empty when not authenticated)');
        console.log('   3. Database connection issue');
      }
    } catch (error) {
      console.log('\n❌ JSON parse error:', error.message);
      console.log('Raw response (first 500 chars):', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.log('\n❌ Request error:', err.message);
  console.log('Make sure server is running: npm run dev');
});

req.end();