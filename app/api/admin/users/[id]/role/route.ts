import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔵 Role update API endpoint called')
    const { userId } = await auth()
    const { id } = await params
    console.log('   Request from userId:', userId)
    console.log('   Target user ID:', id)
    
    if (!userId) {
      console.log('❌ Unauthorized - no userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { role } = body
    console.log('   New role requested:', role)

    if (!['admin', 'finance', 'treasurer', 'secretary', 'embassy', 'member'].includes(role)) {
      console.log('❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
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

    // Only admin can assign roles (including embassy). Secretary cannot.
    if (currentUser.role !== 'admin') {
      return NextResponse.json({
        error: 'Only Admin can assign roles. Embassy role is admin-only.',
      }, { status: 403 })
    }

    // Get target user's Clerk ID
    const { data: targetUser } = await adminClient
      .from('users')
      .select('clerk_id')
      .eq('id', id)
      .single()

    console.log('   Target user clerk_id:', targetUser?.clerk_id)

    // Update user role in Supabase
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating role in Supabase:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    console.log('✅ Supabase updated successfully')

    // Update Clerk metadata to sync the role
    if (targetUser?.clerk_id) {
      try {
        console.log(`🔄 Updating Clerk metadata for user ${targetUser.clerk_id}`)
        console.log(`   New role: ${role}`)
        console.log(`   New status: ${updatedUser.status}`)
        
        const clerk = await clerkClient()
        const result = await clerk.users.updateUserMetadata(targetUser.clerk_id, {
          publicMetadata: {
            role: role,
            status: updatedUser.status
          }
        })
        
        console.log(`✅ Synced role to Clerk successfully`)
        console.log(`   Clerk returned:`, JSON.stringify(result.publicMetadata))
      } catch (clerkError) {
        console.error('❌ Failed to sync role to Clerk:', clerkError)
        console.error('   Clerk ID:', targetUser.clerk_id)
        console.error('   Error details:', clerkError)
        // Don't fail the request - Supabase is updated
      }
    } else {
      console.warn('⚠️  No Clerk ID found for user, skipping Clerk sync')
    }

    // Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        action_type: 'role_changed',
        performed_by: currentUser.id,
        target_id: id,
        details: {
          new_role: role
        }
      })

    return NextResponse.json({ 
      user: updatedUser,
      message: 'Role updated successfully. User may need to sign out and sign in again for changes to take effect.'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
