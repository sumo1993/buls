import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Ensure a Clerk user exists in Supabase database
 * This function should be called in server components or API routes
 */
export async function ensureUserExistsInSupabase() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.error('No authenticated user')
      return { success: false, error: 'No authenticated user' }
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user already exists in Supabase
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user in Supabase:', fetchError)
      return { success: false, error: fetchError.message }
    }

    if (existingUser) {
      console.log('User already exists in Supabase:', existingUser.id)
      return { success: true, user: existingUser, isNew: false }
    }

    // User doesn't exist, fetch from Clerk and create in Supabase
    console.log('User not found in Supabase, fetching from Clerk...')
    
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)

    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
                     email.split('@')[0] || 'User'

    console.log('Creating user in Supabase:', { clerk_id: userId, email, fullName })

    // Create user in Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        clerk_id: userId,
        email: email,
        full_name: fullName,
        role: 'member',
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user in Supabase:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log('User created successfully in Supabase:', newUser.id)
    return { success: true, user: newUser, isNew: true }

  } catch (error) {
    console.error('Error in ensureUserExistsInSupabase:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get the current user from Clerk and ensure they exist in Supabase
 * This is a convenience wrapper for ensureUserExistsInSupabase
 */
export async function getCurrentUserOrSync() {
  const result = await ensureUserExistsInSupabase()
  
  if (!result.success) {
    throw new Error(`Failed to get user: ${result.error}`)
  }
  
  return result.user
}

/**
 * Get user role from Supabase
 */
export async function getUserRole() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return null
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    return user.role
  } catch (error) {
    console.error('Error in getUserRole:', error)
    return null
  }
}