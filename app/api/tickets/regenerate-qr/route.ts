import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import QRCode from 'qrcode'
import { generateTicketNumber } from '@/lib/ticket-utils'

// POST regenerate QR codes for tickets with updated ticket numbers
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

    // Get all paid tickets
    console.log('🔧 Regenerate QR: Fetching paid tickets...')
    const { data: purchases, error: purchasesError } = await adminClient
      .from('ticket_purchases')
      .select('*, events(*), event_tickets!ticket_purchases_ticket_id_fkey(*), users!ticket_purchases_user_id_fkey(*)')
      .eq('payment_status', 'paid')

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    if (!purchases || purchases.length === 0) {
      console.log('🔧 Regenerate QR: No paid tickets found')
      return NextResponse.json({ message: 'No paid tickets found', updated: 0 })
    }

    console.log(`🔧 Regenerate QR: Found ${purchases.length} paid tickets`)
    let updated = 0
    let errors = 0

    // Regenerate QR code for each ticket
    for (const purchase of purchases) {
      try {
        // Debug: Log purchase data
        console.log(`🔧 Processing purchase ${purchase.id}:`, {
          ticket_number: purchase.ticket_number,
          event_title: purchase.events?.title,
          event_date: purchase.events?.event_date,
          has_event_data: !!purchase.events,
          event_id: purchase.event_id
        })
        
        // Validate event data is loaded
        if (!purchase.events) {
          console.error(`❌ Purchase ${purchase.id}: No event data loaded! event_id: ${purchase.event_id}`)
          
          // Try to fetch event data directly if not loaded
          const { data: eventData, error: eventError } = await adminClient
            .from('events')
            .select('title, event_date')
            .eq('id', purchase.event_id)
            .single()
            
          if (eventError || !eventData) {
            console.error(`❌ Purchase ${purchase.id}: Could not fetch event data:`, eventError)
            errors++
            continue
          }
          
          console.log(`✅ Purchase ${purchase.id}: Fetched event data:`, eventData)
          purchase.events = eventData
        }
        
        // Generate new ticket number using new format with purchase ID as seed
        // FOR REGENERATION: We want to generate a NEW ticket number, so we use purchase ID + timestamp as seed
        const oldTicketNumber = purchase.ticket_number;
        const timestamp = Date.now();
        const uniqueSeed = `${purchase.id}-${timestamp}`; // Combine purchase ID with timestamp for unique seed
        
        const ticketNumber = generateTicketNumber(
          purchase.events.title,
          purchase.events.event_date,
          uniqueSeed  // Use unique seed to ensure new ticket number
        )
        
        console.log(`🔧 Ticket ${purchase.id}: ${oldTicketNumber} → ${ticketNumber}`)
        
        // Create QR code data with new ticket number
        const qrData = JSON.stringify({
          ticket_number: ticketNumber,
          purchase_id: purchase.id,
          event_id: purchase.event_id,
          user_id: purchase.user_id,
          full_name: purchase.users?.full_name || 'Member',
          event_title: purchase.events?.title || 'Event',
          ticket_name: purchase.event_tickets?.name || 'Ticket',
          quantity: purchase.quantity
        })

        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })

        // Update ticket with new ticket_number and QR code
        const { data: updateData, error: updateError } = await adminClient
          .from('ticket_purchases')
          .update({
            ticket_number: ticketNumber,
            qr_code_url: qrCodeDataUrl
          })
          .eq('id', purchase.id)
          .select()  // Add select to get response

        if (updateError) {
          console.error(`Error updating ticket ${purchase.id}:`, updateError)
          errors++
        } else if (!updateData || updateData.length === 0) {
          console.error(`Ticket ${purchase.id}: Update returned no data`)
          errors++
        } else {
          console.log(`✅ Ticket ${purchase.id}: Updated successfully`)
          updated++
        }
      } catch (err) {
        console.error(`Error processing ticket ${purchase.id}:`, err)
        errors++
      }
    }

    console.log(`🔧 Regenerate QR: Result - ${updated} updated, ${errors} errors, ${purchases.length} total`)
    return NextResponse.json({
      message: `Successfully regenerated ${updated} QR codes`,
      updated,
      errors,
      total: purchases.length
    })
  } catch (error: any) {
    console.error('Error regenerating QR codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
// FORCE RECOMPILATION - Debug ticket number issue