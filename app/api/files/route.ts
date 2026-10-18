import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/files - Get all files (filtered by role)
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let query = adminClient
      .from('files')
      .select(`
        *,
        uploader:users!files_uploaded_by_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })

    // Filter based on role
    if (userData.role === 'admin') {
      // Admins see all files
    } else if (['member', 'secretary', 'treasurer', 'finance'].includes(userData.role)) {
      // Members see public and member files
      query = query.in('visibility', ['public', 'members'])
    } else {
      // Guests see only public files
      query = query.eq('visibility', 'public')
    }

    const { data: files, error } = await query

    if (error) {
      console.error('Error fetching files:', error)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json({ files })
  } catch (error: any) {
    console.error('Error in GET /api/files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/files - Upload a new file
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user and verify admin role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { filename, original_filename, file_url, file_type, file_size, category, visibility, description } = body

    if (!filename || !original_filename || !file_url || !file_type || !file_size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: file, error: insertError } = await adminClient
      .from('files')
      .insert({
        filename,
        original_filename,
        file_url,
        file_type,
        file_size,
        category: category || 'general',
        visibility: visibility || 'members',
        description: description || null,
        uploaded_by: userData.id
      })
      .select(`
        *,
        uploader:users!files_uploaded_by_fkey(id, full_name, email)
      `)
      .single()

    if (insertError) {
      console.error('Error creating file:', insertError)
      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 })
    }

    return NextResponse.json({ file }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/files - Update file metadata
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user and verify admin role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { file_id, category, visibility, description } = body

    if (!file_id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (category !== undefined) updateData.category = category
    if (visibility !== undefined) updateData.visibility = visibility
    if (description !== undefined) updateData.description = description

    const { data: file, error: updateError } = await adminClient
      .from('files')
      .update(updateData)
      .eq('id', file_id)
      .select(`
        *,
        uploader:users!files_uploaded_by_fkey(id, full_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating file:', updateError)
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
    }

    return NextResponse.json({ file })
  } catch (error: any) {
    console.error('Error in PUT /api/files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/files - Delete a file
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user and verify admin role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { file_id } = body

    if (!file_id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    const { error: deleteError } = await adminClient
      .from('files')
      .delete()
      .eq('id', file_id)

    if (deleteError) {
      console.error('Error deleting file:', deleteError)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
