'use client'

import { useState } from 'react'

export default function TestApiPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testApi = async (url: string, method = 'GET') => {
    setLoading(true)
    try {
      console.log(`Testing ${method} ${url}...`)
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' }
      })
      
      const status = response.status
      const statusText = response.statusText
      
      // Try to parse as JSON
      let data
      let parseError = null
      try {
        const text = await response.text()
        console.log(`Response text (first 200 chars): ${text.substring(0, 200)}...`)
        
        if (text.trim()) {
          data = JSON.parse(text)
        } else {
          data = null
        }
      } catch (error) {
        parseError = error
        console.error('JSON parse error:', error)
        data = null
      }
      
      setTestResults({
        url,
        method,
        status,
        statusText,
        data,
        parseError: parseError ? parseError.toString() : null,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
    } catch (error) {
      console.error('Fetch error:', error)
      setTestResults({
        url,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">API Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <div className="flex space-x-4">
          <button 
            onClick={() => testApi('/api/test-json')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Test /api/test-json
          </button>
          
          <button 
            onClick={() => testApi('/api/user')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading}
          >
            Test /api/user
          </button>
          
          <button 
            onClick={() => testApi('/api/sync-current-user', 'POST')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            disabled={loading}
          >
            Test /api/sync-current-user (POST)
          </button>
          
          <button 
            onClick={() => testApi('/api/debug')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            disabled={loading}
          >
            Test /api/debug
          </button>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Page
        </button>
      </div>
      
      {loading && (
        <div className="p-4 bg-blue-50 rounded-lg mb-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
            <span>Testing API...</span>
          </div>
        </div>
      )}
      
      {testResults.url && (
        <div className="p-6 bg-gray-50 rounded-lg space-y-4">
          <h2 className="text-xl font-bold">Test Results</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-500">URL:</div>
              <div className="font-mono text-sm">{testResults.url}</div>
            </div>
            
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-500">Method:</div>
              <div className="font-mono text-sm">{testResults.method}</div>
            </div>
            
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-500">Status:</div>
              <div className={`font-mono text-sm ${testResults.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.status} {testResults.statusText}
              </div>
            </div>
            
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-500">OK:</div>
              <div className={`font-mono text-sm ${testResults.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.ok ? 'true' : 'false'}
              </div>
            </div>
          </div>
          
          {testResults.parseError && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-800 mb-2">JSON Parse Error:</h3>
              <div className="font-mono text-sm text-red-600">{testResults.parseError}</div>
            </div>
          )}
          
          {testResults.error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-800 mb-2">Fetch Error:</h3>
              <div className="font-mono text-sm text-red-600">{testResults.error}</div>
            </div>
          )}
          
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-bold mb-2">Response Data:</h3>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(testResults.data, null, 2)}
            </pre>
          </div>
          
          {testResults.headers && (
            <div className="p-4 bg-white rounded-lg border">
              <h3 className="font-bold mb-2">Response Headers:</h3>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(testResults.headers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click each button to test the corresponding API endpoint</li>
          <li>Check if there are any JSON parse errors</li>
          <li>Check the response status and data</li>
          <li>If you see HTML in the response, the API is returning HTML instead of JSON</li>
          <li>Check browser console (F12) for additional errors</li>
        </ol>
      </div>
    </div>
  )
}