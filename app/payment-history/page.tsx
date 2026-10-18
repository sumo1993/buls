'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  CreditCard, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Loader2,
  Filter,
  Search,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDateTime, formatDateShort, formatMonthYear } from '@/lib/utils'
import { cachedFetch, clientCache } from '@/lib/cache'

export default function PaymentHistoryPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [filteredPayments, setFilteredPayments] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const paymentsPerPage = 10
  const [viewProofModal, setViewProofModal] = useState(false)
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  useEffect(() => {
    filterPayments()
  }, [payments, filterStatus, searchTerm])

  const fetchData = async () => {
    try {
      // Fetch payments via API to bypass RLS
      const paymentsResponse = await fetch('/api/payments')
      
      if (!paymentsResponse.ok) {
        throw new Error('Failed to load payments')
      }

      const result = await paymentsResponse.json()
      
      console.log('💳 Payment History: Fetched payments', {
        count: result.payments?.length || 0,
        samplePayment: result.payments?.[0] ? {
          id: result.payments[0].id,
          month: result.payments[0].month,
          year: result.payments[0].year,
          amount: result.payments[0].amount,
          status: result.payments[0].status,
          created_at: result.payments[0].created_at
        } : null
      })
      
      setUser({ id: userId }) // Set basic user info
      setPayments(result.payments || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        // Include both 'pending' and 'collected' as they're both awaiting Finance approval
        filtered = filtered.filter(p => p.status === 'pending' || p.status === 'collected')
      } else {
        filtered = filtered.filter(p => p.status === filterStatus)
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.year.toString().includes(searchTerm) ||
        p.reference_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    console.log('🔍 Payment History: Filtering', {
      totalPayments: payments.length,
      filterStatus: filterStatus,
      searchTerm: searchTerm,
      filteredCount: filtered.length
    })

    setFilteredPayments(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const calculateStats = () => {
    const totalPaid = payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    
    // Include both 'pending' and 'collected' as pending (awaiting Finance approval)
    const pendingAmount = payments
      .filter(p => p.status === 'pending' || p.status === 'collected')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)

    const approvedCount = payments.filter(p => p.status === 'approved').length
    const pendingCount = payments.filter(p => p.status === 'pending' || p.status === 'collected').length
    const rejectedCount = payments.filter(p => p.status === 'rejected').length

    return { totalPaid, pendingAmount, approvedCount, pendingCount, rejectedCount }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600">View all your payment records and dues</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div 
            className="card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setFilterStatus('approved')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setFilterStatus('pending')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setFilterStatus('approved')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-700">{stats.approvedCount}</p>
              </div>
              <CreditCard className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setFilterStatus('rejected')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejectedCount}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by month, year, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-[#003366] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="card">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Start by making your first payment'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * paymentsPerPage) + 1} to {Math.min(currentPage * paymentsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments
                      .slice((currentPage - 1) * paymentsPerPage, currentPage * paymentsPerPage)
                      .map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDateTime(payment.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{formatMonthYear(payment.month, payment.year)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#003366]">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 font-mono">
                            {payment.reference_code || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(payment.status)}
                              <span className={`badge-${payment.status}`}>
                                {payment.status}
                              </span>
                            </div>
                            {payment.status === 'approved' && payment.reviewed_at && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Approved by Finance on {formatDateTime(payment.reviewed_at)}
                              </p>
                            )}
                            {payment.status === 'collected' && (
                              <p className="text-xs text-blue-600 mt-1">
                                Verified by Treasurer, pending Finance approval
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {payment.status === 'approved' && payment.receipt_number ? (
                            <button
                              onClick={() => {
                                setSelectedReceipt(payment)
                                setShowReceiptModal(true)
                              }}
                              className="text-green-600 hover:underline text-sm flex items-center cursor-pointer font-medium"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View Receipt
                            </button>
                          ) : payment.proof_url ? (
                            <button
                              onClick={() => {
                                setSelectedProofUrl(payment.proof_url)
                                setViewProofModal(true)
                              }}
                              className="text-blue-600 hover:underline text-sm flex items-center cursor-pointer"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              View Proof
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No proof</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredPayments.length > paymentsPerPage && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(filteredPayments.length / paymentsPerPage) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-[#003366] text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPayments.length / paymentsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(filteredPayments.length / paymentsPerPage)}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Proof Image Modal */}
      {viewProofModal && selectedProofUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewProofModal(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment Proof</h3>
              <button
                onClick={() => setViewProofModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img 
                src={selectedProofUrl} 
                alt="Payment Proof" 
                className="w-full h-auto"
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
              <a
                href={selectedProofUrl}
                download="payment-proof.png"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </a>
              <button
                onClick={() => setViewProofModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal - Real Receipt Style */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Receipt Header - Simple and Clean */}
            <div className="p-6 border-b-2 border-dashed border-gray-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase">Official Receipt</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Beijing Union of Liberian Student</p>
                <p className="text-xs text-gray-500">BULS Financial Services</p>
              </div>
              <div className="text-center border-t border-b border-gray-200 py-3 my-3">
                <p className="text-xs text-gray-500 mb-1">Receipt Number</p>
                <p className="text-xl font-mono font-bold text-gray-900">{selectedReceipt.receipt_number}</p>
              </div>
            </div>

            {/* Receipt Body - Transaction Details */}
            <div className="p-6" id="receipt-content">
              {/* Transaction Info */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">{formatDateTime(selectedReceipt.reviewed_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Student:</span>
                  <span className="font-medium text-gray-900">{selectedReceipt.users?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900 text-xs">{selectedReceipt.users?.email}</span>
                </div>
              </div>

              {/* Dashed Line Separator */}
              <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

              {/* Payment Items */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Payment Details</p>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-900">Monthly Dues - {selectedReceipt.month} {selectedReceipt.year}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Amount</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
              </div>

              {/* Dashed Line Separator */}
              <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded">
                <span className="text-sm font-bold text-gray-900 uppercase">Total Paid</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedReceipt.amount)}</span>
              </div>

              {/* Payment Method Info */}
              <div className="space-y-2 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="text-gray-900 font-medium">
                    {selectedReceipt.payment_source === 'cash' ? 'Cash' : selectedReceipt.payment_method?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed By:</span>
                  <span className="text-gray-900 font-medium">{selectedReceipt.collector?.full_name || 'Treasurer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved By:</span>
                  <span className="text-gray-900 font-medium">Finance Department</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-center border-2 border-gray-900 py-2 mb-4">
                <p className="text-xs font-bold text-gray-900 uppercase">✓ Paid in Full</p>
              </div>

              {/* Custom Notes if any */}
              {selectedReceipt.collection_notes && 
               selectedReceipt.collection_notes !== 'Cash payment received in person' &&
               selectedReceipt.collection_notes !== 'Verified by treasurer' && (
                <div className="mb-4 p-2 bg-gray-50 border-l-2 border-gray-400">
                  <p className="text-xs text-gray-600">Note: {selectedReceipt.collection_notes}</p>
                </div>
              )}

              {/* Footer Information */}
              <div className="text-center text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-200">
                <p>Thank you for your payment</p>
                <p>Generated: {new Date().toLocaleString()}</p>
                <p className="font-mono">{selectedReceipt.receipt_number}</p>
                <p className="mt-2 text-[10px]">This is an official receipt from BULS</p>
              </div>
            </div>

            {/* Receipt Footer - Action Buttons */}
            <div className="border-t p-4 flex justify-center gap-3 bg-gray-50">
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
