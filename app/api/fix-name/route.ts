import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newName } = await req.json()

    if (!newName || newName.trim().length < 2) {
      return NextResponse.json({ error: 'Please provide a valid name (at least 2 characters)' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Find the user by clerk_id
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, full_name')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update the user's name in Supabase
    const { error: updateError } = await adminClient
      .from('users')
      .update({ full_name: newName, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user name:', updateError)
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
    }

    console.log(`✅ Updated user ${user.id} name to: ${newName}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Name updated successfully',
      user: { id: user.id, full_name: newName }
    })
  } catch (error) {
    console.error('Error in fix-name endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to update name',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
