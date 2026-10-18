import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCommitteeHeadRole, isStaffRole, isApprovalStaff, isPaymentStaff, isFinanceView } from '@/lib/budget-access'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET - fetch budget proposals
export async function GET(req: Request) {
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

    const userIdUUID = userData.id
    const userRole = userData.role
    
    const includeItems = new URL(req.url).searchParams.get('include_items') === '1'
    const adminClient = createAdminClient()
    
    // List view omits line items by default (fetch on detail) — much faster
    const select = includeItems
      ? `
        *,
        committees(committee_name),
        created_by_user:users!created_by(full_name, email),
        budget_head:users!budget_head_id(full_name, email),
        budget_proposal_items(*)
      `
      : `
        id, committee_id, title, description, status, total_amount,
        budget_head_id, created_by, created_at, submitted_at,
        secretary_approved_at, paid_at, review_notes, payment_reference,
        committees(committee_name),
        created_by_user:users!created_by(full_name, email),
        budget_head:users!budget_head_id(full_name, email)
      `

    let query = adminClient
      .from('budget_proposals')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(100)

    // Role-based filtering:
    // - Admin/Secretary (approval staff): see ALL proposals
    // - Treasurer (payment staff): see ONLY approved and paid proposals, CAN record payments
    // - Finance (finance view): see ONLY approved and paid proposals, CANNOT record payments (view-only)
    // - Members: see proposals for their committees or as budget head
    
    if (isApprovalStaff(userRole)) {
      // Admin and Secretary see everything - no filter
    } else if (isPaymentStaff(userRole) || isFinanceView(userRole)) {
      // Treasurer and Finance see only approved and paid proposals
      query = query.in('status', ['approved', 'paid'])
    } else {
      // Regular members see proposals for their committees or as budget head
      const { data: memberData } = await adminClient
        .from('committee_members')
        .select('committee_id')
        .eq('user_id', userIdUUID)

      const committeeIds = memberData?.map((m: any) => m.committee_id) || []
      
      if (committeeIds.length > 0) {
        query = query.or(`committee_id.in.(${committeeIds.join(',')}),budget_head_id.eq.${userIdUUID}`)
      } else {
        query = query.eq('budget_head_id', userIdUUID)
      }
    }

    const { data: proposals, error } = await query

    if (error) {
      console.error('Error fetching proposals:', error)
      throw error
    }

    console.log('Budget proposals fetched:', proposals?.length || 0)

    return NextResponse.json({ proposals: proposals || [] })
  } catch (error) {
    console.error('Error fetching budget proposals:', error)
    return NextResponse.json({ error: 'Failed to fetch budget proposals' }, { status: 500 })
  }
}

