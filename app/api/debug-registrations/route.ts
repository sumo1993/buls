import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Debug endpoint to check registration data
export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Get one registration
    const { data: registration, error } = await adminClient
      .from('non_member_registrations')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get the event for this registration
    let event = null
    if (registration?.event_id) {
      const { data: eventData } = await adminClient
        .from('events')
        .select('*')
        .eq('id', registration.event_id)
        .single()
      
      event = eventData
    }

    return NextResponse.json({
      registration,
      event,
      event_id: registration?.event_id,
      debug: 'This shows raw data from database'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
