'use client'

import { useState } from 'react'

export default function TestSupabaseConnectionPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-supabase')
      const data = await response.json()
      setResult({
        success: response.ok,
        status: response.status,
        data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const testTables = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-tables')
      const data = await response.json()
      setResult({
        success: response.ok,
        status: response.status,
        data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="space-y-4 mb-8">
        <div className="flex space-x-4">
          <button 
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Test Supabase Connection
          </button>
          
          <button 
            onClick={testTables}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading}
          >
            Test Supabase Tables
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="p-4 bg-blue-50 rounded-lg mb-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
            <span>Testing...</span>
          </div>
        </div>
      )}
      
      {result && (
        <div className="p-6 bg-gray-50 rounded-lg space-y-4">
          <h2 className="text-xl font-bold">Test Results</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-gray-500">Success:</div>
              <div className={`font-mono text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? 'true' : 'false'}
              </div>
            </div>
            
            {result.status && (
              <div className="p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-500">Status:</div>
                <div className={`font-mono text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.status}
                </div>
              </div>
            )}
          </div>
          
          {result.error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-800 mb-2">Error:</h3>
              <div className="font-mono text-sm text-red-600">{result.error}</div>
            </div>
          )}
          
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-bold mb-2">Response Data:</h3>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(result.data || result, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-bold mb-2">What we're testing:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Test Supabase Connection:</strong> Checks if we can connect to Supabase with the provided keys</li>
          <li><strong>Test Supabase Tables:</strong> Checks if the 'users' table exists and can be queried</li>
          <li>If connection fails, check environment variables in <code>.env.local</code></li>
          <li>If tables test fails, the 'users' table might not exist in your Supabase database</li>
        </ol>
      </div>
    </div>
  )
}