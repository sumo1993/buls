import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

// GET - Secretary fetches all non-member registrations
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.error('No userId found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching registrations for secretary, userId:', userId)

    const supabase = await createClient()

    // Fetch registrations without join first
    const { data: regsOnly, error: error1 } = await supabase
      .from('non_member_registrations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error1) {
      console.error('Error fetching registrations:', error1)
      return NextResponse.json({ error: error1.message }, { status: 500 })
    }

    console.log('=== SECRETARY REGISTRATIONS FETCH ===')
    console.log('Registrations count:', regsOnly?.length || 0)
    
    // Fetch events separately and merge
    if (regsOnly && regsOnly.length > 0) {
      const eventIds = [...new Set(regsOnly.map(r => r.event_id).filter(Boolean))]
      console.log('Event IDs to fetch:', eventIds)
      
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_date, location')
        .in('id', eventIds)
      
      if (eventsError) {
        console.error('Error fetching events:', eventsError)
      }
      
      console.log('Events fetched:', events?.length || 0)
      if (events && events.length > 0) {
        console.log('First event sample:', JSON.stringify(events[0], null, 2))
      } else {
        console.log('NO EVENTS RETURNED! Error:', eventsError)
      }
      
      const merged = regsOnly.map(reg => ({
        ...reg,
        events: events?.find(e => e.id === reg.event_id) || null
      }))
      
      console.log('First merged registration:', JSON.stringify(merged[0], null, 2))
      
      return NextResponse.json({ registrations: merged })
    }
    
    return NextResponse.json({ registrations: regsOnly || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }, { status: 500 })
  }
}

// PATCH - Secretary updates registration status
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('non_member_registrations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating registration:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ registration: data })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
