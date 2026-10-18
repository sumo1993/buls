import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function useRegistrationStatus() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const [hasCompletedRegistration, setHasCompletedRegistration] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!isLoaded || !isSignedIn || !clerkUser) {
        setLoading(false)
        return
      }

      try {
        const { supabase } = await import('@/lib/supabase/client-browser')
        
        const { data: profile } = await supabase
          .from('members_profile')
          .select('member_id')
          .eq('user_id', clerkUser.id)
          .maybeSingle()

        setHasCompletedRegistration(!!profile?.member_id)
      } catch (error) {
        console.error('Error checking registration status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkRegistrationStatus()
  }, [isLoaded, isSignedIn, clerkUser])

  return { hasCompletedRegistration, loading }
}
