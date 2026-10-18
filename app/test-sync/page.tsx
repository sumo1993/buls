'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function TestSyncPage() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      testSync()
    }
  }, [isLoaded, isSignedIn, userId])

  const testSync = async () => {
    setLoading(true)
    try {
      // Test check-sync
      const checkRes = await fetch(`/api/check-sync?clerkId=${userId}`)
      const checkData = await checkRes.json()
      setSyncStatus(checkData)
      console.log('Check sync result:', checkData)

      // If not synced, try manual sync
      if (!checkData.synced) {
        console.log('User not synced, attempting manual sync...')
        const syncRes = await fetch('/api/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerkId: userId })
        })
        const syncData = await syncRes.json()
        console.log('Manual sync result:', syncData)
        setSyncStatus(syncData)
      }
    } catch (error) {
      console.error('Sync test error:', error)
      setSyncStatus({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not Signed In</h1>
          <a href="/auth/signin" className="text-blue-600 underline">Sign In</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sync Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {userId}</p>
            <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
            <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sync Status</h2>
          {loading ? (
            <p>Testing sync...</p>
          ) : (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(syncStatus, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={testSync}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Sync Again'}
          </button>
        </div>

        <div className="mt-6">
          <a href="/dashboard" className="text-blue-600 underline">Go to Dashboard</a>
        </div>
      </div>
    </div>
  )
}
