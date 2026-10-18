/**
 * Test script for creating announcements
 * This script tests the POST /api/announcements endpoint
 */

const BASE_URL = 'http://localhost:3000'

async function testCreateAnnouncement() {
  console.log('🧪 Testing Announcement Creation...\n')

  const testCases = [
    {
      name: 'Normal Priority Announcement',
      data: {
        title: 'Welcome to BULS Beijing',
        content: 'We are excited to have you as part of our community. Check out our upcoming events and meetings!',
        priority: 'normal'
      }
    },
    {
      name: 'Urgent Announcement with Expiration',
      data: {
        title: 'Urgent: Meeting Room Change',
        content: 'Today\'s general meeting has been moved to Room 305. Please arrive 10 minutes early.',
        priority: 'urgent',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }
    },
    {
      name: 'High Priority Announcement',
      data: {
        title: 'Membership Dues Reminder',
        content: 'Friendly reminder that membership dues for this semester are due by the end of the month. Please visit the payments page to settle your dues.',
        priority: 'high',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      }
    },
    {
      name: 'Low Priority Announcement',
      data: {
        title: 'Library Hours Extended',
        content: 'Good news! The library will now be open until 10 PM on weekdays.',
        priority: 'low'
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`)
    console.log('Request Data:', JSON.stringify(testCase.data, null, 2))

    try {
      const response = await fetch(`${BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ PASSED')
        console.log('Response:', JSON.stringify(result, null, 2))
        passed++
      } else {
        console.log('❌ FAILED')
        console.log('Status:', response.status)
        console.log('Error:', result.error)
        failed++
      }
    } catch (error) {
      console.log('❌ FAILED')
      console.log('Error:', error.message)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(50))
}

async function testGetAnnouncements() {
  console.log('\n\n🧪 Testing Get All Announcements...\n')

  try {
    const response = await fetch(`${BASE_URL}/api/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ GET Request Successful')
      console.log(`Found ${result.announcements?.length || 0} announcements`)
      if (result.announcements && result.announcements.length > 0) {
        console.log('\nAnnouncements:')
        result.announcements.forEach((ann, idx) => {
          console.log(`\n${idx + 1}. ${ann.title}`)
          console.log(`   Priority: ${ann.priority}`)
          console.log(`   Content: ${ann.content.substring(0, 60)}...`)
          console.log(`   Created: ${new Date(ann.created_at).toLocaleString()}`)
          if (ann.expires_at) {
            console.log(`   Expires: ${new Date(ann.expires_at).toLocaleString()}`)
          }
        })
      }
    } else {
      console.log('❌ GET Request Failed')
      console.log('Status:', response.status)
      console.log('Error:', result.error)
    }
  } catch (error) {
    console.log('❌ GET Request Failed')
    console.log('Error:', error.message)
  }
}

async function testValidation() {
  console.log('\n\n🧪 Testing Validation...\n')

  const invalidCases = [
    {
      name: 'Missing Title',
      data: {
        content: 'This announcement has no title',
        priority: 'normal'
      },
      expectedError: 'title'
    },
    {
      name: 'Missing Content',
      data: {
        title: 'This announcement has no content',
        priority: 'normal'
      },
      expectedError: 'content'
    },
    {
      name: 'Invalid Priority',
      data: {
        title: 'Invalid Priority Test',
        content: 'This has an invalid priority',
        priority: 'super-urgent'
      },
      expectedError: 'priority'
    },
    {
      name: 'Past Expiration Date',
      data: {
        title: 'Expired Announcement',
        content: 'This should fail',
        priority: 'normal',
        expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
      },
      expectedError: 'future'
    }
  ]

  let passed = 0
  let failed = 0

  for (const testCase of invalidCases) {
    console.log(`\n📝 Validation Test: ${testCase.name}`)

    try {
      const response = await fetch(`${BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      })

      const result = await response.json()

      if (!response.ok && result.error) {
        console.log('✅ PASSED - Validation caught the error')
        console.log('Error Message:', result.error)
        passed++
      } else {
        console.log('❌ FAILED - Should have returned an error')
        failed++
      }
    } catch (error) {
      console.log('❌ FAILED')
      console.log('Error:', error.message)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Validation Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(50))
}

async function runAllTests() {
  console.log('🚀 Starting Announcement API Tests')
  console.log('Base URL:', BASE_URL)
  console.log('='.repeat(50))

  console.log('\n⚠️  Note: These tests require:')
  console.log('   1. The development server running (npm run dev)')
  console.log('   2. A valid authentication session (logged in as admin/secretary)')
  console.log('   3. Database connection configured\n')

  await testCreateAnnouncement()
  await testGetAnnouncements()
  await testValidation()

  console.log('\n\n✨ All tests completed!')
}

// Run all tests
runAllTests().catch(console.error)
