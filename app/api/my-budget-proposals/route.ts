import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole, isStaffRole } from '@/lib/budget-access'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

/**
 * GET proposals visible to the current user:
 * - staff (admin / secretary / treasurer / finance): full list
 * - assigned as budget_head_id
 * - committee head (not regular committee members)
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    return await loadProposalsForUser(adminClient, userData)
  } catch (error) {
    console.error('Error fetching my budget proposals:', error)
    return NextResponse.json({ error: 'Failed to fetch budget proposals' }, { status: 500 })
  }
}

async function loadProposalsForUser(
  adminClient: ReturnType<typeof createAdminClient>,
  userData: { id: string; role: string; full_name?: string | null }
) {
  const isStaff = isStaffRole(userData.role)

  const { data: memberships, error: membershipError } = await adminClient
    .from('committee_members')
    .select('committee_id, role, committees(id, committee_name)')
    .eq('user_id', userData.id)

  if (membershipError) {
    console.error('Error fetching committee memberships:', membershipError)
  }

  const headMemberships = (memberships || []).filter((m: any) =>
    isCommitteeHeadRole(m.role)
  )
  const headCommitteeIds = headMemberships.map((m: any) => m.committee_id).filter(Boolean)

  let query = adminClient
    .from('budget_proposals')
    .select(`
      id, committee_id, title, description, status, total_amount,
      budget_head_id, created_at, submitted_at, review_notes,
      committees(committee_name),
      budget_head:users!budget_head_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isStaff) {
    if (headCommitteeIds.length > 0) {
      query = query.or(
        `budget_head_id.eq.${userData.id},committee_id.in.(${headCommitteeIds.join(',')})`
      )
    } else {
      query = query.eq('budget_head_id', userData.id)
    }
  }

  const { data: proposals, error } = await query

  if (error) throw error

  const enriched = (proposals || []).map((p: any) => {
    const membership = (memberships || []).find((m: any) => m.committee_id === p.committee_id)
    const isBudgetHead = p.budget_head_id === userData.id
    const isCommitteeHead = isCommitteeHeadRole(membership?.role)
    const canEditDraft =
      (isBudgetHead || isCommitteeHead) && p.status === 'draft' && !isStaff

    return {
      ...p,
      viewer_is_budget_head: isBudgetHead,
      viewer_is_committee_head: isCommitteeHead,
      viewer_can_edit: canEditDraft,
      viewer_committee_role: membership?.role || null,
      viewer_relation: isBudgetHead
        ? 'budget_head'
        : isCommitteeHead
          ? 'committee_head'
          : isStaff
            ? 'staff'
            : 'viewer',
    }
  })

  const canAccess =
    isStaff ||
    headMemberships.length > 0 ||
    enriched.some((p: any) => p.viewer_is_budget_head)

  return NextResponse.json({
    canAccess,
    proposals: canAccess ? enriched : [],
    committees: canAccess
      ? headMemberships.map((m: any) => ({
          id: m.committee_id,
          name: m.committees?.committee_name,
          role: m.role || 'head',
        }))
      : [],
    user: {
      id: userData.id,
      role: userData.role,
      full_name: userData.full_name,
    },
  })
}
