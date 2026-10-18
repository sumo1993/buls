import { NextRequest, NextResponse } from 'next/server'

/**
 * Check if a user is synced between Clerk and Supabase
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clerkId = searchParams.get('clerkId')

    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 })
    }

    const { getSupabaseClient } = await import('@/lib/supabase/connection-pool')
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status')
      .eq('clerk_id', clerkId)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ 
        synced: false,
        message: 'User not found in Supabase' 
      })
    }

    return NextResponse.json({ 
      synced: true,
      user: data
    })

  } catch (error) {
    console.error('Check sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check failed' },
      { status: 500 }
    )
  }
}
