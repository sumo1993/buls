import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/categories - Get categories for an event
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

    const { data: mappings, error } = await adminClient
      .from('event_category_mappings')
      .select(`
        *,
        category:event_categories(*)
      `)
      .eq('event_id', eventId)

    if (error) {
      console.error('Error fetching event categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const categories = mappings.map((m: any) => m.category)

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[id]/categories - Assign categories to event
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
    const { category_ids } = body

    if (!Array.isArray(category_ids)) {
      return NextResponse.json({ error: 'category_ids must be an array' }, { status: 400 })
    }

    // Delete existing mappings
    await adminClient
      .from('event_category_mappings')
      .delete()
      .eq('event_id', eventId)

    // Insert new mappings
    if (category_ids.length > 0) {
      const mappings = category_ids.map(category_id => ({
        event_id: parseInt(eventId),
        category_id
      }))

      const { error: insertError } = await adminClient
        .from('event_category_mappings')
        .insert(mappings)

      if (insertError) {
        console.error('Error assigning categories:', insertError)
        return NextResponse.json({ error: 'Failed to assign categories' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Categories updated successfully'
    })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
