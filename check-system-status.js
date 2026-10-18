#!/usr/bin/env node

/**
 * Check System Status Script
 * Run this to diagnose the checkin page issue
 * 
 * Usage: node check-system-status.js
 */

const https = require('https');
const http = require('http');

async function checkSystemStatus() {
  console.log('🔍 Checking System Status for Event Checkin Page\n');
  
  console.log('1️⃣ Checking if development server is running...');
  await checkServerStatus();
  
  console.log('\n2️⃣ Checking API endpoint...');
  await checkAPIEndpoint();
  
  console.log('\n3️⃣ Database Schema Status:');
  console.log('   ❗ CRITICAL: Database schema mismatch detected');
  console.log('   - The "users" table is missing phone_number and passport_number columns');
  console.log('   - The "ticket_guests" table does not exist');
  console.log('   - This prevents phone/passport search from working');
  
  console.log('\n4️⃣ Required Actions:');
  console.log('   1. Run database migration: ADD_MISSING_COLUMNS_MIGRATION.sql');
  console.log('   2. Add test data if needed (optional)');
  console.log('   3. Restart development server if migration was done while server was running');
  
  console.log('\n5️⃣ Files to check:');
  console.log('   ✅ app/api/event-registrations/route.ts - API implementation');
  console.log('   ✅ app/secretary/events/[id]/checkin/page.tsx - Checkin page');
  console.log('   ✅ ADD_MISSING_COLUMNS_MIGRATION.sql - Migration script');
  console.log('   ✅ enhanced-ticketing-schema.sql - Enhanced schema');
  
  console.log('\n📋 Migration Instructions:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Copy contents of ADD_MISSING_COLUMNS_MIGRATION.sql');
  console.log('   3. Paste and run the SQL');
  console.log('   4. Verify columns were added');
  console.log('   5. Test search functionality');
}

async function checkServerStatus() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'HEAD',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      console.log(`   ✅ Server is running (status: ${res.statusCode})`);
      resolve();
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Server is not running: ${err.message}`);
      console.log('   Start server with: npm run dev');
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('   ⚠️ Server check timeout - may not be running');
      console.log('   Start server with: npm run dev');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

async function checkAPIEndpoint() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/event-registrations?eventId=4',
      method: 'GET',
      timeout: 5000
    };
    
    let data = '';
    
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`   ✅ API endpoint is accessible (status: ${res.statusCode})`);
          
          if (res.statusCode === 200) {
            console.log(`   📊 Found ${json.registrations?.length || 0} attendees`);
            
            if (json.registrations && json.registrations.length > 0) {
              const first = json.registrations[0];
              console.log(`   📋 Sample attendee: ${first.full_name} (${first.type})`);
              
              // Check for phone number
              const phone = first.phone_number || first.user?.phone_number;
              console.log(`   📱 Phone number field: ${phone ? 'Present' : 'Missing/null'}`);
              
              // Check for passport
              const passport = first.passport_number || first.user?.passport_number;
              console.log(`   🛂 Passport field: ${passport ? 'Present' : 'Missing/null'}`);
              
              if (!phone && !passport) {
                console.log('   ❗ Phone/passport data missing - database schema issue');
              }
            }
          } else {
            console.log(`   ❌ API error: ${json.error || 'Unknown error'}`);
          }
        } catch (err) {
          console.log(`   ⚠️ Could not parse API response: ${err.message}`);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ API endpoint not accessible: ${err.message}`);
      console.log('   Make sure server is running: npm run dev');
      resolve();
    });
    
    req.on('timeout', () => {
      console.log('   ⚠️ API check timeout');
      req.destroy();
      resolve();
    });
    
    req.end();
  });
}

// Run the check
checkSystemStatus().then(() => {
  console.log('\n🎯 Next Steps:');
  console.log('1. Run the database migration script in Supabase');
  console.log('2. Test the checkin page at /secretary/events/4/checkin');
  console.log('3. Use browser console debug script if issues persist');
  console.log('\nFor detailed instructions, see: COMPREHENSIVE_SOLUTION.md');
}).catch(err => {
  console.error('Error running system check:', err);
});

// Export for testing
module.exports = { checkSystemStatus, checkServerStatus, checkAPIEndpoint };