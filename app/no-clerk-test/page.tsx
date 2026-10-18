'use client'

import { useState, useEffect } from 'react'

export default function NoClerkTestPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    const results: string[] = []

    // Test 1: Basic React works
    results.push('✅ React component loaded')

    // Test 2: Check if page loads without errors
    results.push('✅ Page rendered without errors')

    // Test 3: Test a simple fetch
    fetch('/api/test-connection')
      .then(response => {
        if (response.ok) {
          results.push('✅ API endpoint /api/test-connection works')
        } else {
          results.push(`❌ API endpoint failed: ${response.status}`)
        }
      })
      .catch(error => {
        results.push(`❌ API fetch failed: ${error.message}`)
      })

    // Test 4: Check for console errors
    const originalError = console.error
    const errors: string[] = []
    console.error = function(...args) {
      errors.push(args.join(' '))
      originalError.apply(console, args)
    }

    setTimeout(() => {
      console.error = originalError
      if (errors.length > 0) {
        results.push(`⚠️ Found ${errors.length} console errors`)
        // Add first error for context
        const firstError = errors[0]
        if (firstError.includes('JSON.parse')) {
          results.push('❓ JSON.parse error detected (likely Clerk related)')
        }
      } else {
        results.push('✅ No console errors')
      }

      setTestResults(results)
    }, 1000)

  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">No-Clerk Test Page</h1>
      
      <div className="mb-6">
        <p className="mb-4">This page does NOT use Clerk at all. It tests if the basic app works.</p>
        
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="font-bold mb-2">Test Results:</h2>
          <ul className="space-y-2">
            {testResults.map((result, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">{result.startsWith('✅') ? '✅' : result.startsWith('❌') ? '❌' : '⚠️'}</span>
                <span>{result}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <h2 className="font-bold mb-2">What this tells us:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>If all tests pass</strong>: Basic app works, Clerk is the issue</li>
          <li><strong>If API test fails</strong>: Server-side issues</li>
          <li><strong>If JSON.parse error appears</strong>: Clerk is trying to load even on non-Clerk pages</li>
        </ul>
      </div>

      <div className="space-y-4">
        <a 
          href="/minimal-clerk-test" 
          className="block px-4 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700"
        >
          Test Minimal Clerk Page
        </a>
        <a 
          href="/debug-clerk" 
          className="block px-4 py-2 bg-green-600 text-white rounded text-center hover:bg-green-700"
        >
          Test Clerk Debug Page
        </a>
        <a 
          href="/" 
          className="block px-4 py-2 bg-gray-600 text-white rounded text-center hover:bg-gray-700"
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}