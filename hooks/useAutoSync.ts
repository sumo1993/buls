'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Auto-sync hook - ensures user exists in Supabase after login
 * Optimized: Only runs once per session, not on every navigation
 */
export function useAutoSync() {
  const { userId, isLoaded, isSignedIn } = useAuth()
  const hasChecked = useRef(false)

  useEffect(() => {
    async function syncUser() {
      // Skip if already checked or not ready
      if (!isLoaded || !isSignedIn || !userId || hasChecked.current) return

      // Mark as checked immediately to prevent duplicate calls
      hasChecked.current = true

      try {
        // Check if user is synced
        const checkResponse = await fetch(`/api/check-sync?clerkId=${userId}`)
        const checkData = await checkResponse.json()

        if (!checkData.synced) {
          console.log('User not synced, auto-syncing...')
          
          // Sync the user
          const syncResponse = await fetch('/api/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clerkId: userId })
          })

          const syncData = await syncResponse.json()
          
          if (syncData.success) {
            console.log('✅ User auto-synced successfully')
          } else {
            console.error('⚠️ Auto-sync failed:', syncData.error)
          }
        } else {
          console.log('✅ User already synced')
        }
      } catch (error) {
        console.error('Auto-sync error:', error)
      }
    }

    syncUser()
  }, [userId, isLoaded, isSignedIn])

  return { userId, isSignedIn }
}
