import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    console.log('Starting Clerk user sync...')

    const supabase = createAdminClient()

    // Fetch all users from Clerk
    const client = await clerkClient()
    const clerkUsers = await client.users.getUserList({ limit: 100 })

    let synced = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const clerkUser of clerkUsers.data) {
      try {
        const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User'
        const email = clerkUser.emailAddresses[0]?.emailAddress || ''
        const role = (clerkUser.publicMetadata as any)?.role || 'member'
        const status = (clerkUser.publicMetadata as any)?.status || 'active'

        // Check if user exists
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
          console.log(`Updated user: ${email}`)
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
          console.log(`Created user: ${email}`)
        }

        synced++
      } catch (error) {
        console.error(`Error syncing user ${clerkUser.id}:`, error)
        errors++
        errorDetails.push(`${clerkUser.emailAddresses[0]?.emailAddress}: ${error}`)
      }
    }

    console.log(`Sync complete: ${synced} synced, ${errors} errors`)

    return NextResponse.json({
      success: true,
      synced,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    })
  } catch (error) {
    console.error('Error syncing users:', error)
    return NextResponse.json(
      { error: 'Failed to sync users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
