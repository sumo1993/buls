import { clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Full Clerk sync is expensive — at most once per process every 10 minutes
const FULL_SYNC_COOLDOWN_MS = 10 * 60 * 1000
const ENABLE_BACKGROUND_FULL_SYNC = process.env.ENABLE_CLERK_FULL_SYNC === 'true'
let lastFullSyncAt = 0
let fullSyncInFlight = false

function isTransientNetworkError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ??
    (error as { details?: string })?.details ??
    error ??
    ''
  )
  return /fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|network/i.test(message)
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientNetworkError(error) || attempt === attempts) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
  throw lastError
}

/**
 * Sync ALL users from Clerk to Supabase in the background.
 * Throttled so it does not run on every API request.
 */
function syncAllUsersInBackground() {
  if (!ENABLE_BACKGROUND_FULL_SYNC) {
    return
  }

  const now = Date.now()
  if (fullSyncInFlight || now - lastFullSyncAt < FULL_SYNC_COOLDOWN_MS) {
    return
  }

  fullSyncInFlight = true
  lastFullSyncAt = now

  // Run in background - don't await
  setImmediate(async () => {
    try {
      console.log('🔄 Background: Starting full user sync from Clerk...')
      
      const client = await clerkClient()
      const clerkUsers = await client.users.getUserList({ limit: 100 })
      
      const adminClient = createAdminClient()
      let synced = 0
      
      for (const clerkUser of clerkUsers.data) {
        try {
          const email = clerkUser.emailAddresses[0]?.emailAddress || ''
          const role = (clerkUser.publicMetadata as any)?.role || 'member'
          const status = (clerkUser.publicMetadata as any)?.status || 'active'
          
          // Check if user exists in Supabase
          const { data: existingUser } = await adminClient
            .from('users')
            .select('id, full_name, updated_at, email, role, status')
            .eq('clerk_id', clerkUser.id)
            .single()
          
          let shouldUpdate = false
          let updatedFields: any = {
            clerk_id: clerkUser.id,
            email: email,
            role: role,
            status: status,
            updated_at: new Date().toISOString()
          }
          
          if (!existingUser) {
            // User doesn't exist in Supabase, create with Clerk data
            const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
            updatedFields.full_name = fullName
            shouldUpdate = true
          } else {
            // User exists in Supabase - PRESERVE SUPABASE DATA
            const clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
            const supabaseName = existingUser.full_name || ''
            
            const isUnknownName = clerkName.toLowerCase().includes('unknown') || 
                                  clerkName.toLowerCase() === 'committee' ||
                                  clerkName.toLowerCase() === 'admin' ||
                                  clerkName.toLowerCase() === 'test'
            
            if (isUnknownName && supabaseName && supabaseName.length > 2) {
              const [firstName, ...lastNameParts] = supabaseName.split(' ')
              const lastName = lastNameParts.join(' ')
              
              try {
                await client.users.updateUser(clerkUser.id, {
                  firstName: firstName,
                  lastName: lastName,
                  publicMetadata: {
                    role: existingUser.role,
                    status: existingUser.status
                  }
                })
                console.log(`✅ Updated Clerk user ${clerkUser.id} name to: ${supabaseName}`)
              } catch (clerkError: any) {
                console.error(`❌ Failed to update Clerk user ${clerkUser.id}:`, clerkError)
              }
            }
            
            synced++
          }

          if (shouldUpdate) {
            const { error } = await adminClient
              .from('users')
              .upsert(updatedFields, { onConflict: 'clerk_id' })
            if (!error) synced++
          }
        } catch (err) {
          console.error(`Background sync error for user ${clerkUser.id}:`, err)
        }
      }
      
      console.log(`✅ Background: Synced ${synced} users from Clerk`)
    } catch (error) {
      console.error('❌ Background sync error:', error)
    } finally {
      fullSyncInFlight = false
    }
  })
}

/**
 * Server-side automatic user sync utility
 * 
 * This function ensures a Clerk user exists in the Supabase database.
 * If the user doesn't exist, it automatically creates them.
 * 
 * This should be called at the beginning of any API route that requires user data.
 * 
 * @param clerkUserId - The Clerk user ID from auth()
 * @returns The user record from Supabase, or null if sync failed
 */
export async function ensureUserExists(clerkUserId: string) {
  const supabase = createAdminClient()
  
  // Trigger background sync of ALL users (non-blocking)
  syncAllUsersInBackground()
  
  try {
    // First, check if user exists in database (retry transient network failures)
    const { data: existingUser, error: queryError } = await withRetry(async () =>
      supabase
        .from('users')
        .select('id, clerk_id, full_name, email, role, status, created_at, updated_at')
        .eq('clerk_id', clerkUserId)
        .single()
    )
    
    // If user exists, return it
    if (existingUser && !queryError) {
      return existingUser
    }
    
    // If error is not "not found", throw it
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error checking user existence:', queryError)
      throw queryError
    }
    
    // User doesn't exist, sync from Clerk
    console.log('User not found in database, syncing from Clerk:', clerkUserId)
    
    // Fetch user from Clerk
    const client = await clerkClient()
    const clerkUser = await withRetry(async () => client.users.getUser(clerkUserId))
    
    if (!clerkUser) {
      console.error('User not found in Clerk:', clerkUserId)
      return null
    }
    
    // Extract user data - use Clerk data for new users
    const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    
    // Get role from metadata (default to 'member')
    const role = (clerkUser.publicMetadata as any)?.role || 'member'
    const status = (clerkUser.publicMetadata as any)?.status || 'active'
    
    console.log('Creating user in database:', { clerkUserId, email, fullName, role, status })
    
    // Insert user into database
    const { data: newUser, error: insertError } = await withRetry(async () =>
      supabase
        .from('users')
        .insert({
          clerk_id: clerkUserId,
          full_name: fullName,
          email: email,
          role: role,
          status: status
        })
        .select()
        .single()
    )
    
    if (insertError) {
      console.error('Error creating user in database:', insertError)
      throw insertError
    }
    
    console.log('User successfully synced to database:', newUser.id)
    
    return newUser
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return null
  }
}

/**
 * Get user from database with automatic sync fallback
 * 
 * This is a convenience wrapper around ensureUserExists that
 * returns the user or throws a user-friendly error.
 * 
 * @param clerkUserId - The Clerk user ID from auth()
 * @returns The user record from Supabase
 * @throws Error if user cannot be synced
 */
export async function getUserOrSync(clerkUserId: string) {
  const user = await ensureUserExists(clerkUserId)
  
  if (!user) {
    const error = new Error('Failed to sync user account. Please try again or contact support.')
    ;(error as Error & { code?: string }).code = 'USER_SYNC_FAILED'
    throw error
  }
  
  return user
}
