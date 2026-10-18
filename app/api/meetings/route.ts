import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET all meetings
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user to check role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch all meetings
    const { data: meetings, error: meetingsError } = await adminClient
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: true })

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError)
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
    }

    return NextResponse.json({ meetings })
  } catch (error: any) {
    console.error('Error in GET /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new meeting
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user to check role and get user ID
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    console.log('📝 POST /api/meetings - Received body:', body)
    
    const { title, description, meeting_date, meeting_type, zoom_link, zoom_meeting_id, zoom_password, location, is_public } = body

    // Validate required fields
    if (!title || !meeting_date || !meeting_type) {
      console.error('❌ Missing required fields:', { title: !!title, meeting_date: !!meeting_date, meeting_type: !!meeting_type })
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: {
          title: !title ? 'Title is required' : 'OK',
          meeting_date: !meeting_date ? 'Meeting date is required' : 'OK',
          meeting_type: !meeting_type ? 'Meeting type is required' : 'OK'
        }
      }, { status: 400 })
    }

    // Validate meeting date
    const meetingDate = new Date(meeting_date)
    if (isNaN(meetingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid meeting date' }, { status: 400 })
    }

    console.log('✅ Creating meeting:', {
      title,
      meeting_date: meetingDate.toISOString(),
      meeting_type,
      created_by: userData.id
    })

    // Insert meeting using admin client to bypass RLS
    const { data: meeting, error: insertError } = await adminClient
      .from('meetings')
      .insert({
        title,
        description: description || null,
        meeting_date: meetingDate.toISOString(),
        meeting_type,
        zoom_link: zoom_link || null,
        zoom_meeting_id: zoom_meeting_id || null,
        zoom_password: zoom_password || null,
        location: location || null,
        is_public: is_public !== false, // Default to true
        created_by: userData.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting meeting:', insertError)
      return NextResponse.json({ error: 'Failed to create meeting: ' + insertError.message }, { status: 500 })
    }

    console.log('✅ Meeting created successfully:', meeting.id)
    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error: any) {
    console.error('💥 Error in POST /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}

// DELETE meeting
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const meetingId = searchParams.get('id')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user to check role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete meeting using admin client
    const { error: deleteError } = await adminClient
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (deleteError) {
      console.error('Error deleting meeting:', deleteError)
      return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update meeting
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user to check role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { id, title, description, meeting_date, meeting_type, zoom_link, zoom_meeting_id, zoom_password, location, is_public } = body

    if (!id) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Validate meeting date if provided
    if (meeting_date) {
      const meetingDate = new Date(meeting_date)
      if (isNaN(meetingDate.getTime())) {
        return NextResponse.json({ error: 'Invalid meeting date' }, { status: 400 })
      }
    }

    // Update meeting using admin client
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (meeting_date) updateData.meeting_date = new Date(meeting_date).toISOString()
    if (meeting_type) updateData.meeting_type = meeting_type
    if (zoom_link !== undefined) updateData.zoom_link = zoom_link
    if (zoom_meeting_id !== undefined) updateData.zoom_meeting_id = zoom_meeting_id
    if (zoom_password !== undefined) updateData.zoom_password = zoom_password
    if (location !== undefined) updateData.location = location
    if (is_public !== undefined) updateData.is_public = is_public

    const { data: meeting, error: updateError } = await adminClient
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating meeting:', updateError)
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
    }

    return NextResponse.json({ meeting })
  } catch (error: any) {
    console.error('Error in PUT /api/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
