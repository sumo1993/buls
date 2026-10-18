import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeCsv(str: string) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// GET export registrations as CSV (all attendee sources)
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

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'secretary'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: eventId } = await params

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('title, event_date')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const rows: Array<{
      name: string
      email: string
      phone: string
      type: string
      status: string
      registered_at: string
    }> = []

    const { data: registrations } = await adminClient
      .from('event_registrations')
      .select(`registered_at, status, user:users(full_name, email, phone, phone_number)`)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    for (const reg of registrations || []) {
      const user = (reg as any).user || {}
      rows.push({
        name: user.full_name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone || user.phone_number || 'N/A',
        type: 'member',
        status: reg.status || 'registered',
        registered_at: reg.registered_at
      })
    }

    const { data: purchases } = await adminClient
      .from('ticket_purchases')
      .select(`id, created_at, payment_status, user:users(full_name, email, phone_number)`)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    for (const purchase of purchases || []) {
      const user = (purchase as any).user || {}
      rows.push({
        name: user.full_name || 'N/A',
        email: user.email || 'N/A',
        phone: user.phone_number || 'N/A',
        type: 'ticket',
        status: purchase.payment_status || 'pending',
        registered_at: purchase.created_at
      })
    }

    const purchaseIds = (purchases || []).map((p) => p.id)
    if (purchaseIds.length > 0) {
      const { data: guests } = await adminClient
        .from('ticket_guests')
        .select('full_name, email, phone, phone_number, payment_status, created_at')
        .in('ticket_purchase_id', purchaseIds)

      for (const guest of guests || []) {
        rows.push({
          name: guest.full_name || 'N/A',
          email: guest.email || 'N/A',
          phone: guest.phone || guest.phone_number || 'N/A',
          type: 'guest',
          status: guest.payment_status || 'pending',
          registered_at: guest.created_at
        })
      }
    }

    const { data: nonMembers } = await adminClient
      .from('non_member_registrations')
      .select('full_name, email, phone, status, registered_at')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    for (const reg of nonMembers || []) {
      rows.push({
        name: reg.full_name || 'N/A',
        email: reg.email || 'N/A',
        phone: reg.phone || 'N/A',
        type: 'non_member',
        status: reg.status || 'pending',
        registered_at: reg.registered_at
      })
    }

    const { data: publicRegs } = await adminClient
      .from('public_registrations')
      .select('full_name, email, phone, status, registered_at')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: true })

    for (const reg of publicRegs || []) {
      rows.push({
        name: reg.full_name || 'N/A',
        email: reg.email || 'N/A',
        phone: reg.phone || 'N/A',
        type: 'public',
        status: reg.status || 'pending',
        registered_at: reg.registered_at
      })
    }

    const csvRows = [
      ['Name', 'Email', 'Phone', 'Type', 'Status', 'Registered At'].join(',')
    ]

    for (const row of rows) {
      const registeredAt = row.registered_at
        ? new Date(row.registered_at).toLocaleString('en-US')
        : 'N/A'
      csvRows.push([
        escapeCsv(row.name),
        escapeCsv(row.email),
        escapeCsv(row.phone),
        escapeCsv(row.type),
        escapeCsv(row.status),
        escapeCsv(registeredAt)
      ].join(','))
    }

    const csv = csvRows.join('\n')
    const eventDate = new Date(event.event_date).toISOString().split('T')[0]
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
    const filename = `${safeTitle}_${eventDate}_attendees.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/[id]/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
