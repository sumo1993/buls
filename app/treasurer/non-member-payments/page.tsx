'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Search, CheckCircle, XCircle, Eye, DollarSign, RefreshCw, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NonMemberPaymentsPage() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Detail view modal state
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  
  // Refund modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedForRefund, setSelectedForRefund] = useState<any>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundProof, setRefundProof] = useState<File | null>(null)
  const [refundProofUrl, setRefundProofUrl] = useState('')
  const [processingRefund, setProcessingRefund] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/treasurer/non-member-registrations')
      if (!response.ok) throw new Error('Failed to fetch registrations')
      
      const data = await response.json()
      setRegistrations(data.registrations || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  const verifyPayment = async (id: string, verified: boolean) => {
    setUpdating(id)
    try {
      console.log('Verifying payment:', { id, verified })
      
      const response = await fetch('/api/treasurer/non-member-registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, payment_verified: verified })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        let errorData
        const contentType = response.headers.get('content-type')
        console.log('Error content-type:', contentType)
        
        try {
          const text = await response.text()
          console.log('Error response text:', text)
          errorData = text ? JSON.parse(text) : {}
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          throw new Error(`Failed to verify payment (Status: ${response.status})`)
        }
        
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Failed to verify payment')
      }

      const data = await response.json()
      console.log('Success response:', data)

      toast.success(verified ? 'Payment verified and approved' : 'Payment rejected')
      fetchRegistrations()
      setSelectedRegistration(null)
    } catch (error: any) {
      console.error('Verification error:', error)
      toast.error(error.message || 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  const handleRefundClick = (registration: any) => {
    console.log('handleRefundClick called with registration:', registration)
    console.log('refundModalOpen before:', refundModalOpen)
    
    setSelectedForRefund(registration)
    setRefundAmount(registration.amount_paid?.toString() || '')
    setRefundReason('')
    setRefundProof(null)
    setRefundProofUrl('')
    setRefundModalOpen(true)
    
    console.log('refundModalOpen after:', refundModalOpen)
    console.log('selectedForRefund:', selectedForRefund)
  }

  const handleRefundProofUpload = async (file: File) => {
    if (!file) return null

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `refund-${Date.now()}.${fileExt}`
      const filePath = `refund-proofs/${fileName}`

      const { data, error } = await supabase.storage
        .from('event-assets')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('event-assets')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error('Failed to upload refund proof')
    }
  }

  const processRefund = async () => {
    if (!selectedForRefund) return

    // Validate inputs
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error('Please enter a valid refund amount')
      return
    }

    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason')
      return
    }

    if (parseFloat(refundAmount) > selectedForRefund.amount_paid) {
      toast.error('Refund amount cannot exceed amount paid')
      return
    }

    setProcessingRefund(true)
    try {
      // Upload refund proof if provided
      let proofUrl = refundProofUrl
      if (refundProof) {
        proofUrl = await handleRefundProofUpload(refundProof)
      }

      const response = await fetch('/api/treasurer/non-member-refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: selectedForRefund.id,
          refund_amount: parseFloat(refundAmount),
          refund_reason: refundReason,
          refund_proof_url: proofUrl
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process refund')
      }

      toast.success('Refund processed successfully')
      setRefundModalOpen(false)
      setSelectedForRefund(null)
      fetchRegistrations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to process refund')
    } finally {
      setProcessingRefund(false)
    }
  }

  const downloadPaymentProof = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'payment-proof.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const filteredRegistrations = registrations.filter(reg => {
    // If no search term, just apply status filter
    if (!searchTerm.trim()) {
      const matchesFilter = filterStatus === 'all' || reg.status === filterStatus
      return matchesFilter
    }

    // Search by last 3 digits of verification code or phone number
    const searchValue = searchTerm.trim()
    const matchesSearch = 
      (reg.verification_code && reg.verification_code.slice(-3).includes(searchValue)) ||
      (reg.phone && reg.phone.includes(searchValue))

    const matchesFilter = filterStatus === 'all' || reg.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-blue-100 text-blue-800',
      payment_pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800'
    }
    const labels = {
      pending: 'Approved',
      payment_pending: 'Awaiting Verification',
      approved: 'Approved',
      rejected: 'Rejected',
      refunded: 'Refunded'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <DashboardLayout userRole="treasurer">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="treasurer">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Non-Member Payment Verification</h1>
          <p className="text-gray-600">Review and verify payment proofs from non-member registrations</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Awaiting Verification</p>
                <p className="text-2xl font-bold text-gray-900">
                  {registrations.filter(r => r.status === 'payment_pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {registrations.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {registrations.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by last 3 digits or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="payment_pending">Awaiting Verification</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-bold text-blue-600">{reg.verification_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{reg.full_name}</div>
                      <div className="text-xs text-gray-500">{reg.country} - {reg.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{reg.events?.title || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{reg.events?.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{reg.email}</div>
                      <div className="text-xs text-gray-500">{reg.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        ¥{reg.amount_paid?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reg.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRegistration(reg)}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {!reg.refunded_at && (reg.status === 'approved' || reg.status === 'pending' || reg.status === 'payment_pending') && (
                          <button
                            onClick={() => handleRefundClick(reg)}
                            className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Payment Verification</h2>
              <button
                onClick={() => setSelectedRegistration(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Verification Code</label>
                    <p className="font-mono text-base font-bold text-blue-600">{selectedRegistration.verification_code}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500">Full Name</label>
                  <p className="font-medium text-sm">{selectedRegistration.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <p className="font-medium text-sm">{selectedRegistration.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Phone</label>
                  <p className="font-medium text-sm">{selectedRegistration.phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Education Level</label>
                    <p className="font-medium text-sm">{selectedRegistration.education_level || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Country</label>
                    <p className="font-medium text-sm">{selectedRegistration.country}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">City</label>
                  <p className="font-medium text-sm">{selectedRegistration.city}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Event</label>
                  <p className="font-medium text-sm">{selectedRegistration.events?.title}</p>
                  <p className="text-xs text-gray-500">{selectedRegistration.events?.location}</p>
                </div>

                {/* Show refund info if refunded */}
                {selectedRegistration.refunded_at && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mt-3">
                    <h3 className="font-semibold text-purple-900 mb-2 text-sm">Refund Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-purple-700">Refund Amount</label>
                        <p className="font-bold text-purple-900">¥{selectedRegistration.refund_amount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-purple-700">Refunded At</label>
                        <p className="font-medium text-purple-900">
                          {new Date(selectedRegistration.refunded_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-purple-700">Reason</label>
                        <p className="font-medium text-purple-900">{selectedRegistration.refund_reason}</p>
                      </div>
                      {selectedRegistration.refund_proof_url && (
                        <div className="col-span-2">
                          <label className="text-purple-700 block mb-1">Refund Proof</label>
                          <img
                            src={selectedRegistration.refund_proof_url}
                            alt="Refund proof"
                            onClick={() => setImagePreview(selectedRegistration.refund_proof_url)}
                            className="max-w-xs border border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                            title="Click to view full size"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Payment Proof */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Payment Proof</label>
                  {selectedRegistration.payment_proof_url && (
                    <button
                      onClick={() => downloadPaymentProof(
                        selectedRegistration.payment_proof_url,
                        `payment-proof-${selectedRegistration.verification_code}.jpg`
                      )}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  )}
                </div>
                {selectedRegistration.payment_proof_url ? (
                  <img
                    src={selectedRegistration.payment_proof_url}
                    alt="Payment proof"
                    onClick={() => setImagePreview(selectedRegistration.payment_proof_url)}
                    className="w-full border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                    title="Click to view full size"
                  />
                ) : (
                  <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                    No payment proof available
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedRegistration.status === 'payment_pending' && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => verifyPayment(selectedRegistration.id, true)}
                  disabled={updating === selectedRegistration.id}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 text-sm"
                >
                  {updating === selectedRegistration.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify & Approve
                    </>
                  )}
                </button>
                <button
                  onClick={() => verifyPayment(selectedRegistration.id, false)}
                  disabled={updating === selectedRegistration.id}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 text-sm"
                >
                  {updating === selectedRegistration.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject Payment
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModalOpen && selectedForRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Process Refund</h2>
              <button
                onClick={() => setRefundModalOpen(false)}
                disabled={processingRefund}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{selectedForRefund.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Code:</span>
                    <p className="font-mono font-bold text-blue-600">{selectedForRefund.verification_code}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Event:</span>
                    <p className="font-medium">{selectedForRefund.events?.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount Paid:</span>
                    <p className="font-bold text-green-600">¥{selectedForRefund.amount_paid?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount (¥) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedForRefund.amount_paid}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={processingRefund}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Enter refund amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Reason *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  disabled={processingRefund}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Explain why this refund is being issued..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Proof (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRefundProof(e.target.files?.[0] || null)}
                    disabled={processingRefund}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload receipt or proof of refund transaction</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setRefundModalOpen(false)}
                  disabled={processingRefund}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={processRefund}
                  disabled={processingRefund}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  {processingRefund ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Process Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={imagePreview}
              alt="Payment proof full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
