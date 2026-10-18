import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Sync current logged-in user to Supabase
 * Called automatically by dashboard on load
 */
export async function POST() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create Supabase admin client
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const email = user.emailAddresses[0]?.emailAddress || ''
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, full_name, role, status')
      .eq('clerk_id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already synced',
        user: existingUser 
      })
    }

    // Insert new user
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
      
      // Check if it's a duplicate email error
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'User with this email already exists',
          code: 'DUPLICATE_EMAIL'
        }, { status: 409 })
      }
      
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
