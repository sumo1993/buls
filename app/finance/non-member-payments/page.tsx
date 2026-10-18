'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Search, Download, Eye, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FinanceNonMemberPaymentsPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewImage, setViewImage] = useState<string | null>(null)

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

  const filteredRegistrations = registrations.filter(reg => {
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

  const downloadPaymentProof = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const stats = {
    total: registrations.length,
    payment_pending: registrations.filter(r => r.status === 'payment_pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    refunded: registrations.filter(r => r.status === 'refunded').length,
    totalRevenue: registrations
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0),
    totalRefunded: registrations
      .filter(r => r.status === 'refunded')
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0)
  }

  if (loading) {
    return (
      <DashboardLayout userRole="finance">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole="finance">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Non-Member Payments - Finance Audit</h1>
          <p className="text-gray-600">View all non-member registration payments and transactions (Read-Only)</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Registrations</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Awaiting Verification</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.payment_pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-600">¥{stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Refunded</p>
            <p className="text-2xl font-bold text-purple-600">¥{stats.totalRefunded.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by last 3 digits of code or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="payment_pending">Awaiting Verification</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tx Number</th>
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
              <tbody className="bg-white divide-y divide-gray-200">
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
                        <button
                          onClick={() => {
                            setSelectedRegistration(reg)
                            setShowDetailModal(true)
                          }}
                          className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {reg.transaction_number}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-bold text-blue-600">
                          {reg.verification_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{reg.full_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{reg.events?.title || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          <div>{reg.email}</div>
                          <div>{reg.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          ¥{reg.amount_paid?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(reg.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(reg.registered_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setSelectedRegistration(reg)
                            setShowDetailModal(true)
                          }}
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
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                <p className="text-sm text-gray-600">Finance audit view - view only</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {/* Two-column grid for Code and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Verification Code:</span>
                  <p className="font-mono font-bold text-blue-600 text-sm">{selectedRegistration.verification_code}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Transaction Number:</span>
                  <p className="font-mono font-bold text-blue-600 text-sm">{selectedRegistration.transaction_number}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Payment Time:</span>
                  <p className="font-medium text-sm text-gray-700">
                    {selectedRegistration.registered_at ? new Date(selectedRegistration.registered_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">Full Name:</span>
                <p className="font-medium text-sm">{selectedRegistration.full_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Email:</span>
                  <p className="font-medium text-sm">{selectedRegistration.email}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Phone:</span>
                  <p className="font-medium text-sm">{selectedRegistration.phone}</p>
                </div>
              </div>

              {/* Educational Level and Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Education Level:</span>
                  <p className="font-medium text-sm">{selectedRegistration.education_level || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Country:</span>
                  <p className="font-medium text-sm">{selectedRegistration.country || 'N/A'}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">City:</span>
                <p className="font-medium text-sm">{selectedRegistration.city || 'N/A'}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Event:</span>
                {selectedRegistration.event_id ? (
                  <p className="font-bold text-green-600 text-sm">
                    {selectedRegistration.events?.title || `Event ID: ${selectedRegistration.event_id}`}
                  </p>
                ) : (
                  <p className="font-bold text-red-600 text-sm">Event not assigned</p>
                )}
              </div>

              <div>
                <span className="text-xs text-gray-500">Amount Paid:</span>
                <p className="font-bold text-green-600 text-sm">¥{selectedRegistration.amount_paid?.toFixed(2)}</p>
              </div>

              {selectedRegistration.payment_proof_url && (
                <div>
                  <span className="text-xs text-gray-500">Payment Proof:</span>
                  <div className="mt-2 flex gap-2 items-start">
                    <img 
                      src={selectedRegistration.payment_proof_url} 
                      alt="Payment proof" 
                      className="w-48 h-32 object-cover rounded border cursor-pointer hover:opacity-90 hover:shadow-lg"
                      onClick={() => setViewImage(selectedRegistration.payment_proof_url)}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/192x128?text=No+Image'
                      }}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => downloadPaymentProof(selectedRegistration.payment_proof_url, `payment-${selectedRegistration.verification_code}.jpg`)}
                        className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <a 
                        href={selectedRegistration.payment_proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Open in new tab
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {selectedRegistration.status === 'refunded' && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold text-sm text-purple-600 mb-2">Refund Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Refund Amount:</span>
                      <p className="font-bold text-purple-600 text-sm">¥{selectedRegistration.refund_amount?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Refund Reason:</span>
                      <p className="font-medium text-sm">{selectedRegistration.refund_reason}</p>
                    </div>
                    {selectedRegistration.refund_proof_url && (
                      <div>
                        <span className="text-xs text-gray-500">Refund Proof:</span>
                        <div className="mt-2">
                          <img 
                            src={selectedRegistration.refund_proof_url} 
                            alt="Refund proof" 
                            className="w-32 h-32 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => setViewImage(selectedRegistration.refund_proof_url)}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-500">Refunded At:</span>
                      <p className="font-medium text-sm">{new Date(selectedRegistration.refunded_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRegistration.status === 'approved' && (
                <div>
                  <span className="text-xs text-gray-500">Verification Time:</span>
                  <p className="font-medium text-sm text-gray-700">
                    {selectedRegistration.updated_at ? new Date(selectedRegistration.updated_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
              
              {selectedRegistration.status === 'approved' && (
                <div>
                  <span className="text-xs text-gray-500">Verified By:</span>
                  <p className="font-medium text-sm text-gray-700">Treasurer</p>
                </div>
              )}

              <div>
                <span className="text-xs text-gray-500">Registered At:</span>
                <p className="font-medium text-sm">{new Date(selectedRegistration.registered_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-60"
          onClick={() => setViewImage(null)}
        >
          <img 
            src={viewImage} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DashboardLayout>
  )
}
