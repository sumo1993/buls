'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    
    if (!userId) {
      router.push('/')
      return
    }

    setupUser()
  }, [isLoaded, userId, router])

  const setupUser = async () => {
    if (!userId) return

    try {
      
      // Get Clerk user data
      const clerkResponse = await fetch('/api/clerk-user')
      if (!clerkResponse.ok) {
        throw new Error('Failed to fetch user data from Clerk')
      }
      
      const clerkUser = await clerkResponse.json()
      
      // Create user in Supabase
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()
      
      if (existingUser) {
        
        // Check if user has a profile
        const { data: existingProfile } = await supabase
          .from('members_profile')
          .select('*')
          .eq('user_id', existingUser.id)
          .single()
        
        if (existingProfile) {
          router.push('/dashboard')
        } else {
          router.push('/registration')
        }
        return
      }
      
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: clerkUser.email || 'user@example.com',
          full_name: clerkUser.fullName || 'User',
          role: 'member',
          status: 'pending'
        })
        .select()
        .single()
      
      if (createError) {
        throw new Error(createError.message)
      }
      
      
      // Redirect to registration page
      router.push('/registration')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Failed</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => setupUser()}
              className="bg-[#003366] text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#003366] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setting up your account</h1>
          <p className="text-gray-600">Please wait while we prepare your account...</p>
        </div>
      </div>
    </div>
  )
}
