import { clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Server-side utility to sync a user from Clerk to Supabase
 * This should be called in API routes when a user is not found in the database
 */
export async function syncUserFromClerk(clerkUserId: string) {
  try {
    console.log('🔄 Syncing user from Clerk to Supabase:', clerkUserId)

    // Fetch user from Clerk API
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerkUserId)

    if (!clerkUser) {
      console.error('❌ User not found in Clerk:', clerkUserId)
      return { success: false, error: 'User not found in Clerk' }
    }

    // Extract user data
    const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
    const email = clerkUser.emailAddresses[0]?.emailAddress || ''
    
    // Get role from public metadata (if set by admin)
    const role = (clerkUser.publicMetadata as any)?.role || 'member'
    const status = (clerkUser.publicMetadata as any)?.status || 'active'

    // Insert into Supabase using admin client (bypasses RLS)
    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUser, error: checkError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', clerkUserId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', checkError)
      return { success: false, error: checkError.message }
    }

    if (existingUser) {
      // PRESERVE SUPABASE DATA - don't overwrite with Clerk data
      // Only update Clerk public metadata to match Supabase if needed
      const clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
      const supabaseName = existingUser.full_name || ''
      
      const isUnknownName = clerkName.toLowerCase().includes('unknown') || 
                            clerkName.toLowerCase() === 'committee' ||
                            clerkName.toLowerCase() === 'admin' ||
                            clerkName.toLowerCase() === 'test'
      
      if (isUnknownName && supabaseName && supabaseName.length > 2) {
        // Clerk has invalid name, update it from Supabase
        const [firstName, ...lastNameParts] = supabaseName.split(' ')
        const lastName = lastNameParts.join(' ')
        
        try {
          await clerkClient().users.updateUser(clerkUserId, {
            firstName: firstName,
            lastName: lastName,
            publicMetadata: {
              role: existingUser.role,
              status: existingUser.status
            }
          })
          console.log(`✅ Updated Clerk user ${clerkUserId} name to: ${supabaseName}`)
        } catch (clerkError: any) {
          console.error(`❌ Failed to update Clerk user ${clerkUserId}:`, clerkError)
        }
      }
      
      // Don't update Supabase from Clerk - Supabase is the source of truth
      console.log('✅ User exists in Supabase, preserving Supabase data')
      return { success: true, action: 'preserved' }
    }

    // Insert new user
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        clerk_id: clerkUserId,
        full_name: fullName,
        email: email,
        role: role,
        status: status
      })

    if (insertError) {
      console.error('❌ Error inserting user in Supabase:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log('✅ User synced successfully')
    return { success: true, action: 'created' }
  } catch (error) {
    console.error('❌ Error syncing user:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Sync ALL users from Clerk to Supabase in the background
 * This runs automatically and doesn't block the user
 */
// Full Clerk sync is expensive — disabled unless ENABLE_CLERK_FULL_SYNC=true
const FULL_SYNC_COOLDOWN_MS = 10 * 60 * 1000
const ENABLE_BACKGROUND_FULL_SYNC = process.env.ENABLE_CLERK_FULL_SYNC === 'true'
let lastFullSyncAt = 0
let fullSyncInFlight = false

export async function syncAllUsersInBackground() {
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
              // Clerk has invalid name, update it from Supabase
              const [firstName, ...lastNameParts] = supabaseName.split(' ')
              const lastName = lastNameParts.join(' ')
              
              try {
                const clerk = await clerkClient()
                await clerk.users.updateUser(clerkUser.id, {
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
            
            // Don't sync from Clerk to Supabase - Supabase is the source of truth
            if (!shouldUpdate) synced++
          }
          
          if (shouldUpdate) {
            const { error } = await adminClient
              .from('users')
              .upsert(updatedFields, {
                onConflict: 'clerk_id'
              })
            
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
 * Get or sync user - ensures user exists in Supabase
 * Returns the Supabase user record
 * Also triggers a background sync of all users
 */
export async function getOrSyncUser(clerkUserId: string) {
  try {
    const adminClient = createAdminClient()

    // Trigger background sync of all users (non-blocking)
    syncAllUsersInBackground()

    // Try to get user from Supabase first
    const { data: user, error } = await adminClient
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .single()

    if (user) {
      console.log('✅ User found in Supabase:', user.id)
      return { success: true, user }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching user from Supabase:', error)
      return { success: false, error: error.message }
    }

    // User not found, sync from Clerk
    console.log('⚠️ User not found in Supabase, syncing from Clerk...')
    const syncResult = await syncUserFromClerk(clerkUserId)

    if (!syncResult.success) {
      return { success: false, error: syncResult.error }
    }

    // Get the synced user
    const { data: syncedUser } = await adminClient
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .single()

    if (!syncedUser) {
      return { success: false, error: 'Failed to retrieve synced user' }
    }

    return { success: true, user: syncedUser }
  } catch (error) {
    console.error('❌ Error in getOrSyncUser:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
