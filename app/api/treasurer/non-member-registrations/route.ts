import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

// GET - Treasurer fetches non-member registrations with payment proofs
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.error('No userId found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching registrations for treasurer, userId:', userId)

    const supabase = await createClient()

    // Fetch all non-member registrations (not just those with payment proofs)
    const { data: regsOnly, error: error1 } = await supabase
      .from('non_member_registrations')
      .select('*')
      .order('registered_at', { ascending: false })
    
    if (error1) {
      console.error('Error fetching registrations:', error1)
      return NextResponse.json({ error: error1.message }, { status: 500 })
    }

    console.log('=== TREASURER REGISTRATIONS FETCH ===')
    console.log('Registrations count:', regsOnly?.length || 0)
    
    // Fetch events separately and merge
    if (regsOnly && regsOnly.length > 0) {
      const eventIds = [...new Set(regsOnly.map(r => r.event_id).filter(Boolean))]
      console.log('Event IDs to fetch:', eventIds)
      
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_date, location')
        .in('id', eventIds)
      
      console.log('Events fetched:', events?.length || 0)
      
      const merged = regsOnly.map(reg => ({
        ...reg,
        events: events?.find(e => e.id === reg.event_id) || null,
        // Generate transaction number for display
        transaction_number: `TRX-${reg.id.slice(0, 8).toUpperCase()}-${new Date(reg.registered_at).getFullYear()}`
      }))
      
      return NextResponse.json({ registrations: merged })
    }
    
    // Format single registrations
    const singleRegs = (regsOnly || []).map(reg => ({
      ...reg,
      events: null,
      transaction_number: `TRX-${reg.id.slice(0, 8).toUpperCase()}-${new Date(reg.registered_at).getFullYear()}`
    }))
    
    return NextResponse.json({ registrations: singleRegs })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }, { status: 500 })
  }
}

// PATCH - Treasurer verifies payment AND approves registration
export async function PATCH(req: Request) {
  try {
    console.log('=== PAYMENT VERIFICATION REQUEST START ===')
    
    const { userId } = await auth()
    console.log('Auth userId:', userId)
    
    if (!userId) {
      console.error('No userId - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized - No user ID found' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
      console.log('Request body parsed:', body)
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const { id, payment_verified } = body

    if (!id) {
      console.error('Missing id field')
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    if (payment_verified === undefined || payment_verified === null) {
      console.error('Missing payment_verified field')
      return NextResponse.json({ error: 'Missing required field: payment_verified' }, { status: 400 })
    }

    console.log('Creating Supabase client...')
    const supabase = await createClient()

    // First, check if the registration exists
    console.log('Checking if registration exists with id:', id)
    const { data: existingReg, error: selectError } = await supabase
      .from('non_member_registrations')
      .select('*')
      .eq('id', id)

    console.log('Existing registration query result:', existingReg)
    console.log('Existing registration query error:', selectError)

    if (selectError) {
      console.error('Error checking registration:', selectError)
      return NextResponse.json({ 
        error: `Database select error: ${selectError.message}`,
        details: selectError
      }, { status: 500 })
    }

    if (!existingReg || existingReg.length === 0) {
      console.error('Registration not found in database with id:', id)
      return NextResponse.json({ 
        error: 'Registration not found in database',
        id: id,
        hint: 'The registration may have been deleted or the ID is incorrect'
      }, { status: 404 })
    }

    console.log('Registration exists:', existingReg[0])

    // If payment is verified, approve the registration (treasurer has full authority)
    // If rejected, mark as rejected
    const newStatus = payment_verified ? 'approved' : 'rejected'
    
    console.log('Updating registration:', id, 'to status:', newStatus)

    const { data, error } = await supabase
      .from('non_member_registrations')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase error updating registration:', error)
      return NextResponse.json({ 
        error: `Database update error: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('Update returned no data for id:', id)
      return NextResponse.json({ 
        error: 'Update failed - no rows returned',
        id: id,
        hint: 'The record exists but could not be updated. Check RLS policies.'
      }, { status: 500 })
    }

    console.log('Registration updated successfully:', data[0])
    console.log('=== PAYMENT VERIFICATION REQUEST END ===')
    return NextResponse.json({ registration: data[0] }, { status: 200 })
    
  } catch (error: any) {
    console.error('=== UNEXPECTED ERROR IN PATCH ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}`,
      type: error.constructor.name
    }, { status: 500 })
  }
}
