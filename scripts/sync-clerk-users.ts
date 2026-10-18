import { clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function syncUsers() {
  console.log('🚀 Starting Clerk user sync...')

  const supabase = createAdminClient()

  // Fetch all users from Clerk
  const client = await clerkClient()
  const clerkUsers = await client.users.getUserList({ limit: 100 })

  console.log(`📊 Found ${clerkUsers.data.length} users in Clerk`)

  let synced = 0
  let updated = 0
  let errors = 0

  for (const clerkUser of clerkUsers.data) {
    try {
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''
      const role = (clerkUser.publicMetadata as any)?.role || 'member'
      const status = (clerkUser.publicMetadata as any)?.status || 'active'

      // Check if user exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUser.id)
        .single()

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: fullName,
            email: email,
            role: role,
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_id', clerkUser.id)

        if (error) throw error
        console.log(`✅ Updated: ${email}`)
        updated++
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert({
            clerk_id: clerkUser.id,
            full_name: fullName,
            email: email,
            role: role,
            status: status
          })

        if (error) throw error
        console.log(`✅ Created: ${email}`)
        synced++
      }
    } catch (error) {
      console.error(`❌ Error syncing ${clerkUser.emailAddresses[0]?.emailAddress}:`, error)
      errors++
    }
  }

  console.log(`\n✨ Sync complete: ${synced} created, ${updated} updated, ${errors} errors`)
}

syncUsers()
