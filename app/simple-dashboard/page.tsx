'use client'

import { useAuth, useUser } from '@clerk/nextjs'

export default function SimpleDashboard() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>
  }

  if (!isSignedIn) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not Signed In</h1>
        <p>Please sign in first</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Simple Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">✅ You're Logged In!</h2>
        <div className="space-y-2">
          <p><strong>User ID:</strong> {userId}</p>
          <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
          <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Sync Working</h2>
        <p className="text-green-700">
          Your user is successfully synced to Supabase! Check the test-sync page for details.
        </p>
      </div>

      <div className="mt-6 space-x-4">
        <a href="/test-sync" className="text-blue-600 underline">Test Sync Page</a>
        <a href="/admin" className="text-blue-600 underline">Admin Panel</a>
      </div>
    </div>
  )
}
