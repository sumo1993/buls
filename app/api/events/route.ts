import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import { normalizeTshirtSizes } from '@/lib/event-tshirts'
import { getEventOccupancy, spotsRemaining } from '@/lib/event-capacity'

// GET all public events OR single event by ID (public — no login required)
export async function GET(req: Request) {
  try {
    // Optional auth — guests can browse events
    await auth().catch(() => null)

    const adminClient = createAdminClient()

    // Check if requesting single event by ID
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('id')

    if (eventId) {
      // Fetch single event (without count relations - use explicit queries)
      const { data: event, error: eventError } = await adminClient
        .from('events')
        .select(`*`)
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const occupancy = await getEventOccupancy(adminClient, event.id)
      const totalRegistrations = occupancy.total

      // Fetch ratings count for single event view
      const { count: ratingCount } = await adminClient
        .from('event_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)

      // Fetch average rating
      const { data: ratings, error: ratingsError } = await adminClient
        .from('event_feedback')
        .select('rating')
        .eq('event_id', event.id)

      const avgRating = ratingsError || !ratings || ratings.length === 0
        ? 0
        : ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length

      // Fetch categories for single event view
      const { data: categoryMappings, error: categoryError } = await adminClient
        .from('event_category_mappings')
        .select('event_categories(*)')
        .eq('event_id', event.id)

      const categories = categoryError || !categoryMappings
        ? []
        : categoryMappings.map((mapping: any) => mapping.event_categories).filter(Boolean) || []

      const processedEvent = {
        ...event,
        registration_count: totalRegistrations,
        occupancy,
        average_rating: avgRating,
        rating_count: ratingCount || 0,
        categories: categories,
        spots_remaining: spotsRemaining(event.capacity, totalRegistrations)
      }

      return NextResponse.json({ event: processedEvent })
    }

    // List view: counts only (no full feedback arrays) + recent window
    // Get all events with their counts using direct count queries
    const { data: events, error: eventsError } = await adminClient
      .from('events')
      .select(`*`)
      .order('event_date', { ascending: false })
      .limit(100)

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events', details: eventsError.message }, { status: 500 })
    }

    const processedEvents = await Promise.all(
      (events || []).map(async (event: any) => {
        const occupancy = await getEventOccupancy(adminClient, event.id)
        const totalRegistrations = occupancy.total
        
        const now = new Date()
        const eventDate = new Date(event.event_date)
        const regDeadline = event.registration_deadline ? new Date(event.registration_deadline) : null
        
        let registrationStatus = 'open'
        if (eventDate < now || event.status === 'cancelled' || event.status === 'completed') {
          registrationStatus = 'closed'
        } else if (regDeadline && regDeadline < now) {
          registrationStatus = 'closed'
        } else if (event.capacity && totalRegistrations >= event.capacity) {
          registrationStatus = 'full'
        }

        return {
          ...event,
          registration_count: totalRegistrations,
          occupancy,
          registration_status: registrationStatus,
          spots_remaining: spotsRemaining(event.capacity, totalRegistrations)
        }
      })
    )

    return NextResponse.json({ 
      events: processedEvents,
      stats: {
        total_events: processedEvents.length,
        total_registrations: processedEvents.reduce((sum, e) => sum + (e.registration_count || 0), 0)
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new event
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      title, 
      description, 
      event_date, 
      location, 
      event_type,
      event_format,
      online_link,
      online_meeting_id,
      online_password,
      requires_registration, 
      registration_deadline, 
      event_file_url, 
      capacity, 
      waitlist_enabled, 
      cover_image_url,
      max_guests_per_member,
      allow_guest_registration,
      is_public,
      ticket_only,
      allow_public_registration,
      require_guest_approval,
      payment_qr_code_url,
      tshirt_enabled,
      tshirt_pricing,
      tshirt_price,
      tshirt_sizes,
      tshirt_required,
      tshirt_stock,
      tshirt_image_url
    } = body

    // Validate required fields
    if (!title || !event_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate event date
    const eventDate = new Date(event_date)
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: 'Invalid event date' }, { status: 400 })
    }

    // Validate registration deadline if provided
    let regDeadline = null
    if (registration_deadline) {
      regDeadline = new Date(registration_deadline)
      if (isNaN(regDeadline.getTime())) {
        return NextResponse.json({ error: 'Invalid registration deadline' }, { status: 400 })
      }
    }

    // Validate capacity
    if (capacity && capacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 })
    }

    // Validate event_type (pricing / registration model)
    const validEventTypes = ['free', 'ticket_only', 'registration_required', 'hybrid']
    if (event_type && !validEventTypes.includes(event_type)) {
      return NextResponse.json({ 
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Venue format: in person / online / hybrid (Zoom etc.)
    const validFormats = ['in_person', 'online', 'hybrid']
    const resolvedFormat = validFormats.includes(event_format) ? event_format : 'in_person'
    const needsOnline = resolvedFormat === 'online' || resolvedFormat === 'hybrid'
    const resolvedOnlineLink = needsOnline ? online_link || null : null
    const resolvedOnlineId = needsOnline ? online_meeting_id || null : null
    const resolvedOnlinePassword = needsOnline ? online_password || null : null

    // Validate max_guests_per_member
    if (max_guests_per_member !== undefined && (max_guests_per_member < 0 || max_guests_per_member > 10)) {
      return NextResponse.json({ 
        error: 'max_guests_per_member must be between 0 and 10' 
      }, { status: 400 })
    }

    const tshirtEnabled = !!tshirt_enabled
    const tshirtPricing = tshirt_pricing === 'paid' ? 'paid' : 'free'
    const normalizedSizes = normalizeTshirtSizes(tshirt_sizes)
    const parsedTshirtPrice =
      tshirt_price !== undefined && tshirt_price !== null && tshirt_price !== ''
        ? Number(tshirt_price)
        : null

    if (tshirtEnabled && tshirtPricing === 'paid') {
      if (parsedTshirtPrice === null || Number.isNaN(parsedTshirtPrice) || parsedTshirtPrice < 0) {
        return NextResponse.json({ error: 'T-shirt price is required for paid shirts' }, { status: 400 })
      }
    }

    console.log('✅ Creating event:', { 
      title, 
      event_date: eventDate.toISOString(), 
      created_by: userData.id,
      event_type: event_type || 'free',
      event_format: resolvedFormat,
    })

    // Insert event using admin client to bypass RLS
    const { data: event, error: insertError } = await adminClient
      .from('events')
      .insert({
        title,
        description: description || null,
        event_date: eventDate.toISOString(),
        location: resolvedFormat === 'online' ? location || 'Online' : location || null,
        event_type: event_type || 'free',
        event_format: resolvedFormat,
        online_link: resolvedOnlineLink,
        online_meeting_id: resolvedOnlineId,
        online_password: resolvedOnlinePassword,
        requires_registration: requires_registration || false,
        registration_deadline: regDeadline ? regDeadline.toISOString() : null,
        event_file_url: event_file_url || null,
        capacity: capacity || null,
        waitlist_enabled: waitlist_enabled || false,
        cover_image_url: cover_image_url || null,
        max_guests_per_member: max_guests_per_member || 0,
        allow_guest_registration: allow_guest_registration || false,
        is_public: is_public !== undefined ? is_public : true,
        ticket_only: ticket_only || false,
        allow_public_registration: allow_public_registration || false,
        require_guest_approval: require_guest_approval !== undefined ? require_guest_approval : true,
        payment_qr_code_url: payment_qr_code_url || null,
        tshirt_enabled: tshirtEnabled,
        tshirt_pricing: tshirtPricing,
        tshirt_price: tshirtEnabled && tshirtPricing === 'paid' ? parsedTshirtPrice : null,
        tshirt_sizes: normalizedSizes,
        tshirt_required: tshirtEnabled ? !!tshirt_required : false,
        tshirt_stock: tshirt_stock ?? null,
        tshirt_image_url: tshirtEnabled ? tshirt_image_url || null : null,
        status: 'upcoming',
        created_by: userData.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting event:', insertError)
      return NextResponse.json({ error: 'Failed to create event: ' + insertError.message }, { status: 500 })
    }

    console.log('✅ Event created successfully:', event.id)
    return NextResponse.json({ event }, { status: 201 })
  } catch (error: any) {
    console.error('💥 Error in POST /api/events:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}

// DELETE event
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('id')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete event using admin client
    const { error: deleteError } = await adminClient
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update event
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

    const adminClient = createAdminClient()

    // Check if user has permission (admin or secretary)
    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      id, 
      title, 
      description, 
      event_date, 
      location, 
      event_type,
      event_format,
      online_link,
      online_meeting_id,
      online_password,
      requires_registration, 
      registration_deadline, 
      event_file_url, 
      capacity, 
      waitlist_enabled, 
      status, 
      cover_image_url,
      max_guests_per_member,
      allow_guest_registration,
      is_public,
      ticket_only,
      allow_public_registration,
      require_guest_approval,
      payment_qr_code_url,
      tshirt_enabled,
      tshirt_pricing,
      tshirt_price,
      tshirt_sizes,
      tshirt_required,
      tshirt_stock,
      tshirt_image_url
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    // Validate event date if provided
    if (event_date) {
      const eventDate = new Date(event_date)
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json({ error: 'Invalid event date' }, { status: 400 })
      }
    }

    // Validate capacity
    if (capacity !== undefined && capacity !== null && capacity < 1) {
      return NextResponse.json({ error: 'Capacity must be at least 1' }, { status: 400 })
    }

    // Validate event_type if provided
    if (event_type) {
      const validEventTypes = ['free', 'ticket_only', 'registration_required', 'hybrid']
      if (!validEventTypes.includes(event_type)) {
        return NextResponse.json({ 
          error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
        }, { status: 400 })
      }
    }

    // Validate max_guests_per_member if provided
    if (max_guests_per_member !== undefined && (max_guests_per_member < 0 || max_guests_per_member > 10)) {
      return NextResponse.json({ 
        error: 'max_guests_per_member must be between 0 and 10' 
      }, { status: 400 })
    }

    // Update event using admin client
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (event_date) updateData.event_date = new Date(event_date).toISOString()
    if (location !== undefined) updateData.location = location
    if (event_type) updateData.event_type = event_type
    if (status) updateData.status = status

    const validFormats = ['in_person', 'online', 'hybrid']
    if (event_format !== undefined) {
      if (event_format && !validFormats.includes(event_format)) {
        return NextResponse.json(
          { error: `Invalid event_format. Must be one of: ${validFormats.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.event_format = event_format || 'in_person'
    }
    if (online_link !== undefined) updateData.online_link = online_link || null
    if (online_meeting_id !== undefined) updateData.online_meeting_id = online_meeting_id || null
    if (online_password !== undefined) updateData.online_password = online_password || null
    // Clear online fields when switching to in-person only
    if (event_format === 'in_person') {
      updateData.online_link = null
      updateData.online_meeting_id = null
      updateData.online_password = null
    }
    
    // Only add new fields if they exist in the request (backward compatible)
    if (requires_registration !== undefined) {
      updateData.requires_registration = requires_registration
    }
    if (registration_deadline !== undefined) {
      updateData.registration_deadline = registration_deadline ? new Date(registration_deadline).toISOString() : null
    }
    if (event_file_url !== undefined) {
      updateData.event_file_url = event_file_url
    }
    if (capacity !== undefined) {
      updateData.capacity = capacity
    }
    if (waitlist_enabled !== undefined) {
      updateData.waitlist_enabled = waitlist_enabled
    }
    if (cover_image_url !== undefined) {
      updateData.cover_image_url = cover_image_url
    }
    if (max_guests_per_member !== undefined) {
      updateData.max_guests_per_member = max_guests_per_member
    }
    if (allow_guest_registration !== undefined) {
      updateData.allow_guest_registration = allow_guest_registration
    }
    if (is_public !== undefined) {
      updateData.is_public = is_public
    }
    if (ticket_only !== undefined) {
      updateData.ticket_only = ticket_only
    }
    if (allow_public_registration !== undefined) {
      updateData.allow_public_registration = allow_public_registration
    }
    if (require_guest_approval !== undefined) {
      updateData.require_guest_approval = require_guest_approval
    }
    if (payment_qr_code_url !== undefined) {
      updateData.payment_qr_code_url = payment_qr_code_url
    }

    if (tshirt_enabled !== undefined) {
      updateData.tshirt_enabled = !!tshirt_enabled
    }
    if (tshirt_pricing !== undefined) {
      updateData.tshirt_pricing = tshirt_pricing === 'paid' ? 'paid' : 'free'
    }
    if (tshirt_sizes !== undefined) {
      updateData.tshirt_sizes = normalizeTshirtSizes(tshirt_sizes)
    }
    if (tshirt_required !== undefined) {
      updateData.tshirt_required = !!tshirt_required
    }
    if (tshirt_stock !== undefined) {
      updateData.tshirt_stock = tshirt_stock
    }
    if (tshirt_image_url !== undefined) {
      updateData.tshirt_image_url = tshirt_image_url || null
    }
    if (tshirt_enabled === false) {
      updateData.tshirt_image_url = null
    }
    if (tshirt_price !== undefined) {
      const parsed =
        tshirt_price === null || tshirt_price === ''
          ? null
          : Number(tshirt_price)
      if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
        return NextResponse.json({ error: 'Invalid T-shirt price' }, { status: 400 })
      }
      updateData.tshirt_price = parsed
    }

    // If enabling paid shirts, ensure a price exists (request body or DB)
    if (
      (tshirt_enabled === true || tshirt_pricing === 'paid') &&
      (updateData.tshirt_pricing === 'paid' || tshirt_pricing === 'paid')
    ) {
      let priceOk =
        updateData.tshirt_price !== undefined
          ? updateData.tshirt_price !== null && Number(updateData.tshirt_price) >= 0
          : false
      if (!priceOk && tshirt_price === undefined) {
        const { data: existing } = await adminClient
          .from('events')
          .select('tshirt_price, tshirt_pricing')
          .eq('id', id)
          .maybeSingle()
        const willBePaid =
          updateData.tshirt_pricing === 'paid' ||
          (updateData.tshirt_pricing === undefined &&
            (tshirt_pricing === 'paid' || existing?.tshirt_pricing === 'paid'))
        if (willBePaid && (existing?.tshirt_price == null || Number(existing.tshirt_price) < 0)) {
          return NextResponse.json(
            { error: 'T-shirt price is required for paid shirts' },
            { status: 400 }
          )
        }
        priceOk = true
      } else if (!priceOk) {
        return NextResponse.json(
          { error: 'T-shirt price is required for paid shirts' },
          { status: 400 }
        )
      }
    }

    const { data: event, error: updateError } = await adminClient
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch (error: any) {
    console.error('Error in PUT /api/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
