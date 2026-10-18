'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function TestUserPage() {
  const { userId } = useAuth()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testUser = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      console.log('Your Clerk User ID:', userId)
      
      // Try to fetch this user from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()
      
      setResult({
        clerkUserId: userId,
        supabaseUser: data,
        error: error,
        errorCode: error?.code,
        errorMessage: error?.message
      })
      
    } catch (error: any) {
      setResult({
        clerkUserId: userId,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test User Connection</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="mb-4">Your Clerk User ID: <code className="bg-gray-100 px-2 py-1 rounded">{userId}</code></p>
          
          <button
            onClick={testUser}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Check If User Exists in Database'}
          </button>
        </div>
        
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Result:</h2>
            
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>

            {result.supabaseUser ? (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-bold">✅ User EXISTS in database!</p>
                <p className="text-sm mt-2">Role: {result.supabaseUser.role}</p>
                <p className="text-sm">Status: {result.supabaseUser.status}</p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-bold">❌ User NOT FOUND in database!</p>
                <p className="text-sm mt-2">You need to run this SQL in Supabase:</p>
                <pre className="bg-white p-3 rounded mt-2 text-xs overflow-auto">
{`INSERT INTO users (clerk_id, email, full_name, role, status)
VALUES (
  '${userId}',
  '429318n@gmail.com',
  'Admin User',
  'admin',
  'active'
)
ON CONFLICT (clerk_id) DO UPDATE SET
  role = 'admin',
  status = 'active';`}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
