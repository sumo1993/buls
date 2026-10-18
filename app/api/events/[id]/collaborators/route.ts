import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/collaborators - Get all collaborators for an event
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: eventId } = await params

    const { data: collaborators, error } = await adminClient
      .from('event_collaborators')
      .select(`
        *,
        user:users!event_collaborators_user_id_fkey(id, full_name, email, role),
        added_by_user:users!event_collaborators_added_by_fkey(full_name)
      `)
      .eq('event_id', eventId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Error fetching collaborators:', error)
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    return NextResponse.json({ collaborators })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/collaborators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[id]/collaborators - Add collaborator to event
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: eventId } = await params

    // Get user performing action
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin, secretary, or event creator)
    if (!['admin', 'secretary'].includes(userData.role)) {
      // Check if user is event creator
      const { data: event } = await adminClient
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single()

      if (!event || event.created_by !== userData.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { user_id, role, permissions } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Validate permissions
    const validPermissions = ['edit', 'delete', 'manage_registrations', 'check_in', 'view_analytics']
    const providedPermissions = permissions || ['check_in', 'view_analytics']
    
    const invalidPerms = providedPermissions.filter((p: string) => !validPermissions.includes(p))
    if (invalidPerms.length > 0) {
      return NextResponse.json({ 
        error: `Invalid permissions: ${invalidPerms.join(', ')}` 
      }, { status: 400 })
    }

    // Check if user exists
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .eq('id', user_id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Check if already a collaborator
    const { data: existing } = await adminClient
      .from('event_collaborators')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User is already a collaborator' }, { status: 409 })
    }

    // Add collaborator
    const { data: collaborator, error: insertError } = await adminClient
      .from('event_collaborators')
      .insert({
        event_id: parseInt(eventId),
        user_id,
        role: role || 'co_host',
        permissions: providedPermissions,
        added_by: userData.id
      })
      .select(`
        *,
        user:users!event_collaborators_user_id_fkey(full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error adding collaborator:', insertError)
      return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 })
    }

    return NextResponse.json({
      collaborator,
      message: `${targetUser.full_name} added as collaborator`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/collaborators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/events/[id]/collaborators/[collaboratorUserId] - Remove collaborator
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { id: eventId } = await params
    
    const { searchParams } = new URL(req.url)
    const collaboratorUserId = searchParams.get('user_id')

    if (!collaboratorUserId) {
      return NextResponse.json({ error: 'user_id parameter required' }, { status: 400 })
    }

    // Get user performing action
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permission
    if (!['admin', 'secretary'].includes(userData.role)) {
      const { data: event } = await adminClient
        .from('events')
        .select('created_by')
        .eq('id', eventId)
        .single()

      if (!event || event.created_by !== userData.id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Remove collaborator
    const { error: deleteError } = await adminClient
      .from('event_collaborators')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', collaboratorUserId)

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError)
      return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Collaborator removed successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/events/[id]/collaborators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
