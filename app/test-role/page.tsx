'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function TestRolePage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [supabaseRole, setSupabaseRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded || !isSignedIn || !user) return

      try {
        const { supabase } = await import('@/lib/supabase/client-browser')
        
        const email = user.emailAddresses[0]?.emailAddress
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .maybeSingle()

        setSupabaseRole(data?.role || null)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [isLoaded, isSignedIn, user])

  if (!isLoaded || loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!isSignedIn) {
    return <div className="p-8">Please sign in</div>
  }

  const clerkRole = user.publicMetadata?.role as string
  const clerkStatus = user.publicMetadata?.status as string

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Role Sync Test</h1>
      
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">User Information</h2>
        <p><strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}</p>
        <p><strong>Clerk ID:</strong> {user.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-900">Clerk Metadata</h2>
          <p><strong>Role:</strong> <span className="text-2xl font-bold">{clerkRole || 'NOT SET'}</span></p>
          <p><strong>Status:</strong> <span className="text-2xl font-bold">{clerkStatus || 'NOT SET'}</span></p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-green-900">Supabase Database</h2>
          <p><strong>Role:</strong> <span className="text-2xl font-bold">{supabaseRole || 'NOT SET'}</span></p>
        </div>
      </div>

      <div className={`p-6 rounded-lg ${clerkRole === supabaseRole ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border-2`}>
        <h2 className="text-xl font-bold mb-2">
          {clerkRole === supabaseRole ? '✅ SYNCED' : '❌ NOT SYNCED'}
        </h2>
        {clerkRole !== supabaseRole && (
          <div>
            <p className="text-red-800">Roles don't match!</p>
            <p className="mt-2"><strong>Solution:</strong> Sign out and sign back in, or ask admin to update your role.</p>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Full Clerk Metadata:</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(user.publicMetadata, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
        <button
          onClick={async () => {
            await user.reload()
            window.location.reload()
          }}
          className="ml-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Reload Clerk User
        </button>
      </div>
    </div>
  )
}
