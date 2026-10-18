import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    const adminClient = createAdminClient()

    // Get ALL ticket purchases without filters to see what's in the DB
    const { data: allPurchases, error: allError } = await adminClient
      .from('ticket_purchases')
      .select('id, event_id, ticket_number, payment_status, user_id')
      .limit(10)

    console.log('===== ALL PURCHASES (no filter) =====')
    console.log(JSON.stringify(allPurchases, null, 2))

    // Now filter by event_id if provided
    if (eventId) {
      const { data: filtered, error: filteredError } = await adminClient
        .from('ticket_purchases')
        .select('*')
        .eq('event_id', eventId)

      console.log(`===== FILTERED BY event_id=${eventId} =====`)
      console.log(JSON.stringify(filtered, null, 2))

      return NextResponse.json({ 
        eventId,
        allPurchases,
        filteredPurchases: filtered 
      })
    }

    return NextResponse.json({ allPurchases })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
