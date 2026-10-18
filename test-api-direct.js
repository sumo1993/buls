// Direct API test script
const http = require('http');

function testAPI() {
  return new Promise((resolve) => {
    console.log('🔍 Testing API endpoint: /api/event-registrations?eventId=4\n');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/event-registrations?eventId=4',
      method: 'GET',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    };
    
    let data = '';
    
    const req = http.request(options, (res) => {
      console.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`📡 Headers:`, res.headers['content-type']);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            console.log('\n✅ API Response Structure:');
            console.log(`   Total attendees: ${json.registrations?.length || 0}`);
            
            if (json.registrations && json.registrations.length > 0) {
              const sample = json.registrations[0];
              console.log('\n📋 Sample Attendee:');
              console.log(`   Type: ${sample.type}`);
              console.log(`   Name: ${sample.full_name}`);
              console.log(`   Email: ${sample.email}`);
              console.log(`   Phone: ${sample.phone_number || sample.user?.phone_number || 'MISSING'}`);
              console.log(`   Passport: ${sample.passport_number || sample.user?.passport_number || 'MISSING'}`);
              console.log(`   Ticket #: ${sample.ticket_number || 'N/A'}`);
              
              // Check for phone/passport data
              const hasPhone = json.registrations.some(a => 
                (a.phone_number || a.user?.phone_number) && 
                (a.phone_number || a.user?.phone_number).trim().length > 0
              );
              
              const hasPassport = json.registrations.some(a => 
                (a.passport_number || a.user?.passport_number) && 
                (a.passport_number || a.user?.passport_number).trim().length > 0
              );
              
              console.log(`\n📊 Data Availability:`);
              console.log(`   Phone numbers: ${hasPhone ? '✅ Present' : '❌ Missing'}`);
              console.log(`   Passport numbers: ${hasPassport ? '✅ Present' : '❌ Missing'}`);
              
              if (!hasPhone && !hasPassport) {
                console.log('\n🚨 CRITICAL: No phone/passport data found!');
                console.log('   Database migration required:');
                console.log('   1. Run ADD_MISSING_COLUMNS_MIGRATION.sql in Supabase');
                console.log('   2. Or run MINIMAL_MIGRATION.sql for basic fix');
                console.log('   3. Add test data if needed');
              }
            } else {
              console.log('\n⚠️ No attendees found for event 4');
              console.log('   This could be because:');
              console.log('   1. No registrations/tickets for event 4');
              console.log('   2. Database connection issue');
              console.log('   3. User permissions issue');
            }
          } else {
            console.log('\n❌ API Error Response:');
            try {
              const error = JSON.parse(data);
              console.log(`   Error: ${error.error || 'Unknown error'}`);
              if (error.details) console.log(`   Details: ${error.details.substring(0, 200)}...`);
            } catch {
              console.log(`   Raw response: ${data.substring(0, 500)}...`);
            }
          }
        } catch (error) {
          console.log(`\n❌ JSON Parse Error: ${error.message}`);
          console.log(`   Raw data: ${data.substring(0, 500)}...`);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log(`\n❌ Request Error: ${err.message}`);
      console.log('   Make sure the development server is running: npm run dev');
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('\n⏱️ Request timeout');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  await testAPI();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Run database migration in Supabase SQL Editor');
  console.log('2. Test the checkin page: /secretary/events/4/checkin');
  console.log('3. Use browser debug script if needed');
  
  console.log('\n📋 Migration Files:');
  console.log('   - ADD_MISSING_COLUMNS_MIGRATION.sql (complete)');
  console.log('   - MINIMAL_MIGRATION.sql (basic fix)');
  console.log('   - DATABASE_DIAGNOSTIC.sql (check current state)');
}

runTests().catch(console.error);