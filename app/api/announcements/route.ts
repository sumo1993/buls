import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET all active announcements
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch all active announcements (not expired)
    const { data: announcements, error: announcementsError } = await adminClient
      .from('announcements')
      .select('*')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })

    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError)
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
    }

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error: any) {
    console.error('Error in GET /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new announcement
export async function POST(req: Request) {
  try {
    console.log('🔵 POST /api/announcements - Starting...')
    
    const { userId } = await auth()
    console.log('🔵 Clerk userId:', userId)
    
    if (!userId) {
      console.log('❌ No userId found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    console.log('🔵 Admin client created')

    // Check if user has permission (admin or secretary)
    console.log('🔵 User role:', userData.role)
    if (!['admin', 'secretary'].includes(userData.role)) {
      console.log('❌ Insufficient permissions. Role:', userData.role)
      return NextResponse.json({ error: 'Insufficient permissions. Required: admin or secretary' }, { status: 403 })
    }

    const body = await req.json()
    console.log('🔵 Request body:', body)
    const { title, content, priority, expires_at } = body

    // Validate required fields
    if (!title || !content) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields: title and content are required' }, { status: 400 })
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent']
    const announcementPriority = priority || 'normal'
    if (!validPriorities.includes(announcementPriority)) {
      return NextResponse.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }, { status: 400 })
    }

    // Validate expires_at if provided
    let expiresAt = null
    if (expires_at) {
      expiresAt = new Date(expires_at)
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 })
      }
      // Check if expiration date is in the future
      if (expiresAt <= new Date()) {
        return NextResponse.json({ error: 'Expiration date must be in the future' }, { status: 400 })
      }
    }

    console.log('✅ Creating announcement:', { title, priority: announcementPriority, created_by: userData.id })

    // Insert announcement using admin client to bypass RLS
    const { data: announcement, error: insertError } = await adminClient
      .from('announcements')
      .insert({
        title,
        content,
        priority: announcementPriority,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        created_by: userData.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting announcement:', insertError)
      return NextResponse.json({ error: 'Failed to create announcement: ' + insertError.message }, { status: 500 })
    }

    console.log('✅ Announcement created successfully:', announcement.id)
    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error: any) {
    console.error('💥 Error in POST /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}

// PUT update announcement
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const body = await req.json()
    const { id, title, content, priority, expires_at } = body

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID required' }, { status: 400 })
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }, { status: 400 })
      }
    }

    // Validate expires_at if provided
    if (expires_at !== undefined) {
      if (expires_at !== null) {
        const expiresAt = new Date(expires_at)
        if (isNaN(expiresAt.getTime())) {
          return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 })
        }
      }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (title) updateData.title = title
    if (content) updateData.content = content
    if (priority) updateData.priority = priority
    if (expires_at !== undefined) {
      updateData.expires_at = expires_at ? new Date(expires_at).toISOString() : null
    }

    // Update announcement using admin client
    const { data: announcement, error: updateError } = await adminClient
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating announcement:', updateError)
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
    }

    return NextResponse.json({ announcement })
  } catch (error: any) {
    console.error('Error in PUT /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE announcement
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const announcementId = searchParams.get('id')

    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID required' }, { status: 400 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Delete announcement using admin client
    const { error: deleteError } = await adminClient
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (deleteError) {
      console.error('Error deleting announcement:', deleteError)
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/announcements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
