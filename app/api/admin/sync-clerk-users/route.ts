import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all Clerk users
    const client = await clerkClient()
    const clerkUsers = await client.users.getUserList({ limit: 500 })

    let synced = 0
    let skipped = 0
    let errors = 0
    const details: any[] = []

    // Sync each user
    for (const clerkUser of clerkUsers.data) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkUser.id)
          .single()

        if (existingUser) {
          skipped++
          continue
        }

        // Get user details
        const email = clerkUser.emailAddresses[0]?.emailAddress || ''
        const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
                         email.split('@')[0] || 'User'

        // Create user in Supabase
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            clerk_id: clerkUser.id,
            email: email,
            full_name: fullName,
            role: 'member',
            status: 'pending',
          })

        if (insertError) {
          errors++
        } else {
          synced++
          details.push({
            name: fullName,
            email: email
          })
        }
      } catch (err) {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      total: clerkUsers.totalCount,
      synced,
      skipped,
      errors,
      details: details.slice(0, 20) // Return first 20 for display
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
