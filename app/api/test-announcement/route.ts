import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Debug endpoint to test announcement creation
 * GET /api/test-announcement - Returns current user info and permissions
 * POST /api/test-announcement - Attempts to create a test announcement
 */

export async function GET() {
  try {
    console.log('🔵 GET /api/test-announcement')
    
    const { userId } = await auth()
    console.log('🔵 Clerk userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        step: 'auth',
        details: 'No userId from Clerk'
      }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Check user in database
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, clerk_id, email, first_name, last_name, role, status')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({
        error: 'Database query failed',
        step: 'user_lookup',
        details: userError.message,
        userId
      }, { status: 500 })
    }

    if (!userData) {
      return NextResponse.json({
        error: 'User not found in database',
        step: 'user_lookup',
        details: 'No user record with this clerk_id',
        userId,
        suggestion: 'Visit /admin/sync-clerk to sync your account'
      }, { status: 404 })
    }

    // Check permissions
    const hasPermission = ['admin', 'secretary'].includes(userData.role)

    // Check announcements table
    const { data: announcements, error: announcementsError } = await adminClient
      .from('announcements')
      .select('id, title, priority, created_at')
      .limit(3)

    return NextResponse.json({
      success: true,
      user: userData,
      hasPermission,
      canCreateAnnouncements: hasPermission,
      announcements: {
        count: announcements?.length || 0,
        recent: announcements || [],
        error: announcementsError?.message
      },
      nextSteps: hasPermission 
        ? ['You can create announcements', 'Try POST to this endpoint']
        : ['Update your role to admin or secretary to create announcements']
    })
  } catch (error: any) {
    console.error('💥 Error in GET /api/test-announcement:', error)
    return NextResponse.json({
      error: 'Internal server error',
      step: 'unknown',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🔵 POST /api/test-announcement - Creating test announcement')
    
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({
        error: 'User not found',
        details: userError?.message
      }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({
        error: 'Insufficient permissions',
        currentRole: userData.role,
        requiredRoles: ['admin', 'secretary']
      }, { status: 403 })
    }

    // Create test announcement
    const testData = {
      title: `Test Announcement ${new Date().toISOString()}`,
      content: 'This is a test announcement created by the debug API endpoint.',
      priority: 'normal',
      created_by: userData.id,
      expires_at: null
    }

    console.log('🔵 Inserting test announcement:', testData)

    const { data: announcement, error: insertError } = await adminClient
      .from('announcements')
      .insert(testData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return NextResponse.json({
        error: 'Failed to insert announcement',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint
      }, { status: 500 })
    }

    console.log('✅ Test announcement created:', announcement)

    return NextResponse.json({
      success: true,
      message: 'Test announcement created successfully',
      announcement
    })
  } catch (error: any) {
    console.error('💥 Error in POST /api/test-announcement:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
