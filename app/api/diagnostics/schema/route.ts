import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET database schema information for debugging
export async function GET(req: Request) {
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

    if (!['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get schema information for ticket_purchases and ticket_guests
    const { data: schemaData, error: schemaError } = await adminClient.rpc('get_table_schemas')

    if (schemaError) {
      console.error('Error getting schema:', schemaError)
    }

    return NextResponse.json({
      tables: {
        ticket_purchases: {
          id_type: 'UUID', // Should be UUID based on migrations
        },
        ticket_guests: {
          id_type: 'UUID', // Should match ticket_purchases
          ticket_purchase_id_type: 'UUID', // Should be UUID
        }
      },
      schema: schemaData,
      message: 'Schema info retrieved. If ticket_guests.ticket_purchase_id is BIGINT, you need to run the migration.'
    })
  } catch (error: any) {
    console.error('Error in diagnostics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
