import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get current user
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target user (service role — admin must see everyone)
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Update user status to active
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving user:', updateError)
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    }

    if (targetUser.clerk_id) {
      try {
        const clerk = await clerkClient()
        await clerk.users.updateUserMetadata(targetUser.clerk_id, {
          publicMetadata: {
            role: targetUser.role,
            status: 'active',
          },
        })
      } catch (clerkError) {
        console.error('Failed to sync approve to Clerk:', clerkError)
      }
    }

    // Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        action_type: 'user_approved',
        performed_by: currentUser.id,
        target_id: id,
        details: {
          user_name: targetUser.full_name,
          user_email: targetUser.email
        }
      })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
