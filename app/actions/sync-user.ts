'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function syncUserFromClerk(clerkId: string) {
  try {
    console.log('Syncing user from Clerk:', clerkId)

    // Fetch user from Clerk API
    const client = await clerkClient()
    const user = await client.users.getUser(clerkId)

    if (!user) {
      return { success: false, error: 'User not found in Clerk' }
    }

    console.log('Fetched user from Clerk:', user.id)

    // Extract user data
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
    const email = user.emailAddresses[0]?.emailAddress || ''

    console.log('User data:', { fullName, email })

    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('Inserting user into Supabase with service role key...')
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        clerk_id: user.id,
        full_name: fullName,
        email: email,
        role: 'admin',
        status: 'active'
      })
    
    if (insertError) {
      console.error('Failed to insert user into Supabase:', insertError)
      return { success: false, error: insertError.message }
    }
    
    console.log('User synced successfully to Supabase')

    return { 
      success: true, 
      user: { 
        clerk_id: user.id, 
        full_name: fullName, 
        email 
      } 
    }
  } catch (error) {
    console.error('Error in syncUserFromClerk action:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
