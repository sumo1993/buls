import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Search for Theo in Supabase
    const { data: theoSupabase, error: supabaseError } = await adminClient
      .from('users')
      .select('*')
      .ilike('full_name', '%theo%')
      .or('email.ilike.%theo%')
      .maybeSingle()

    // Search for Theo in Clerk (using admin client)
    const client = await clerkClient()
    const clerkUsers = await client.users.getUserList({
      limit: 100,
      query: 'theo'  // Search for "theo" in name or email
    })

    const theoInClerk = clerkUsers.data.find(u => 
      u.firstName?.toLowerCase().includes('theo') || 
      u.lastName?.toLowerCase().includes('theo') ||
      u.emailAddresses[0]?.emailAddress?.toLowerCase().includes('theo')
    )

    // If Theo not found in search, try to get user by ID
    let clerkUserById = null
    if (theoSupabase && theoSupabase.clerk_id) {
      try {
        clerkUserById = await client.users.getUser(theoSupabase.clerk_id)
      } catch (err) {
        console.error('Failed to get Clerk user by ID:', err)
      }
    }

    console.log('Theo in Supabase:', theoSupabase)
    console.log('Theo in Clerk:', theoInClerk)
    console.log('Theo in Clerk by ID:', clerkUserById)

    return NextResponse.json({
      theoInSupabase: theoSupabase,
      theoInClerk: theoInClerk || clerkUserById,
      clerkSearchResults: {
        total: clerkUsers.data.length,
        theoIndex: clerkUsers.data.findIndex(u => 
          u.firstName?.toLowerCase().includes('theo') || 
          u.lastName?.toLowerCase().includes('theo')
        )
      },
      notes: [
        'This endpoint shows Theo\'s data in both Supabase and Clerk',
        'Searches for "theo" in full_name or email'
      ]
    })
  } catch (error) {
    console.error('Error in Theo debug endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Theo data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
