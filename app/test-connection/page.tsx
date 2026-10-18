'use client'

import { useState } from 'react'

export default function TestConnection() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testBrowserConnection = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      console.log('Testing Supabase connection from browser...')
      
      // Try to fetch users table
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
      
      if (error) {
        setResult({
          success: false,
          error: error.message,
          details: error
        })
      } else {
        setResult({
          success: true,
          message: 'Connected to Supabase successfully!',
          userCount: count,
          users: data
        })
      }
      
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        stack: error.stack
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={testBrowserConnection}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Browser Connection'}
          </button>
        </div>
        
        {result && (
          <div className={`bg-white rounded-lg shadow p-6 ${result.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
            <h2 className="text-xl font-bold mb-4">
              {result.success ? '✅ Success' : '❌ Failed'}
            </h2>
            
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
          <h3 className="font-bold mb-2">Environment Info:</h3>
          <ul className="text-sm space-y-1">
            <li>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
            <li>Anon Key Length: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length} characters</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
