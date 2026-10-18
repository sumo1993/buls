import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

// POST generate QR code for user's own ticket
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

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
    const { purchase_id } = body

    if (!purchase_id) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
    }

    // Get purchase - verify ownership
    const { data: purchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('*')
      .eq('id', purchase_id)
      .eq('user_id', userData.id) // Ensure user owns this ticket
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (purchase.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Ticket not approved yet' }, { status: 400 })
    }

    // Check if QR code already exists
    if (purchase.qr_code_url) {
      return NextResponse.json({ 
        message: 'QR code already exists',
        qr_code_url: purchase.qr_code_url
      })
    }

    // Generate QR code
    try {
      const ticketNumber = `TKT${purchase_id.replace(/[^0-9]/g, '').slice(0, 10).padEnd(10, '0')}`
      
      // Fetch full ticket details with joins
      const { data: fullPurchase, error: fullPurchaseError } = await adminClient
        .from('ticket_purchases')
        .select(`
          *,
          events(title, event_date, location),
          tickets:event_tickets(name, price),
          users!ticket_purchases_user_id_fkey(full_name, email)
        `)
        .eq('id', purchase_id)
        .single()

      if (fullPurchaseError) {
        console.error('Error fetching full purchase details:', fullPurchaseError)
      }

      const purchaseData = fullPurchase || purchase

      // Include full event and member information in QR code
      const qrData = JSON.stringify({
        ticketNumber,
        purchaseId: purchase_id,
        event: {
          id: purchaseData.event_id,
          title: purchaseData.events?.title || 'Event',
          date: purchaseData.events?.event_date || null,
          location: purchaseData.events?.location || null
        },
        attendee: {
          id: purchaseData.user_id,
          name: purchaseData.users?.full_name || 'Member',
          email: purchaseData.users?.email || ''
        },
        ticket: {
          id: purchaseData.ticket_id,
          name: purchaseData.tickets?.name || 'Ticket',
          price: purchaseData.tickets?.price || 0,
          quantity: purchaseData.quantity,
          totalAmount: (parseFloat(purchaseData.tickets?.price || 0) * purchaseData.quantity).toFixed(2)
        },
        payment: {
          status: 'paid',
          method: purchaseData.payment_method || 'unknown',
          paidAt: purchaseData.paid_at || new Date().toISOString()
        },
        validatedAt: null,
        scannedBy: null
      })
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2
      })
      
      // Update purchase with QR code
      const { data: updatedPurchase, error: updateError } = await adminClient
        .from('ticket_purchases')
        .update({ qr_code_url: qrCodeDataUrl })
        .eq('id', purchase_id)
        .select()
        .single()
      
      if (updateError) {
        console.error('Failed to save QR code:', updateError)
        return NextResponse.json({ error: 'Failed to save QR code' }, { status: 500 })
      }

      console.log(`✅ Generated QR code for ticket ${ticketNumber}`)

      return NextResponse.json({ 
        message: 'QR code generated successfully',
        qr_code_url: qrCodeDataUrl,
        purchase: updatedPurchase
      })
    } catch (error) {
      console.error('QR code generation error:', error)
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error in POST /api/tickets/generate-my-qr:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
