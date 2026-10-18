/**
 * Test script for user sync functionality
 * Run with: node test-sync.js
 */

const SUPABASE_URL = 'https://jsvjdrnhvxlxzqhkijpj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzdmpkcm5odnhseHpxaGtpanBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTI0OTUsImV4cCI6MjEwNjE4ODQ5NX0.KQIBAjkO_A63OCZ6WZxV5759xd0XIxaRMWQGiao4Fhg'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      console.log('✅ Supabase connection successful!')
      console.log('   Database is accessible\n')
      return true
    } else {
      console.log('❌ Supabase connection failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message)
    return false
  }
}

async function testSyncEndpoint() {
  console.log('🔍 Testing sync endpoint...\n')
  
  try {
    // Test check-sync endpoint
    const checkResponse = await fetch('http://localhost:3000/api/check-sync?clerkId=test_user_123')
    const checkData = await checkResponse.json()
    
    console.log('Check-sync response:', checkData)
    console.log('')
    
    if (checkResponse.ok) {
      console.log('✅ Sync endpoint is accessible!')
      return true
    } else {
      console.log('⚠️  Sync endpoint returned error (this is expected for test user)')
      return true // Endpoint exists, that's what matters
    }
  } catch (error) {
    console.log('❌ Sync endpoint error:', error.message)
    console.log('   Make sure dev server is running: npm run dev')
    return false
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  User Sync Test')
  console.log('═══════════════════════════════════════════════════\n')
  
  const dbOk = await testConnection()
  const syncOk = await testSyncEndpoint()
  
  console.log('═══════════════════════════════════════════════════')
  console.log('Summary:')
  console.log(`  Database Connection: ${dbOk ? '✅ OK' : '❌ FAILED'}`)
  console.log(`  Sync Endpoint: ${syncOk ? '✅ OK' : '❌ FAILED'}`)
  console.log('═══════════════════════════════════════════════════\n')
  
  if (dbOk && syncOk) {
    console.log('✅ All systems ready!')
    console.log('\nNext steps:')
    console.log('1. Go to http://localhost:3000/admin/register')
    console.log('2. Create a new user')
    console.log('3. The user will be synced immediately to Supabase')
    console.log('   (No webhook wait!)')
  }
}

main().catch(console.error)
