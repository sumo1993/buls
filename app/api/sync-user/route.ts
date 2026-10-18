import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Simple sync endpoint - syncs a Clerk user to Supabase
 * No webhook needed - just call this endpoint with clerkId
 */
export async function POST(req: NextRequest) {
  try {
    const { clerkId } = await req.json()

    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 })
    }

    // Get user from Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(clerkId)

    if (!user) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 })
    }

    // Create Supabase admin client
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const email = user.emailAddresses[0]?.emailAddress || ''
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already synced',
        userId: existingUser.id 
      })
    }

    // Insert into Supabase
    const { error, data } = await supabase
      .from('users')
      .insert({
        clerk_id: user.id,
        email,
        full_name: fullName,
        role: (user.publicMetadata?.role as string) || 'member',
        status: (user.publicMetadata?.status as string) || 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase sync error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User synced successfully',
      user: data
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
