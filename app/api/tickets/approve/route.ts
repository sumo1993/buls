import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'
import { generateTicketNumber } from '@/lib/ticket-utils'

// POST approve or reject ticket purchase
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

    const body = await req.json()
    const { purchase_id, action, notes } = body

    if (!purchase_id || !action) {
      return NextResponse.json({ error: 'Purchase ID and action required' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get purchase details with event information
    const { data: purchase, error: purchaseError } = await adminClient
      .from('ticket_purchases')
      .select('*, events(title, event_date)')
      .eq('id', purchase_id)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    if (purchase.payment_status !== 'pending') {
      return NextResponse.json({ 
        error: 'Purchase already processed' 
      }, { status: 400 })
    }

    const updateData: any = {
      approved_by: userData.id
    }

    if (action === 'approve') {
      // Generate formatted ticket number using new format with purchase ID as seed
      const ticketNumber = generateTicketNumber(
        purchase.events?.title || 'Event',
        purchase.events?.event_date || new Date(),
        purchase_id  // Use purchase ID as seed for deterministic random number
      )
      
      updateData.payment_status = 'paid'
      updateData.paid_at = new Date().toISOString()
      updateData.ticket_number = ticketNumber  // Store formatted ticket number in database

      // v2: approving ticket payment also clears paid / free shirt
      if (purchase.tshirt_wanted) {
        if (purchase.tshirt_payment_status === 'pending') {
          updateData.tshirt_payment_status = 'paid'
        } else if (
          !purchase.tshirt_payment_status ||
          purchase.tshirt_payment_status === 'waived'
        ) {
          updateData.tshirt_payment_status = 'waived'
        }
      }
      
      // Generate QR code
      try {
        
        // Include full event and member information in QR code
        // total_price already includes guests + T-shirt when purchased together
        const totalAmount =
          parseFloat(String(purchase.total_price ?? '')) > 0
            ? parseFloat(String(purchase.total_price))
            : parseFloat(String(purchase.unit_price || purchase.tickets?.price || 0)) *
              (purchase.quantity || 1)

        const qrData = JSON.stringify({
          ticketNumber,
          purchaseId: purchase_id,
          type: 'member_ticket',
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
            price: purchase.unit_price || purchase.tickets?.price || 0,
            quantity: purchase.quantity,
            guestCount: purchase.guest_count || 0,
            totalAmount: totalAmount.toFixed(2)
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
        
        updateData.qr_code_url = qrCodeDataUrl
        console.log('✅ QR code generated for ticket:', ticketNumber)
      } catch (qrError) {
        console.error('❌ QR code generation failed:', qrError)
        // Continue without QR code - don't fail the approval
      }
    } else {
      updateData.payment_status = 'cancelled'
      if (purchase.tshirt_wanted && purchase.tshirt_payment_status === 'pending') {
        updateData.tshirt_payment_status = 'refunded'
      }
    }

    if (notes) {
      updateData.notes = notes
    }

    // Update purchase
    const { data: updatedPurchase, error: updateError } = await adminClient
      .from('ticket_purchases')
      .update(updateData)
      .eq('id', purchase_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating purchase:', updateError)
      return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
    }

    // Guests paid with this purchase: approve → paid_online, reject → refunded
    if (action === 'approve') {
      await adminClient
        .from('ticket_guests')
        .update({ payment_status: 'paid_online' })
        .eq('ticket_purchase_id', purchase_id)
        .eq('payment_status', 'pending')
      // Guest T-shirts included in the same payment
      await adminClient
        .from('ticket_guests')
        .update({ tshirt_payment_status: 'paid' })
        .eq('ticket_purchase_id', purchase_id)
        .eq('tshirt_wanted', true)
        .eq('tshirt_payment_status', 'pending')
      await adminClient
        .from('ticket_guests')
        .update({ tshirt_payment_status: 'waived' })
        .eq('ticket_purchase_id', purchase_id)
        .eq('tshirt_wanted', true)
        .eq('tshirt_payment_status', 'waived')
    } else {
      await adminClient
        .from('ticket_guests')
        .update({ payment_status: 'refunded' })
        .eq('ticket_purchase_id', purchase_id)
        .eq('payment_status', 'pending')
      await adminClient
        .from('ticket_guests')
        .update({ tshirt_payment_status: 'refunded' })
        .eq('ticket_purchase_id', purchase_id)
        .eq('tshirt_wanted', true)
        .eq('tshirt_payment_status', 'pending')
    }

    return NextResponse.json({ 
      purchase: updatedPurchase,
      message: action === 'approve' 
        ? 'Payment approved! QR code generated.' 
        : 'Payment rejected.'
    })
  } catch (error: any) {
    console.error('Error in POST /api/tickets/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
