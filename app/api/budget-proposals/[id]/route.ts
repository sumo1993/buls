import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole, isStaffRole } from '@/lib/budget-access'

// GET - fetch a single budget proposal
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: userData } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: proposal, error } = await adminClient
      .from('budget_proposals')
      .select(`
        *,
        committees(committee_name),
        created_by_user:users!created_by(full_name, email),
        budget_head:users!budget_head_id(full_name, email),
        budget_proposal_items(*)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const isStaff = isStaffRole(userData.role)
    const isBudgetHead = proposal.budget_head_id === userData.id

    let isCommitteeMember = false
    let isCommitteeHead = false
    let committeeRole: string | null = null
    if (proposal.committee_id) {
      const { data: memberData } = await adminClient
        .from('committee_members')
        .select('id, role')
        .eq('user_id', userData.id)
        .eq('committee_id', proposal.committee_id)
        .maybeSingle()
      isCommitteeMember = !!memberData
      committeeRole = memberData?.role || null
      isCommitteeHead = isCommitteeHeadRole(committeeRole)
    }

    if (!isStaff && !isBudgetHead && !isCommitteeMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      proposal,
      access: {
        isStaff,
        isBudgetHead,
        isCommitteeMember,
        isCommitteeHead,
        committeeRole,
        // Staff (secretary/admin) can ONLY VIEW, not edit
        // Only budget head or committee head can edit drafts
        canEdit: false, // Secretary should never get edit permission from View page
        canEditAsMember:
          (isBudgetHead || isCommitteeHead) && proposal.status === 'draft',
      },
    })
  } catch (error) {
    console.error('Error fetching budget proposal:', error)
    return NextResponse.json({ error: 'Failed to fetch budget proposal' }, { status: 500 })
  }
}
