import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole, isStaffRole } from '@/lib/budget-access'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

async function getDbUser(clerkId: string) {
  const user = await getUserOrSync(clerkId)
  const adminClient = createAdminClient()
  return { adminClient, user }
}

async function canAccessProposal(
  adminClient: ReturnType<typeof createAdminClient>,
  user: { id: string; role: string },
  proposal: { committee_id?: string | null; budget_head_id?: string | null; created_by?: string | null }
) {
  if (isStaffRole(user.role)) return { allowed: true, canEdit: true }

  const isBudgetHead = proposal.budget_head_id === user.id
  let isCommitteeMember = false
  let isCommitteeHead = false

  if (proposal.committee_id) {
    const { data: membership } = await adminClient
      .from('committee_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('committee_id', proposal.committee_id)
      .maybeSingle()

    isCommitteeMember = !!membership
    isCommitteeHead = isCommitteeHeadRole(membership?.role)
  }

  return {
    allowed: isBudgetHead || isCommitteeMember || proposal.created_by === user.id,
    canEdit: isBudgetHead || isCommitteeHead,
  }
}

// GET - fetch items for a proposal
export async function GET(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('proposal_id')

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 })
    }

    const { adminClient, user } = await getDbUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: proposal } = await adminClient
      .from('budget_proposals')
      .select('id, committee_id, budget_head_id, created_by, status')
      .eq('id', proposalId)
      .maybeSingle()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const access = await canAccessProposal(adminClient, user, proposal)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { data: items, error } = await adminClient
      .from('budget_proposal_items')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at')

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching budget proposal items:', error)
    return NextResponse.json({ error: 'Failed to fetch budget proposal items' }, { status: 500 })
  }
}

// POST - create item
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { proposal_id, item_name, description, quantity, unit_cost, total_cost } = body

    if (!proposal_id || !item_name) {
      return NextResponse.json({ error: 'Proposal ID and item name are required' }, { status: 400 })
    }

    const { adminClient, user } = await getDbUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: proposal } = await adminClient
      .from('budget_proposals')
      .select('committee_id, status, created_by, budget_head_id')
      .eq('id', proposal_id)
      .maybeSingle()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const access = await canAccessProposal(adminClient, user, proposal)
    if (!access.allowed || (!access.canEdit && !isStaffRole(user.role))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (proposal.status !== 'draft' && !isStaffRole(user.role)) {
      return NextResponse.json({ error: 'Can only add items to draft proposals' }, { status: 400 })
    }

    const finalTotalCost = total_cost || (quantity || 1) * (unit_cost || 0)

    const { data: item, error } = await adminClient
      .from('budget_proposal_items')
      .insert({
        proposal_id,
        item_name,
        description,
        quantity: quantity || 1,
        unit_cost: unit_cost || 0,
        total_cost: finalTotalCost,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error creating budget proposal item:', error)
    return NextResponse.json({ error: 'Failed to create budget proposal item' }, { status: 500 })
  }
}

// DELETE - delete item
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const { adminClient, user } = await getDbUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: item, error: itemError } = await adminClient
      .from('budget_proposal_items')
      .select('proposal_id')
      .eq('id', id)
      .maybeSingle()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const { data: proposal } = await adminClient
      .from('budget_proposals')
      .select('created_by, status, budget_head_id, committee_id')
      .eq('id', item.proposal_id)
      .maybeSingle()

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const access = await canAccessProposal(adminClient, user, proposal)
    if (!access.canEdit && !isStaffRole(user.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (proposal.status !== 'draft' && !isStaffRole(user.role)) {
      return NextResponse.json({ error: 'Can only delete items from draft proposals' }, { status: 400 })
    }

    const { error } = await adminClient.from('budget_proposal_items').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget proposal item:', error)
    return NextResponse.json({ error: 'Failed to delete budget proposal item' }, { status: 500 })
  }
}
