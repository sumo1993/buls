'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Eye, Loader2, CheckCircle, XCircle, Banknote, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { isCommitteeHeadRole } from '@/lib/budget-access'

type PanelMode = 'staff' | 'member'

interface BudgetProposalsPanelProps {
  mode?: PanelMode
  /** When mode=staff: allow assign / approve / reject / delete */
  canManage?: boolean
  /** When mode=staff: allow record payment */
  canPay?: boolean
  title?: string
  subtitle?: string
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    paid: 'bg-purple-100 text-purple-800',
  }
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function BudgetProposalsPanel({
  mode = 'staff',
  canManage = false,
  canPay = false,
  title = 'Budget Proposals',
  subtitle = 'Committee budget proposals',
}: BudgetProposalsPanelProps) {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<any[]>([])
  const [committees, setCommittees] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending_review' | 'approved' | 'rejected' | 'paid'>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Confirmation modal state
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    message: string
    confirmText: string
    confirmColor: string
    onConfirm: () => void
  } | null>(null)

  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ committee_id: '', budget_head_id: '' })
  const [assigning, setAssigning] = useState(false)

  const [showEditAssignment, setShowEditAssignment] = useState(false)
  const [editingProposal, setEditingProposal] = useState<any>(null)
  const [editAssignmentForm, setEditAssignmentForm] = useState({ committee_id: '', budget_head_id: '' })
  const [updatingAssignment, setUpdatingAssignment] = useState(false)

  const [showPayment, setShowPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    proposal_id: '',
    amount: '',
    payment_method: 'alipay',
    paid_to_name: '',
    notes: '',
    receipt_file: null as File | null,
  })
  const [savingPayment, setSavingPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)

  const [showReceiptUpload, setShowReceiptUpload] = useState(false)
  const [receiptUploadForm, setReceiptUploadForm] = useState({
    payment_id: '',
    proposal_id: '',
    receipt_file: null as File | null,
  })
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const endpoint = mode === 'member' ? '/api/my-budget-proposals' : '/api/budget-proposals'

  const load = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(endpoint, { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in again to view budget proposals')
        }
        throw new Error(data.error || 'Failed to load proposals')
      }
      setProposals(data.proposals || [])
      if (data.committees) setCommittees(data.committees)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to load budget proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) {
      setLoading(false)
      return
    }
    load()
  }, [endpoint, isLoaded, userId])

  const openAssign = async () => {
    try {
      const [cRes, uRes] = await Promise.all([
        fetch('/api/committees'),
        fetch('/api/users/active'),
      ])
      const cData = await cRes.json()
      const uData = await uRes.json()
      if (cRes.ok) setCommittees(cData.committees || [])
      if (uRes.ok) setAllMembers(uData.users || [])
      setAssignForm({ committee_id: '', budget_head_id: '' })
      setShowAssign(true)
    } catch {
      toast.error('Failed to load assignment data')
    }
  }

  const committeeMembersForAssign = useMemo(() => {
    if (!assignForm.committee_id) return allMembers
    const committee = committees.find((c: any) => c.id === assignForm.committee_id)
    const memberUsers = (committee?.members || [])
      .map((m: any) => {
        const user = m.user || {}
        const id = user.id || m.user_id
        if (!id) return null
        return {
          id,
          full_name: user.full_name,
          email: user.email,
          committee_role: m.role || 'member',
        }
      })
      .filter(Boolean)
      // Heads first so secretary can pick Cooking head easily
      .sort((a: any, b: any) => {
        const aHead = isCommitteeHeadRole(a.committee_role) ? 0 : 1
        const bHead = isCommitteeHeadRole(b.committee_role) ? 0 : 1
        return aHead - bHead
      })

    if (memberUsers.length > 0) return memberUsers
    return allMembers
  }, [assignForm.committee_id, committees, allMembers])

  // When committee changes, default budget head to that committee's head if present
  useEffect(() => {
    if (!assignForm.committee_id || !showAssign) return
    const head = committeeMembersForAssign.find((m: any) =>
      isCommitteeHeadRole(m.committee_role)
    )
    if (head?.id) {
      setAssignForm((prev) =>
        prev.budget_head_id ? prev : { ...prev, budget_head_id: head.id }
      )
    }
  }, [assignForm.committee_id, committeeMembersForAssign, showAssign])

  const submitAssign = async () => {
    if (!assignForm.committee_id || !assignForm.budget_head_id) {
      toast.error('Select committee and budget proposal head')
      return
    }
    setAssigning(true)
    try {
      const res = await fetch('/api/budget-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          committee_id: assignForm.committee_id,
          budget_head_id: assignForm.budget_head_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign')
      toast.success('Budget proposal assigned')
      setShowAssign(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign proposal')
    } finally {
      setAssigning(false)
    }
  }

  const updateAssignment = async () => {
    if (!editingProposal || !editAssignmentForm.committee_id || !editAssignmentForm.budget_head_id) {
      toast.error('Select committee and budget proposal head')
      return
    }
    setUpdatingAssignment(true)
    try {
      const res = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProposal.id,
          committee_id: editAssignmentForm.committee_id,
          budget_head_id: editAssignmentForm.budget_head_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update assignment')
      toast.success('Assignment updated')
      setShowEditAssignment(false)
      setEditingProposal(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update assignment')
    } finally {
      setUpdatingAssignment(false)
    }
  }

  const updateStatus = async (id: string, status: string, review_notes?: string) => {
    setProcessing(id)
    try {
      const res = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, review_notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast.success(status === 'approved' ? 'Proposal approved' : status === 'rejected' ? 'Proposal rejected' : 'Updated')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status')
    } finally {
      setProcessing(null)
    }
  }

  const deleteProposal = async (id: string) => {
    setConfirmConfig({
      title: 'Delete Proposal',
      message: 'Are you sure you want to delete this draft proposal? This action cannot be undone.',
      confirmText: 'Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setShowConfirm(false)
        setProcessing(id)
        try {
          const res = await fetch(`/api/budget-proposals?id=${id}`, { method: 'DELETE' })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to delete')
          toast.success('Proposal deleted')
          await load()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete')
        } finally {
          setProcessing(null)
        }
      }
    })
    setShowConfirm(true)
  }

  const openPayment = (proposal: any) => {
    setPaymentForm({
      proposal_id: proposal.id,
      amount: String(proposal.total_amount || ''),
      payment_method: 'alipay',
      paid_to_name: proposal.budget_head?.full_name || '',
      notes: '',
      receipt_file: null,
    })
    setShowPayment(true)
  }

  const savePayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    
    if (!paymentForm.receipt_file) {
      toast.error('Please upload payment proof (receipt/screenshot)')
      return
    }
    
    setSavingPayment(true)
    try {
      // Upload receipt file first
      let receiptUrl = ''
      if (paymentForm.receipt_file) {
        const fileFormData = new FormData()
        fileFormData.append('file', paymentForm.receipt_file)
        fileFormData.append('bucket', 'receipts')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: fileFormData,
        })
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload receipt')
        }
        
        const uploadData = await uploadRes.json()
        receiptUrl = uploadData.url
      }
      
      // Create payment record with receipt URL
      const res = await fetch('/api/payment-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          receipt_url: receiptUrl,
          receipt_file: undefined, // Remove file object from JSON
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record payment')
      toast.success('Payment recorded successfully')
      setShowPayment(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment')
    } finally {
      setSavingPayment(false)
    }
  }

  const openReceiptUpload = async (proposal: any) => {
    // Fetch the payment record for this proposal
    try {
      console.log('Fetching payment for proposal:', proposal.id)
      const res = await fetch(`/api/payment-records?proposal_id=${proposal.id}`)
      if (!res.ok) throw new Error('Failed to fetch payment record')
      const data = await res.json()
      
      console.log('API Response:', data)
      
      // The API returns { records: [...] }
      const payments = data.records || data
      
      console.log('Payments array:', payments)
      
      if (!payments || payments.length === 0) {
        toast.error('No payment record found for this proposal')
        return
      }
      
      const payment = payments[0] // Get the first payment
      
      console.log('Selected payment:', payment)
      
      if (!payment || !payment.id) {
        toast.error('Invalid payment record')
        console.error('Payment object is missing id:', payment)
        return
      }
      
      setReceiptUploadForm({
        payment_id: payment.id,
        proposal_id: proposal.id,
        receipt_file: null,
      })
      setShowReceiptUpload(true)
    } catch (e: any) {
      console.error('Error loading payment record:', e)
      toast.error(e.message || 'Failed to load payment record')
    }
  }

  const uploadReceipt = async () => {
    if (!receiptUploadForm.receipt_file) {
      toast.error('Please select a receipt file to upload')
      return
    }
    
    setUploadingReceipt(true)
    try {
      // Upload file first
      const fileFormData = new FormData()
      fileFormData.append('file', receiptUploadForm.receipt_file)
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: fileFormData,
      })
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload receipt file')
      }
      
      const uploadData = await uploadRes.json()
      
      // Update payment record with receipt URL
      const res = await fetch(`/api/payment-records/${receiptUploadForm.payment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_url: uploadData.url,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update payment record')
      }
      
      toast.success('Receipt uploaded successfully!')
      setShowReceiptUpload(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload receipt')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const filtered = proposals.filter((p) => (filter === 'all' ? true : p.status === filter))
  
  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProposals = filtered.slice(startIndex, endIndex)
  
  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#00205B]">{title}</h2>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
          {canManage && (
            <button onClick={openAssign} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Assign Proposal
            </button>
          )}
        </div>
      </div>

      {/* Info banner for payment staff (treasurer) */}
      {mode === 'staff' && !canManage && canPay && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900 mb-4">
          <p className="font-semibold mb-1">💰 Treasurer Payment Authority</p>
          <p>
            You see only <strong>approved proposals</strong> ready for payment. 
            You are the <strong>primary payment authority</strong> - record payments after disbursing funds.
          </p>
        </div>
      )}

      {/* Info banner for finance view (view-only) */}
      {mode === 'staff' && !canManage && !canPay && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 mb-4">
          <p className="font-semibold mb-1">📊 Finance View (Read-Only)</p>
          <p>
            You see <strong>approved proposals</strong> for accounting and reconciliation. 
            The <strong>Treasurer records payments</strong> - your role is to verify and reconcile transactions.
          </p>
        </div>
      )}

      {mode === 'member' && committees.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-medium mb-1">Your committees</p>
          <p>
            {(committees as any[])
              .map((c) => `${c.name || 'Committee'} (${c.role || 'member'})`)
              .join(' · ')}
          </p>
          <p className="text-xs mt-2 text-blue-800/80">
            Committee heads (e.g. Cooking head) can fill draft proposals. All committee members can view them.
          </p>
        </div>
      )}

      {mode === 'member' && committees.length === 0 && proposals.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-900">
          You are not in any committee yet. Ask the secretary to add you to a committee
          (and set your role to <strong>head</strong> if you lead it, e.g. Cooking).
          Assigned budget-head proposals will still appear here.
        </div>
      )}

      {mode === 'member' && committees.length === 0 && proposals.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
          <strong>Note:</strong> You&apos;re assigned as budget head for {proposals.length} proposal{proposals.length > 1 ? 's' : ''}, 
          but not yet added as a committee member. Ask the secretary to add you to the committee to see all committee proposals.
        </div>
      )}

      <div className="space-y-4">
        {paginatedProposals.map((proposal) => (
          <div key={proposal.id} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-bold text-lg text-gray-900 truncate">
                    {proposal.title === 'Pending Details' ? 'Pending Details' : proposal.title}
                  </h3>
                  {statusBadge(proposal.status)}
                  {proposal.viewer_is_budget_head && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#003366]/10 text-[#003366]">
                      Budget Head
                    </span>
                  )}
                  {proposal.viewer_is_committee_head && !proposal.viewer_is_budget_head && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Committee Head
                    </span>
                  )}
                  {!proposal.viewer_is_budget_head &&
                    !proposal.viewer_is_committee_head &&
                    proposal.viewer_committee_role && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Committee {proposal.viewer_committee_role}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {proposal.description || 'No description yet'}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="font-medium text-[#003366]">
                    Total: ¥{Number(proposal.total_amount || 0).toFixed(2)}
                  </span>
                  {proposal.committees?.committee_name && (
                    <span className="text-gray-600">{proposal.committees.committee_name}</span>
                  )}
                  {proposal.budget_head?.full_name && (
                    <span className="text-gray-600">
                      Head: {proposal.budget_head.full_name}
                    </span>
                  )}
                  {Array.isArray(proposal.budget_proposal_items) && (
                    <span className="text-gray-600">
                      {proposal.budget_proposal_items.length} item
                      {proposal.budget_proposal_items.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/budget-proposals/${proposal.id}`)}
                  className="btn-outline text-sm flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>

                {mode === 'member' &&
                  proposal.status === 'draft' &&
                  (proposal.viewer_is_budget_head ||
                    proposal.viewer_is_committee_head ||
                    proposal.viewer_can_edit) && (
                  <button
                    onClick={() => router.push(`/budget-proposals/${proposal.id}/edit`)}
                    className="btn-primary text-sm"
                  >
                    {proposal.title === 'Pending Details' ? 'Fill Details' : 'Edit'}
                  </button>
                )}

                {canManage && proposal.status === 'pending_review' && (
                  <>
                    <button
                      disabled={processing === proposal.id}
                      onClick={() => updateStatus(proposal.id, 'approved')}
                      className="btn-primary text-sm bg-green-600 hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      disabled={processing === proposal.id}
                      onClick={() => {
                        const notes = prompt('Rejection reason (optional):') || ''
                        updateStatus(proposal.id, 'rejected', notes)
                      }}
                      className="btn-outline text-sm text-red-600 border-red-200 flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}

                {canManage && proposal.status === 'draft' && (
                  <>
                    <button
                      disabled={processing === proposal.id}
                      onClick={() => {
                        setConfirmConfig({
                          title: 'Send for Review',
                          message: 'Send this proposal for review? This will allow you to approve or reject it.',
                          confirmText: 'Send for Review',
                          confirmColor: 'bg-blue-600 hover:bg-blue-700',
                          onConfirm: () => {
                            setShowConfirm(false)
                            updateStatus(proposal.id, 'pending_review')
                          }
                        })
                        setShowConfirm(true)
                      }}
                      className="btn-primary text-sm bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Send for Review
                    </button>
                    <button
                      disabled={processing === proposal.id}
                      onClick={() => deleteProposal(proposal.id)}
                      className="btn-outline text-sm text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    {proposal.title === 'Pending Details' && (
                      <button
                        onClick={async () => {
                          // Load committees and members, then open edit modal
                          try {
                            const [cRes, uRes] = await Promise.all([
                              fetch('/api/committees'),
                              fetch('/api/users/active'),
                            ])
                            const cData = await cRes.json()
                            const uData = await uRes.json()
                            if (cRes.ok) setCommittees(cData.committees || [])
                            if (uRes.ok) setAllMembers(uData.users || [])
                            
                            setEditingProposal(proposal)
                            setEditAssignmentForm({
                              committee_id: proposal.committee_id || '',
                              budget_head_id: proposal.budget_head_id || '',
                            })
                            setShowEditAssignment(true)
                          } catch {
                            toast.error('Failed to load assignment data')
                          }
                        }}
                        className="btn-outline text-sm"
                      >
                        Edit Assignment
                      </button>
                    )}
                  </>
                )}

                {canManage && proposal.status === 'rejected' && (
                  <button
                    disabled={processing === proposal.id}
                    onClick={() => {
                      setConfirmConfig({
                        title: 'Return to Draft',
                        message: 'Move this rejected proposal back to draft status? The budget head can then revise and resubmit it.',
                        confirmText: 'Return to Draft',
                        confirmColor: 'bg-amber-600 hover:bg-amber-700',
                        onConfirm: () => {
                          setShowConfirm(false)
                          updateStatus(proposal.id, 'draft', '')
                        }
                      })
                      setShowConfirm(true)
                    }}
                    className="btn-primary text-sm bg-amber-600 hover:bg-amber-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Redo (Return to Draft)
                  </button>
                )}

                {canPay && proposal.status === 'approved' && (
                  <button
                    onClick={() => openPayment(proposal)}
                    className="btn-primary text-sm bg-green-600 hover:bg-green-700 flex items-center gap-1"
                  >
                    <Banknote className="w-4 h-4" />
                    Record Payment
                  </button>
                )}

                {canPay && proposal.status === 'paid' && (
                  <button
                    onClick={() => openReceiptUpload(proposal)}
                    className="btn-outline text-sm flex items-center gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg space-y-2">
            <p>No budget proposals found{filter !== 'all' ? ` with status “${filter}”` : ''}.</p>
            {canManage && filter === 'all' && (
              <p className="text-sm">
                Click <strong>Assign Proposal</strong> to give a committee head a draft to fill in.
              </p>
            )}
            {mode === 'member' && filter === 'all' && (
              <p className="text-sm">
                When the secretary assigns a proposal to your committee, it will show up here.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Professional Pagination */}
      {filtered.length > itemsPerPage && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">
              Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
            </span>
            <span className="text-gray-500">proposals</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              First
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 text-sm font-medium rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#D62828] text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Assign Budget Proposal</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
              <select
                value={assignForm.committee_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, committee_id: e.target.value, budget_head_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select committee</option>
                {committees.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.committee_name || c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Proposal Head</label>
              <select
                value={assignForm.budget_head_id}
                onChange={(e) => setAssignForm((p) => ({ ...p, budget_head_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!assignForm.committee_id}
              >
                <option value="">Select head</option>
                {committeeMembersForAssign.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                    {m.committee_role ? ` (${m.committee_role})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Prefer the committee head (e.g. Cooking head). They fill in the proposal details.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAssign(false)} className="btn-outline">Cancel</button>
              <button onClick={submitAssign} disabled={assigning} className="btn-primary">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment modal */}
      {showEditAssignment && editingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Edit Assignment</h3>
            <p className="text-sm text-gray-600">
              Change the committee or budget head for this proposal
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
              <select
                value={editAssignmentForm.committee_id}
                onChange={(e) => setEditAssignmentForm((p) => ({ ...p, committee_id: e.target.value, budget_head_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select committee</option>
                {committees.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.committee_name || c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Proposal Head</label>
              <select
                value={editAssignmentForm.budget_head_id}
                onChange={(e) => setEditAssignmentForm((p) => ({ ...p, budget_head_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!editAssignmentForm.committee_id}
              >
                <option value="">Select head</option>
                {allMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This person will fill in the proposal details.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => {
                setShowEditAssignment(false)
                setEditingProposal(null)
              }} className="btn-outline">Cancel</button>
              <button onClick={updateAssignment} disabled={updatingAssignment} className="btn-primary">
                {updatingAssignment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (¥)</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="alipay">Alipay (支付宝)</option>
                <option value="wechat_pay">WeChat Pay (微信支付)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">
                  <span className="font-mono text-blue-600">Auto-generated</span> upon saving
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format: BP-YYYYMMDD-XXXXX (e.g., BP-20241013-00001)
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid To</label>
              <input
                value={paymentForm.paid_to_name}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paid_to_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Proof <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPaymentForm((p) => ({ ...p, receipt_file: file }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload receipt, screenshot, or transaction confirmation (Image or PDF)
              </p>
              {paymentForm.receipt_file && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {paymentForm.receipt_file.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPayment(false)} className="btn-outline">Cancel</button>
              <button onClick={savePayment} disabled={savingPayment} className="btn-primary">
                {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Upload Modal */}
      {showReceiptUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Upload Payment Receipt</h3>
            <p className="text-sm text-gray-600">
              Add or update the payment proof for this paid proposal.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setReceiptUploadForm((p) => ({ ...p, receipt_file: file }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload receipt, screenshot, or transaction confirmation (Image or PDF, max 10MB)
              </p>
              {receiptUploadForm.receipt_file && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {receiptUploadForm.receipt_file.name} ({(receiptUploadForm.receipt_file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This will update the payment record with the new receipt. Previous receipt (if any) will be replaced.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => {
                  setShowReceiptUpload(false)
                  setReceiptUploadForm({ payment_id: '', proposal_id: '', receipt_file: null })
                }} 
                className="btn-outline"
                disabled={uploadingReceipt}
              >
                Cancel
              </button>
              <button 
                onClick={uploadReceipt} 
                disabled={uploadingReceipt || !receiptUploadForm.receipt_file} 
                className="btn-primary bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                {uploadingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && confirmConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{confirmConfig.title}</h3>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">{confirmConfig.message}</p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${confirmConfig.confirmColor}`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
