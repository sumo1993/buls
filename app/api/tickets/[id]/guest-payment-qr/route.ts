import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

// POST generate QR code for guest payment
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const ticketPurchaseId = id
    const adminClient = createAdminClient()

    // Check user role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get ticket purchase ID from URL params
    const { id: ticketPurchaseIdParam } = await params

    // For guest QR codes, we don't need to fetch the full ticket purchase
    // The QR code just needs to identify the guest and the ticket purchase
    // Admins and secretaries can generate guest QR codes
    
    // Get request body
    const body = await req.json()
    const { guest_name, guestName, amount, event_title: bodyEventTitle } = body
    const name = guestName || guest_name
    const eventTitle = bodyEventTitle || 'Event'
    // Use provided amount or default to 10 (¥10)
    const paymentAmount = amount || 10

    if (!name) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 })
    }
    
    if (!ticketPurchaseIdParam) {
      return NextResponse.json({ error: 'Ticket purchase ID is required' }, { status: 400 })
    }

    // Generate QR code data for guest
    const qrData = JSON.stringify({
      type: 'guest',
      ticket_purchase_id: ticketPurchaseIdParam,
      guest_name: name,
      amount: paymentAmount,
      event_title: eventTitle,
      created_at: new Date().toISOString()
    })

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    })

    return NextResponse.json({ 
      message: 'QR code generated successfully',
      qr_code_url: qrCodeDataUrl,
      qr_data: qrData,
      guest_name: name,
      amount: paymentAmount,
      event_title: eventTitle
    })
  } catch (error: any) {
    console.error('Error generating guest payment QR code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
