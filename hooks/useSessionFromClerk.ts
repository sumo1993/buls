'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

/**
 * Hook that provides NextAuth-style session using Clerk user data
 * This allows Clerk and NextAuth pages to work together
 */
export function useSessionFromClerk() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [session, setSession] = useState<{
    user: {
      email: string | null
      name: string | null
      role?: string
      status?: string
      id?: string
    } | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
  }>({
    user: null,
    status: 'loading'
  })

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (isSignedIn && user) {
      const email = user.emailAddresses[0]?.emailAddress || null
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email || null
      
      setSession({
        user: {
          email,
          name,
          role: (user.publicMetadata?.role as string) || 'member',
          status: (user.publicMetadata?.status as string) || 'active',
          id: user.id
        },
        status: 'authenticated'
      })
    } else {
      setSession({
        user: null,
        status: 'unauthenticated'
      })
    }
  }, [isLoaded, isSignedIn, user])

  return session
}
