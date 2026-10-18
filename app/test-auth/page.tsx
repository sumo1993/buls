'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function TestAuthPage() {
  const { isLoaded, userId, isSignedIn } = useAuth()
  const { user } = useUser()
  const [authState, setAuthState] = useState<string>('loading...')

  useEffect(() => {
    if (isLoaded) {
      setAuthState(`isLoaded: ${isLoaded}, userId: ${userId}, isSignedIn: ${isSignedIn}`)
    }
  }, [isLoaded, userId, isSignedIn])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk Authentication Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-bold mb-2">Auth State:</h2>
        <pre className="text-sm">{authState}</pre>
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-bold mb-2">User Info:</h2>
        {user ? (
          <pre className="text-sm">{JSON.stringify({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            fullName: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName
          }, null, 2)}</pre>
        ) : (
          <p>No user data</p>
        )}
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h2 className="font-bold mb-2">What this means:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>isLoaded: true</strong> - Clerk is initialized</li>
          <li><strong>userId: [value]</strong> - User ID from Clerk</li>
          <li><strong>isSignedIn: true</strong> - User is authenticated</li>
          <li><strong>User data</strong> - Should show email and name if signed in</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-bold mb-2">Testing Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Visit this page: <code>http://localhost:3000/test-auth</code></li>
          <li>Check if <code>isSignedIn</code> is <code>true</code></li>
          <li>Check if <code>userId</code> has a value</li>
          <li>Check if user data shows your email</li>
          <li>If not signed in, try signing in first</li>
        </ol>
      </div>
    </div>
  )
}