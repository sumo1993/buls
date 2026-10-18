'use client'

import { useEffect, useState } from 'react'

export default function SimpleTestPage() {
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    const runTests = async () => {
      const results: any = {}

      // Test 1: Basic page load
      results.pageLoad = '✅ Page loaded successfully'

      // Test 2: Check if Clerk script exists
      const clerkScript = document.querySelector('script[src*="clerk"]')
      results.clerkScript = clerkScript ? '✅ Clerk script found' : '❌ Clerk script not found'

      // Test 3: Test API endpoint
      try {
        const response = await fetch('/api/test-clerk-auth')
        if (response.ok) {
          const data = await response.json()
          results.apiTest = `✅ API working: ${data.message}`
        } else {
          results.apiTest = `❌ API error: ${response.status}`
        }
      } catch (error) {
        results.apiTest = `❌ API failed: ${error}`
      }

      // Test 4: Check console for errors
      const consoleErrors: string[] = []
      const originalError = console.error
      console.error = function(...args) {
        consoleErrors.push(args.join(' '))
        originalError.apply(console, args)
      }

      // Wait a moment for any errors to appear
      setTimeout(() => {
        console.error = originalError
        if (consoleErrors.length > 0) {
          results.consoleErrors = `⚠️ ${consoleErrors.length} console errors found`
          results.errorDetails = consoleErrors.slice(0, 3) // Show first 3 errors
        } else {
          results.consoleErrors = '✅ No console errors'
        }
        
        setTestResults(results)
      }, 1000)
    }

    runTests()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Clerk Test</h1>
      
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Test Results:</h2>
        {Object.entries(testResults).map(([key, value]) => (
          <div key={key} className="p-3 bg-gray-50 rounded border">
            <strong className="font-medium">{key}:</strong>
            {Array.isArray(value) ? (
              <ul className="mt-1 space-y-1">
                {value.map((item, index) => (
                  <li key={index} className="text-sm text-red-600">{item}</li>
                ))}
              </ul>
            ) : (
              <span className="ml-2">{value}</span>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h2 className="font-bold mb-2">Next Steps:</h2>
        <div className="space-y-3">
          <div>
            <strong>If Clerk script not found:</strong>
            <p className="text-sm">Check .env.local file and restart server</p>
          </div>
          <div>
            <strong>If API test fails:</strong>
            <p className="text-sm">Check server logs for Clerk initialization errors</p>
          </div>
          <div>
            <strong>If console errors found:</strong>
            <p className="text-sm">Check browser console (F12) for details</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <a 
          href="/" 
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Go to Home
        </a>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Tests Again
        </button>
      </div>
    </div>
  )
}