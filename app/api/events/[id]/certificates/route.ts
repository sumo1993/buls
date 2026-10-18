import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/events/[id]/certificates - Get all certificates for an event
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

    const { data: certificates, error } = await adminClient
      .from('event_certificates')
      .select(`
        *,
        user:users!event_certificates_user_id_fkey(full_name, email),
        issued_by_user:users!event_certificates_issued_by_fkey(full_name)
      `)
      .eq('event_id', eventId)
      .order('issued_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })
    }

    // Get event details
    const { data: event } = await adminClient
      .from('events')
      .select('title, event_date')
      .eq('id', eventId)
      .single()

    const stats = {
      total_issued: certificates.length,
      by_type: {
        attendance: certificates.filter(c => c.certificate_type === 'attendance').length,
        participation: certificates.filter(c => c.certificate_type === 'participation').length,
        achievement: certificates.filter(c => c.certificate_type === 'achievement').length,
        speaker: certificates.filter(c => c.certificate_type === 'speaker').length,
      },
      total_hours: certificates.reduce((sum, c) => sum + parseFloat(c.hours_credited || 0), 0)
    }

    return NextResponse.json({ certificates, stats, event })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/certificates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[id]/certificates - Generate certificate(s)
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

    // Get user performing action
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
    const { 
      user_ids, // Array of user IDs or 'all' for all attendees
      certificate_type,
      hours_credited,
      custom_text,
      bulk_generate
    } = body

    // Get event details
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('title, event_date, status')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Determine recipients
    let recipientIds: string[] = []

    if (bulk_generate || user_ids === 'all') {
      // Get all attendees (checked in)
      const { data: checkins } = await adminClient
        .from('event_checkins')
        .select('user_id')
        .eq('event_id', eventId)

      recipientIds = checkins?.map(c => c.user_id) || []
    } else if (Array.isArray(user_ids)) {
      recipientIds = user_ids
    } else {
      return NextResponse.json({ error: 'Invalid user_ids parameter' }, { status: 400 })
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    // Generate certificates
    const certificatesToCreate = recipientIds.map(user_id => {
      const certNumber = generateCertificateNumber(eventId, user_id)
      
      return {
        event_id: parseInt(eventId),
        user_id,
        certificate_type: certificate_type || 'attendance',
        certificate_number: certNumber,
        issued_by: userData.id,
        hours_credited: hours_credited || null,
        custom_text: custom_text || null,
        certificate_url: null // Will be generated later with PDF generation
      }
    })

    // Check for duplicates and filter them out
    const { data: existing } = await adminClient
      .from('event_certificates')
      .select('user_id')
      .eq('event_id', eventId)
      .in('user_id', recipientIds)

    const existingUserIds = existing?.map(e => e.user_id) || []
    const newCertificates = certificatesToCreate.filter(
      c => !existingUserIds.includes(c.user_id)
    )

    if (newCertificates.length === 0) {
      return NextResponse.json({ 
        error: 'All selected users already have certificates for this event',
        existing_count: existingUserIds.length
      }, { status: 409 })
    }

    // Insert certificates
    const { data: certificates, error: insertError } = await adminClient
      .from('event_certificates')
      .insert(newCertificates)
      .select(`
        *,
        user:users!event_certificates_user_id_fkey(full_name, email)
      `)

    if (insertError) {
      console.error('Error generating certificates:', insertError)
      return NextResponse.json({ error: 'Failed to generate certificates' }, { status: 500 })
    }

    // TODO: Generate PDF certificates in background
    // This would involve creating a PDF with event details, attendee name, date, etc.
    // For now, certificates are created without PDF URLs

    return NextResponse.json({
      success: true,
      certificates,
      generated_count: certificates.length,
      skipped_count: existingUserIds.length,
      message: `Generated ${certificates.length} certificate(s). ${existingUserIds.length} skipped (already exist).`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/events/[id]/certificates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate certificate number
function generateCertificateNumber(eventId: string, userId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const eventCode = eventId.toString().padStart(4, '0')
  const userCode = userId.slice(0, 8).toUpperCase()
  return `CERT-${eventCode}-${userCode}-${timestamp}`
}
