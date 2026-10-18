import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/feedback - Get all feedback for an event
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

    const { data: feedback, error } = await adminClient
      .from('event_feedback')
      .select(`
        *,
        user:users(full_name, email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    // Hide user info for anonymous feedback
    const processedFeedback = feedback.map((f: any) => ({
      ...f,
      user: f.is_anonymous ? { full_name: 'Anonymous', email: '' } : f.user
    }))

    // Calculate stats
    const stats = {
      total_feedback: feedback.length,
      average_rating: feedback.length > 0 
        ? (feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / feedback.length).toFixed(2)
        : 0,
      rating_distribution: {
        5: feedback.filter((f: any) => f.rating === 5).length,
        4: feedback.filter((f: any) => f.rating === 4).length,
        3: feedback.filter((f: any) => f.rating === 3).length,
        2: feedback.filter((f: any) => f.rating === 2).length,
        1: feedback.filter((f: any) => f.rating === 1).length,
      }
    }

    return NextResponse.json({ feedback: processedFeedback, stats })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[id]/feedback - Submit feedback for an event
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

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { rating, comment, feedback_type, is_anonymous } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user already submitted feedback
    const { data: existing } = await adminClient
      .from('event_feedback')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userData.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already submitted feedback for this event' }, { status: 409 })
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await adminClient
      .from('event_feedback')
      .insert({
        event_id: parseInt(eventId),
        user_id: userData.id,
        rating,
        comment: comment || null,
        feedback_type: feedback_type || 'general',
        is_anonymous: is_anonymous || false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error submitting feedback:', insertError)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    return NextResponse.json({ 
      feedback,
      message: 'Thank you for your feedback!'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/events/[id]/feedback - Update own feedback
export async function PUT(
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

    // Get user
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { rating, comment } = body

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Update feedback
    const updateData: any = { updated_at: new Date().toISOString() }
    if (rating) updateData.rating = rating
    if (comment !== undefined) updateData.comment = comment

    const { data: feedback, error: updateError } = await adminClient
      .from('event_feedback')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('user_id', userData.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating feedback:', updateError)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback, message: 'Feedback updated successfully' })
  } catch (error: any) {
    console.error('Error in PUT /api/events/[id]/feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