// POST - create budget proposal assignment (secretary) or full proposal (budget head)
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { committee_id, budget_head_id, title, description, items, total_amount } = body

    console.log('Budget Proposal POST - Received:', { committee_id, budget_head_id, hasTitle: !!title })

    // Validate required fields
    if (!committee_id) {
      return NextResponse.json({ error: 'Committee is required' }, { status: 400 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found in users table' }, { status: 404 })
    }

    const userIdUUID = userData.id

    // SIMPLE LOGIC: If budget_head_id is provided but no title, it's an ASSIGNMENT
    if (budget_head_id && !title) {
      console.log('Assignment mode: Creating proposal assignment without title')

      if (userData.role !== 'secretary' && userData.role !== 'admin') {
        return NextResponse.json({ error: 'Only secretary or admin can assign proposals' }, { status: 403 })
      }

      const adminClient = createAdminClient()
      
      // Create proposal assignment
      const { data: proposal, error: proposalError } = await adminClient
        .from('budget_proposals')
        .insert({
          committee_id,
          budget_head_id,
          title: 'Pending Details', // Placeholder until budget head fills it
          description: description || null,
          status: 'draft',
          total_amount: 0,
          created_by: userIdUUID
        })
        .select()
        .single()

      if (proposalError) {
        console.error('Proposal creation error:', proposalError)
        throw proposalError
      }

      console.log('Proposal assignment created:', proposal.id)
      return NextResponse.json({ proposal })
    }

    // For full proposals (with title), title is required
    if (!title) {
      return NextResponse.json({ error: 'Title is required for full proposal' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Create full proposal (budget head filling in details)
    const { data: proposal, error: proposalError } = await adminClient
      .from('budget_proposals')
      .insert({
        committee_id,
        title,
        description,
        status: 'draft',
        total_amount: total_amount || 0,
        created_by: userIdUUID,
        budget_head_id: budget_head_id || null
      })
      .select()
      .single()

    if (proposalError) throw proposalError

    // Create items if provided
    if (items && items.length > 0) {
      const itemsData = items.map((item: any) => ({
        proposal_id: proposal.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost
      }))

      await adminClient
        .from('budget_proposal_items')
        .insert(itemsData)
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Error creating budget proposal:', error)
    return NextResponse.json({ error: 'Failed to create budget proposal' }, { status: 500 })
  }
}

// PUT - update budget proposal
export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, committee_id, budget_head_id, title, description, items, total_amount, status, review_notes } = body

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userIdUUID = userData.id
    const userRole = userData.role

    const adminClient = createAdminClient()

    // Get existing proposal
    const { data: existingProposal, error: fetchError } = await adminClient
      .from('budget_proposals')
      .select('committee_id, created_by, budget_head_id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !existingProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Check permissions
    const isBudgetHead = existingProposal.budget_head_id === userIdUUID
    const isApprovalStaffMember = isApprovalStaff(userRole)
    const isPaymentStaffMember = isPaymentStaff(userRole)
    const isFinanceViewMember = isFinanceView(userRole)

    let isCommitteeHead = false
    if (!isApprovalStaffMember && !isPaymentStaffMember && !isFinanceViewMember && existingProposal.committee_id) {
      const { data: membership } = await adminClient
        .from('committee_members')
        .select('role')
        .eq('user_id', userIdUUID)
        .eq('committee_id', existingProposal.committee_id)
        .maybeSingle()
      isCommitteeHead = isCommitteeHeadRole(membership?.role)
    }

    const canMemberEdit = isBudgetHead || isCommitteeHead

    if (!isApprovalStaffMember && !isPaymentStaffMember && !isFinanceViewMember && !canMemberEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Budget heads / committee heads (non-staff) can only edit drafts
    if (canMemberEdit && !isApprovalStaffMember && !isPaymentStaffMember && !isFinanceViewMember && existingProposal.status !== 'draft') {
      return NextResponse.json({ error: 'Can only edit draft proposals' }, { status: 403 })
    }

    // Only approval staff (admin/secretary) can approve / reject / return rejected to draft
    if (
      status &&
      ['approved', 'rejected', 'pending_review'].includes(status) &&
      !isApprovalStaffMember
    ) {
      return NextResponse.json({ error: 'Only admin or secretary can approve or reject proposals' }, { status: 403 })
    }

    // Payment staff (treasurer) can only mark as paid
    // Finance view role cannot record payments
    if (status === 'paid' && !isPaymentStaff(userRole) && !isApprovalStaffMember) {
      return NextResponse.json({ error: 'Only treasurer can mark proposals as paid' }, { status: 403 })
    }

    // Returning a rejected proposal to draft is approval staff only
    if (
      status === 'draft' &&
      existingProposal.status === 'rejected' &&
      !isApprovalStaffMember
    ) {
      return NextResponse.json({ error: 'Only admin or secretary can return a rejected proposal to draft' }, { status: 403 })
    }

    // Update proposal
    const updateData: any = {}
    if (committee_id) updateData.committee_id = committee_id
    if (budget_head_id !== undefined) updateData.budget_head_id = budget_head_id
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (status) updateData.status = status
    if (review_notes !== undefined) updateData.review_notes = review_notes

    // Add approval timestamps based on status changes
    if (status === 'pending_review' && !existingProposal.submitted_at) {
      updateData.submitted_at = new Date().toISOString()
    }
    if (status === 'approved' && (userRole === 'secretary' || userRole === 'admin')) {
      updateData.secretary_approved_at = new Date().toISOString()
    }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: proposal, error: updateError } = await adminClient
      .from('budget_proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Update items if provided
    if (items !== undefined) {
      // Delete existing items
      await adminClient
        .from('budget_proposal_items')
        .delete()
        .eq('proposal_id', id)

      // Insert new items
      if (items.length > 0) {
        const itemsData = items.map((item: any) => ({
          proposal_id: id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost
        }))

        await adminClient
          .from('budget_proposal_items')
          .insert(itemsData)
      }
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Error updating budget proposal:', error)
    return NextResponse.json({ error: 'Failed to update budget proposal' }, { status: 500 })
  }
}

// DELETE - delete budget proposal
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userIdUUID = userData.id

    const adminClient = createAdminClient()

    // Get existing proposal
    const { data: existingProposal, error: fetchError } = await adminClient
      .from('budget_proposals')
      .select('committee_id, created_by, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !existingProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Get role for staff delete rights
    const { data: roleData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userIdUUID)
      .maybeSingle()

    const canStaffDelete = roleData?.role === 'admin' || roleData?.role === 'secretary'
    if (existingProposal.created_by !== userIdUUID && !canStaffDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (existingProposal.status !== 'draft' && !canStaffDelete) {
      return NextResponse.json({ error: 'Can only delete draft proposals' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('budget_proposals')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget proposal:', error)
    return NextResponse.json({ error: 'Failed to delete budget proposal' }, { status: 500 })
  }
}
