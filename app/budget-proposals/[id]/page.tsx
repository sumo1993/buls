'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ViewBudgetProposalPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<any>(null)
  const [access, setAccess] = useState<any>(null)
  const [userRole, setUserRole] = useState('member')
  const [paymentInfo, setPaymentInfo] = useState<any>(null)

  useEffect(() => {
    if (userId && proposalId) {
      fetchProposal()
    }
  }, [userId, proposalId])

  const fetchProposal = async () => {
    try {
      const [proposalRes, userRes] = await Promise.all([
        fetch(`/api/budget-proposals/${proposalId}`),
        fetch('/api/user'),
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUserRole(userData.role || 'member')
      }

      if (proposalRes.ok) {
        const data = await proposalRes.json()
        setProposal(data.proposal)
        setAccess(data.access || null)
        
        // Fetch payment info if proposal is paid
        if (data.proposal.status === 'paid') {
          const paymentRes = await fetch(`/api/payment-records?proposal_id=${proposalId}`)
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json()
            setPaymentInfo(paymentData.records?.[0] || null)
          }
        }
      } else {
        const err = await proposalRes.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load proposal')
        router.push('/my-budget-proposals')
      }
    } catch (error) {
      console.error('Error fetching proposal:', error)
      toast.error('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!proposal) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="p-8">
          <p>Proposal not found</p>
        </div>
      </DashboardLayout>
    )
  }

  const canEditDraft = access?.canEditAsMember || (access?.canEdit && proposal.status === 'draft')

  return (
    <DashboardLayout userRole={userRole}>
      <div className="max-w-7xl mx-auto p-3 space-y-3">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>

        {/* Two Column Layout: Payment Sidebar + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Sidebar - Payment Information (1/3 width on large screens) */}
          {proposal.status === 'paid' && paymentInfo && (
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Payment Confirmation</h3>
                          <p className="text-xs text-emerald-100">Transaction Completed Successfully</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right mt-2">
                      <div className="text-xs text-emerald-100 uppercase tracking-wide">Status</div>
                      <div className="text-sm font-bold text-white">PAID</div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white">
                    {/* Amount - Prominent */}
                    <div className="text-center pb-6 border-b border-gray-200">
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Amount Paid</div>
                      <div className="text-4xl font-bold text-gray-900">¥{paymentInfo.amount?.toFixed(2) || '0.00'}</div>
                      <div className="text-xs text-gray-500 mt-1">Chinese Yuan (CNY)</div>
                    </div>

                    {/* Transaction Details Grid */}
                    <div className="mt-6 space-y-4">
                      {/* Reference Number */}
                      <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transaction Reference</div>
                          <div className="font-mono text-sm font-semibold text-gray-900 tracking-wide break-all">{paymentInfo.payment_reference || 'N/A'}</div>
                        </div>
                        <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded ml-2 shrink-0">
                          Verified
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="pb-3 border-b border-gray-100">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Payment Method</div>
                        <div className="flex items-center gap-2">
                          {paymentInfo.payment_method === 'alipay' && (
                            <>
                              <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center shrink-0">
                                <span className="text-lg">💳</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Alipay</div>
                                <div className="text-xs text-gray-500">支付宝</div>
                              </div>
                            </>
                          )}
                          {paymentInfo.payment_method === 'wechat_pay' && (
                            <>
                              <div className="w-8 h-8 bg-green-50 rounded flex items-center justify-center shrink-0">
                                <span className="text-lg">💬</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">WeChat Pay</div>
                                <div className="text-xs text-gray-500">微信支付</div>
                              </div>
                            </>
                          )}
                          {paymentInfo.payment_method === 'bank_transfer' && (
                            <>
                              <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center shrink-0">
                                <span className="text-lg">🏦</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Bank Transfer</div>
                                <div className="text-xs text-gray-500">银行转账</div>
                              </div>
                            </>
                          )}
                          {paymentInfo.payment_method === 'cash' && (
                            <>
                              <div className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center shrink-0">
                                <span className="text-lg">💵</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Cash</div>
                                <div className="text-xs text-gray-500">现金</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Transaction Date */}
                      <div className="pb-3 border-b border-gray-100">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Transaction Date</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {new Date(paymentInfo.payment_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(paymentInfo.payment_date).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>

                      {/* Payee Information */}
                      <div className="pb-3 border-b border-gray-100">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Paid To</div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{paymentInfo.paid_to_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">Beneficiary</div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {paymentInfo.notes && (
                        <div className="pb-3">
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Transaction Notes</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                            {paymentInfo.notes}
                          </div>
                        </div>
                      )}

                      {/* Receipt/Proof */}
                      {paymentInfo.receipt_url && (
                        <div className="pt-2">
                          <a
                            href={paymentInfo.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 hover:from-emerald-100 hover:to-blue-100 border border-emerald-200 rounded-lg transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">View Payment Proof</div>
                                <div className="text-xs text-gray-500">Receipt or confirmation</div>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secured Transaction</span>
                      </div>
                      <div>
                        ID: {paymentInfo.id?.slice(0, 8) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Content - Main Budget Proposal (2/3 width on large screens, full width if no payment) */}
          <div className={proposal.status === 'paid' && paymentInfo ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Main Card */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Header Section - Ultra Compact */}
          <div className="bg-gradient-to-r from-[#00205B] to-[#003366] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-white">{proposal.title}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                proposal.status === 'draft' ? 'bg-yellow-400 text-yellow-900' :
                proposal.status === 'pending_review' ? 'bg-blue-400 text-blue-900' :
                proposal.status === 'approved' ? 'bg-green-400 text-green-900' :
                proposal.status === 'rejected' ? 'bg-red-400 text-red-900' :
                proposal.status === 'paid' ? 'bg-purple-400 text-purple-900' :
                'bg-gray-400 text-gray-900'
              }`}>
                {proposal.status === 'draft' ? 'Draft' :
                 proposal.status === 'pending_review' ? 'Under Review' :
                 proposal.status === 'approved' ? 'Approved' :
                 proposal.status === 'rejected' ? 'Rejected' :
                 proposal.status === 'paid' ? 'Paid' : proposal.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-blue-100 mt-1.5">
              <span><span className="font-medium">Committee:</span> {proposal.committees?.committee_name || 'N/A'}</span>
              {proposal.budget_head && (
                <span><span className="font-medium">Budget Head:</span> {proposal.budget_head.full_name}</span>
              )}
            </div>
          </div>

          {/* Content Section - Ultra Compact */}
          <div className="px-4 py-3 space-y-3">
            {/* Description */}
            {proposal.description && proposal.description !== 'Meet and Greet' && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#D62828]" />
                  Description
                </h3>
                <div className="bg-gray-50 rounded p-2.5 border border-gray-200">
                  <p className="text-xs text-gray-700 leading-relaxed">{proposal.description}</p>
                </div>
              </div>
            )}

            {/* Budget Items - Ultra Compact */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Budget Items
              </h3>
              
              {proposal.budget_proposal_items && proposal.budget_proposal_items.length > 0 ? (
                <div className="space-y-1.5">
                  {proposal.budget_proposal_items.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="bg-white border border-gray-200 rounded p-2.5 hover:border-[#003366] hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm mb-0.5 truncate">{item.item_name}</h4>
                          {item.description && (
                            <p className="text-xs text-gray-600 mb-1.5 line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-600">Qty:</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{item.quantity}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-600">Unit:</span>
                              <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-semibold">¥{item.unit_cost?.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500 mb-0.5">Total</p>
                          <p className="text-base font-bold text-[#003366]">¥{item.total_cost?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded p-6 text-center border-2 border-dashed border-gray-300">
                  <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-xs font-medium">No budget items added yet</p>
                </div>
              )}
            </div>

            {/* Total Amount - Ultra Compact */}
            <div className="bg-gradient-to-r from-[#003366] to-[#00205B] rounded p-3 border-2 border-[#D62828]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-xs mb-0.5">Total Budget Amount</p>
                  <p className="text-3xl font-extrabold text-white">¥{proposal.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5">
                  <p className="text-blue-200 text-xs mb-0.5">Items</p>
                  <p className="text-xl font-bold text-white text-center">{proposal.budget_proposal_items?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Review Notes - Compact */}
            {proposal.review_notes && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Review Notes
                </h3>
                <div className="bg-red-50 border border-red-200 rounded p-2.5">
                  <p className="text-red-900 text-xs font-medium leading-relaxed">{proposal.review_notes}</p>
                </div>
              </div>
            )}

            {/* Metadata - Ultra Compact with Time */}
            <div className="border-t border-gray-200 pt-2">
              <h3 className="text-xs font-bold text-gray-600 uppercase mb-1.5">Timeline</h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {proposal.created_at && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-blue-500 rounded-full shrink-0"></span>
                    <span className="text-gray-600 truncate">{new Date(proposal.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}</span>
                  </div>
                )}
                {proposal.submitted_at && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-yellow-500 rounded-full shrink-0"></span>
                    <span className="text-gray-600 truncate">{new Date(proposal.submitted_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}</span>
                  </div>
                )}
                {proposal.secretary_approved_at && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full shrink-0"></span>
                    <span className="text-gray-600 truncate">{new Date(proposal.secretary_approved_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}</span>
                  </div>
                )}
                {proposal.paid_at && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-purple-500 rounded-full shrink-0"></span>
                    <span className="text-gray-600 truncate">{new Date(proposal.paid_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer - Ultra Compact */}
          {canEditDraft && (
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => router.push(`/budget-proposals/${proposal.id}/edit`)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#D62828] text-white font-semibold rounded text-xs hover:bg-[#B02020] transition-colors shadow-md"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {proposal.title === 'Pending Details' ? 'Fill Details' : 'Edit Proposal'}
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
