import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - fetch all committees
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: committees, error } = await adminClient
      .from('committees')
      .select(`
        *,
        members:committee_members(
          id,
          role,
          user_id,
          user:users!user_id(id, full_name, email)
        )
      `)
      .order('committee_name')

    if (error) throw error

    return NextResponse.json({ committees })
  } catch (error) {
    console.error('Error fetching committees:', error)
    return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 })
  }
}

// POST - create committee
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { committee_name, description, monthly_due } = body

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('committees')
      .insert({
        committee_name,
        description,
        monthly_due
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ committee: data })
  } catch (error) {
    console.error('Error creating committee:', error)
    return NextResponse.json({ error: 'Failed to create committee' }, { status: 500 })
  }
}

// PUT - update committee
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, committee_name, description, monthly_due } = body

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('committees')
      .update({
        committee_name,
        description,
        monthly_due
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ committee: data })
  } catch (error) {
    console.error('Error updating committee:', error)
    return NextResponse.json({ error: 'Failed to update committee' }, { status: 500 })
  }
}

// DELETE - delete committee
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Committee ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('committees')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting committee:', error)
    return NextResponse.json({ error: 'Failed to delete committee' }, { status: 500 })
  }
}
