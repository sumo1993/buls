import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

// POST generate QR codes for existing paid tickets
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    if (!['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all paid tickets without QR codes
    const { data: purchases, error: fetchError } = await adminClient
      .from('ticket_purchases')
      .select(`
        *,
        events(title, event_date, location),
        tickets:event_tickets(name, price),
        users!ticket_purchases_user_id_fkey(full_name, email)
      `)
      .eq('payment_status', 'paid')
      .is('qr_code_url', null)

    if (fetchError) {
      console.error('Error fetching purchases:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ 
        message: 'No tickets need QR code generation',
        count: 0
      })
    }

    console.log(`🔄 Generating QR codes for ${purchases.length} tickets...`)

    let successCount = 0
    let errorCount = 0

    // Generate QR codes for each purchase
    for (const purchase of purchases) {
      try {
        const ticketNumber = `TKT${purchase.id.replace(/[^0-9]/g, '').slice(0, 10).padEnd(10, '0')}`
        
        // Include full event and member information in QR code
        const qrData = JSON.stringify({
          ticketNumber,
          purchaseId: purchase.id,
          event: {
            id: purchase.event_id,
            title: purchase.events?.title || 'Event',
            date: purchase.events?.event_date || null,
            location: purchase.events?.location || null
          },
          attendee: {
            id: purchase.user_id,
            name: purchase.users?.full_name || 'Member',
            email: purchase.users?.email || ''
          },
          ticket: {
            id: purchase.ticket_id,
            name: purchase.tickets?.name || 'Ticket',
            price: purchase.tickets?.price || 0,
            quantity: purchase.quantity,
            totalAmount: (parseFloat(purchase.tickets?.price || 0) * purchase.quantity).toFixed(2)
          },
          payment: {
            status: 'paid',
            method: purchase.payment_method || 'unknown',
            paidAt: purchase.paid_at || new Date().toISOString()
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
        const { error: updateError } = await adminClient
          .from('ticket_purchases')
          .update({ qr_code_url: qrCodeDataUrl })
          .eq('id', purchase.id)
        
        if (updateError) {
          console.error(`❌ Failed to update ticket ${ticketNumber}:`, updateError)
          errorCount++
        } else {
          console.log(`✅ Generated QR code for ticket ${ticketNumber}`)
          successCount++
        }
      } catch (error) {
        console.error(`❌ Error generating QR code for purchase ${purchase.id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({ 
      message: `QR code generation complete`,
      total: purchases.length,
      success: successCount,
      errors: errorCount
    })
  } catch (error: any) {
    console.error('Error in POST /api/tickets/generate-qr:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
