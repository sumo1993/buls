import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Test endpoint to check registrations data (no auth required)
export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Fetch registrations
    const { data: regsOnly, error: error1 } = await adminClient
      .from('non_member_registrations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2)
    
    if (error1) {
      console.error('Error fetching registrations:', error1)
      return NextResponse.json({ error: error1.message }, { status: 500 })
    }

    console.log('=== TEST REGISTRATIONS FETCH ===')
    console.log('Registrations count:', regsOnly?.length || 0)
    
    // Fetch events separately
    if (regsOnly && regsOnly.length > 0) {
      const eventIds = [...new Set(regsOnly.map(r => r.event_id).filter(Boolean))]
      console.log('Event IDs to fetch:', eventIds)
      
      const { data: events, error: eventsError } = await adminClient
        .from('events')
        .select('id, title, event_date, location')
        .in('id', eventIds)
      
      console.log('Events fetched:', events?.length || 0)
      if (events && events.length > 0) {
        console.log('First event:', JSON.stringify(events[0], null, 2))
      }
      
      const merged = regsOnly.map(reg => ({
        ...reg,
        events: events?.find(e => e.id === reg.event_id) || null
      }))
      
      console.log('First merged registration:', JSON.stringify(merged[0], null, 2))
      
      return NextResponse.json({ 
        registrations: merged,
        debug: {
          registrationCount: regsOnly.length,
          eventCount: events?.length || 0,
          eventIds,
          events
        }
      })
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
