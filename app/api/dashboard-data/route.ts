import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole, isStaffRole } from '@/lib/budget-access'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { getSupabaseClient } = await import('@/lib/supabase/connection-pool')
    const supabase = getSupabaseClient()
    // Use admin client for budget/committee visibility (anon RLS often blocks these)
    const adminClient = createAdminClient()

    // Get user first to find their database ID - use maybeSingle for better performance
    const { data: user } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()
    
    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Committee memberships — only heads (and assigned budget heads) see budget UI
    const { data: memberships } = await adminClient
      .from('committee_members')
      .select('committee_id, role')
      .eq('user_id', user.id)

    const headMemberships = (memberships || []).filter((m: any) =>
      isCommitteeHeadRole(m.role)
    )
    const headCommitteeIds = headMemberships.map((m: any) => m.committee_id).filter(Boolean)

    // Fetch only essential data in parallel with limits
    const [
      { data: payments },
      { data: loans },
      { data: meetings },
      { data: events },
      { data: announcements },
    ] = await Promise.all([
      supabase.from('payments').select('id, amount, status, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5),
      
      supabase.from('loans').select('id, amount, status, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false}).limit(5),
      
      supabase.from('meetings').select('id, title, description, meeting_date, meeting_type, zoom_link, location, is_public')
        .eq('is_public', true)
        .gte('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: true }).limit(5).then(result => {
          console.log('📅 Dashboard meetings query result:', {
            count: result.data?.length || 0,
            error: result.error,
            sample: result.data?.[0]
          })
          return result
        }),
      
      supabase.from('events').select('id, title, event_date, location')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true }).limit(3),
      
      supabase.from('announcements').select('id, title, content, created_at')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false }).limit(3),
    ])

    const isStaff = isStaffRole(user.role)

    // Budget proposals: staff see all; others only as budget head or committee head
    let proposalsQuery = adminClient
      .from('budget_proposals')
      .select('id, title, description, status, total_amount, budget_head_id, committee_id, committees(committee_name)')
      .order('created_at', { ascending: false })
      .limit(8)

    if (!isStaff) {
      if (headCommitteeIds.length > 0) {
        proposalsQuery = proposalsQuery.or(
          `budget_head_id.eq.${user.id},committee_id.in.(${headCommitteeIds.join(',')})`
        )
      } else {
        proposalsQuery = proposalsQuery.eq('budget_head_id', user.id)
      }
    }

    const { data: assignedProposals } = await proposalsQuery

    const enrichedProposals = (assignedProposals || []).map((p: any) => {
      const membership = (memberships || []).find((m: any) => m.committee_id === p.committee_id)
      return {
        ...p,
        viewer_is_budget_head: p.budget_head_id === user.id,
        viewer_is_committee_head: isCommitteeHeadRole(membership?.role),
        viewer_committee_role: membership?.role || null,
      }
    })

    const canAccessBudgetProposals =
      isStaff ||
      headMemberships.length > 0 ||
      enrichedProposals.some((p: any) => p.viewer_is_budget_head)

    return NextResponse.json({
      user,
      payments: payments || [],
      loans: loans || [],
      meetings: meetings || [],
      events: events || [],
      announcements: announcements || [],
      assignedProposals: canAccessBudgetProposals ? enrichedProposals : [],
      myCommittees: canAccessBudgetProposals
        ? headMemberships.map((m: any) => ({
            committee_id: m.committee_id,
            role: m.role || 'head',
          }))
        : [],
      canAccessBudgetProposals,
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
