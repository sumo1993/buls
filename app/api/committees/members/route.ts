import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole } from '@/lib/budget-access'

const STAFF = new Set(['admin', 'secretary'])
const HEAD_ROLE_LIST = [
  'head',
  'chair',
  'chairman',
  'chairperson',
  'leader',
  'budget_head',
  'coordinator',
  'committee_head',
  'president',
]

async function requireStaff(clerkId: string) {
  const adminClient = createAdminClient()
  const { data: user } = await adminClient
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .maybeSingle()

  if (!user || !STAFF.has(user.role)) {
    return { adminClient, user: null as null }
  }
  return { adminClient, user }
}

// GET - list members for a committee
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const committeeId = new URL(req.url).searchParams.get('committee_id')
    if (!committeeId) {
      return NextResponse.json({ error: 'committee_id required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('committee_members')
      .select(`
        id,
        role,
        user_id,
        users:users!user_id(id, full_name, email)
      `)
      .eq('committee_id', committeeId)
      .order('role')

    if (error) throw error
    return NextResponse.json({ members: data || [] })
  } catch (error) {
    console.error('Error fetching committee members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST - add member (optionally as head)
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { adminClient, user } = await requireStaff(userId)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { committee_id, user_id, role = 'member' } = body

    if (!committee_id || !user_id) {
      return NextResponse.json({ error: 'committee_id and user_id required' }, { status: 400 })
    }

    const normalizedRole = String(role || 'member').toLowerCase().trim() || 'member'

    // Only one head per committee — demote existing heads when assigning a new head
    if (isCommitteeHeadRole(normalizedRole)) {
      await adminClient
        .from('committee_members')
        .update({ role: 'member' })
        .eq('committee_id', committee_id)
        .in('role', HEAD_ROLE_LIST)
    }

    const { data, error } = await adminClient
      .from('committee_members')
      .upsert(
        {
          committee_id,
          user_id,
          role: normalizedRole,
        },
        { onConflict: 'committee_id,user_id' }
      )
      .select(`
        id,
        role,
        user_id,
        users:users!user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (error) {
    console.error('Error adding committee member:', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

// PUT - update member role (e.g. promote to head)
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { adminClient, user } = await requireStaff(userId)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id, role, committee_id } = body

    if (!id || !role) {
      return NextResponse.json({ error: 'id and role required' }, { status: 400 })
    }

    const normalizedRole = String(role).toLowerCase().trim()

    if (committee_id && isCommitteeHeadRole(normalizedRole)) {
      await adminClient
        .from('committee_members')
        .update({ role: 'member' })
        .eq('committee_id', committee_id)
        .neq('id', id)
        .in('role', HEAD_ROLE_LIST)
    }

    const { data, error } = await adminClient
      .from('committee_members')
      .update({ role: normalizedRole })
      .eq('id', id)
      .select(`
        id,
        role,
        user_id,
        users:users!user_id(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ member: data })
  } catch (error) {
    console.error('Error updating committee member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE - remove member
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { adminClient, user } = await requireStaff(userId)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await adminClient.from('committee_members').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing committee member:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
