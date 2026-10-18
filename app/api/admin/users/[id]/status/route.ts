import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status } = body

    if (!['pending', 'active', 'transferred', 'dropped', 'graduated'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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

    // Get target user's Clerk ID
    const { data: targetUser } = await adminClient
      .from('users')
      .select('clerk_id, role')
      .eq('id', id)
      .single()

    // Update user status in Supabase
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Update Clerk metadata to sync the status
    if (targetUser?.clerk_id) {
      try {
        const clerk = await clerkClient()
        await clerk.users.updateUserMetadata(targetUser.clerk_id, {
          publicMetadata: {
            role: targetUser.role,
            status: status
          }
        })
        console.log(`✅ Synced status to Clerk: ${status} for user ${targetUser.clerk_id}`)
      } catch (clerkError) {
        console.error('Failed to sync status to Clerk:', clerkError)
      }
    }

    // Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        action_type: 'status_changed',
        performed_by: currentUser.id,
        target_id: id,
        details: {
          new_status: status
        }
      })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
