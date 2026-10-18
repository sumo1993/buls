'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Search, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NonMemberRegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/secretary/non-member-registrations')
      if (!response.ok) throw new Error('Failed to fetch registrations')
      
      const data = await response.json()
      setRegistrations(data.registrations || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const response = await fetch('/api/secretary/non-member-registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) throw new Error('Failed to update status')

      toast.success(`Registration ${status}`)
      fetchRegistrations()
      setSelectedRegistration(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setUpdating(null)
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
      pending: 'Pending',
      payment_pending: 'Payment Pending',
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
      <DashboardLayout userRole="secretary">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="secretary">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Non-Member Registrations</h1>
          <p className="text-gray-600">View approved registrations for event attendance management</p>
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
              <option value="pending">Pending</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Registrations Table */}
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
                    No registrations found
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
                      <button
                        onClick={() => setSelectedRegistration(reg)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
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
              <h2 className="text-xl font-bold text-gray-900">Registration Details</h2>
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
                    <p className="font-medium text-sm">{selectedRegistration.education_level}</p>
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
                {selectedRegistration.address && (
                  <div>
                    <label className="text-xs text-gray-500">Address</label>
                    <p className="font-medium text-sm">{selectedRegistration.address}</p>
                  </div>
                )}
                {selectedRegistration.message && (
                  <div>
                    <label className="text-xs text-gray-500">Message</label>
                    <p className="font-medium text-sm">{selectedRegistration.message}</p>
                  </div>
                )}
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

            {/* Info Note - Secretary can only view */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Only treasurer can approve or reject registrations. 
                You can view details for event attendance management.
              </p>
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
