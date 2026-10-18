'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Component that checks if user has completed registration
 * Redirects to /registration if profile is incomplete
 */
export default function RegistrationCheck() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  // Routes that don't require profile check
  const excludedRoutes = [
    '/registration',
    '/auth/signin',
    '/auth/signup',
    '/',
    '/events',
    '/about',
    '/members',
    '/contact',
    '/test-sync',
    '/simple-dashboard',
    '/admin', // Allow admin access without profile check
    '/embassy', // Embassy desk/staff — no member registration required
  ]

  useEffect(() => {
    async function checkProfile() {
      if (!isLoaded || !isSignedIn || !clerkUser) {
        return
      }

      if (excludedRoutes.some(route => pathname.startsWith(route))) {
        return
      }

      const role = clerkUser.publicMetadata?.role as string
      if (role === 'admin' || role === 'embassy') {
        return
      }

      // Skip DB after first success this session (pathname changes remount this often)
      const cacheKey = `buls_profile_ok_${clerkUser.id}`
      try {
        if (sessionStorage.getItem(cacheKey) === '1') {
          return
        }
      } catch {
        /* ignore */
      }

      try {
        const { supabase } = await import('@/lib/supabase/client-browser')

        const email = clerkUser.emailAddresses[0]?.emailAddress
        if (!email) {
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (!userData) {
          console.log('User not found, redirecting to registration')
          router.push('/registration')
          return
        }

        const { data: profileData } = await supabase
          .from('members_profile')
          .select('id')
          .eq('user_id', userData.id)
          .maybeSingle()

        if (!profileData) {
          console.log('Profile not found, redirecting to registration')
          router.push('/registration')
          return
        }

        try {
          sessionStorage.setItem(cacheKey, '1')
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('Registration check error:', error)
      }
    }

    checkProfile()
  }, [isLoaded, isSignedIn, clerkUser, pathname, router])

  return null
}
