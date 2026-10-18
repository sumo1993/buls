import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await import('@clerk/nextjs/server').then(m => m.auth())
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Looking up user with clerk_id:', userId)

    const currentUser = await getUserOrSync(userId)

    if (!currentUser) {
      console.error('User not found in database for clerk_id:', userId)
      return NextResponse.json({ error: 'User not found in database. Please ensure you are registered.' }, { status: 404 })
    }

    console.log('Current user role:', currentUser.role)

    // Use regular client with service role key for operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Allow admin, secretary, and finance roles to assign ranks
    const allowedRoles = ['admin', 'secretary', 'finance']
    if (!allowedRoles.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Admin, Secretary, or Finance access required' }, { status: 403 })
    }

    const body = await req.json()
    const { targetUserId, rankId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update user's union rank
    const { error } = await supabase
      .from('users')
      .update({ union_rank_id: rankId || null })
      .eq('id', targetUserId)

    if (error) {
      console.error('Error assigning rank:', error)
      return NextResponse.json({ error: 'Failed to assign rank' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Rank assigned successfully' })

  } catch (error) {
    console.error('Assign rank error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
