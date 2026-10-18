'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, DollarSign, TrendingUp, Users, Calendar, CheckCircle, Eye, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function TreasurerPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [collectionNotes, setCollectionNotes] = useState('')
  const [collectionMethod, setCollectionMethod] = useState('in_person')

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      if (userError || !userData) {
        console.error('User error:', userError)
        toast.error('Failed to load user data')
        setLoading(false)
        return
      }

      setUser(userData)

      // Check if user is treasurer or admin
      if (userData.role !== 'admin' && userData.role !== 'treasurer') {
        toast.error('Access denied. Treasurer panel requires treasurer or admin role.')
        router.push('/dashboard')
        return
      }

      // Fetch all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          users:user_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('Payments error:', paymentsError)
        console.error('Payments error details:', JSON.stringify(paymentsError, null, 2))
        toast.error('Failed to load payments data')
      } else {
        setPayments(paymentsData || [])
      }

      // Fetch all loans
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select(`
          *,
          users:user_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (loansError) {
        console.error('Loans error:', loansError)
      } else {
        setLoans(loansData || [])
      }

      // Fetch all active users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, status')
        .eq('status', 'active')

      if (usersError) {
        console.error('Users error:', usersError)
      } else {
        setUsers(usersData || [])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load treasurer data')
    } finally {
      setLoading(false)
    }
  }

  const markAsCollected = async (paymentId: string) => {
    setProcessing(paymentId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'collected',
          collected_by: user.id,
          collected_at: new Date().toISOString(),
          collection_method: collectionMethod,
          collection_notes: collectionNotes
        })
        .eq('id', paymentId)

      if (error) throw error

      toast.success('Payment marked as collected! Finance will now process it.')
      setCollectionNotes('')
      setCollectionMethod('in_person')
      fetchData()
    } catch (error) {
      console.error('Error marking as collected:', error)
      toast.error('Failed to mark payment as collected')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  // Calculate statistics
  const pendingPayments = payments.filter(p => p.status === 'pending')
  const collectedPayments = payments.filter(p => p.status === 'collected')
  const approvedPayments = payments.filter(p => p.status === 'approved')
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  const currentYear = new Date().getFullYear()
  const currentYearPayments = approvedPayments.filter(p => p.year === currentYear)
  const yearlyRevenue = currentYearPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Treasurer Panel</h1>
          <p className="text-gray-600">Verify and collect payments from members</p>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{currentYear} Revenue</p>
                <p className="text-2xl font-bold text-[#003366]">{formatCurrency(yearlyRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{currentYearPayments.length} payments</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Collection</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting verification</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collected (Pending Finance)</p>
                <p className="text-2xl font-bold text-blue-600">{collectedPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Sent to Finance</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Collection Queue - Main Feature */}
        <div className="card border-2 border-[#BF0A30]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#D62828]">
              📥 Payment Collection Queue ({pendingPayments.length})
            </h2>
            <p className="text-sm text-gray-600">Verify proof and mark as collected</p>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">All caught up!</p>
              <p className="text-gray-500">No payments awaiting collection</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map(payment => (
                <div key={payment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{payment.users?.full_name}</h3>
                      <p className="text-sm text-gray-600">{payment.users?.email}</p>
                      <div className="mt-2 flex items-center space-x-4">
                        <p className="text-lg font-bold text-[#003366]">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payment.month} {payment.year}
                        </p>
                        <p className="text-xs text-gray-500">
                          Method: <span className="capitalize">{payment.payment_method}</span>
                        </p>
                      </div>
                      <p className="text-xs font-mono text-gray-600 mt-1">
                        Ref: {payment.reference_code}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setViewImage(payment.proof_url)}
                      className="btn-outline flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Proof</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Collection Method
                        </label>
                        <select
                          value={collectionMethod}
                          onChange={(e) => setCollectionMethod(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="in_person">In-Person Collection</option>
                          <option value="bank_transfer">Bank Transfer (Verified)</option>
                          <option value="wechat">WeChat Pay (Verified)</option>
                          <option value="alipay">Alipay (Verified)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Collection Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={collectionNotes}
                          onChange={(e) => setCollectionNotes(e.target.value)}
                          placeholder="Add any notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => markAsCollected(payment.id)}
                    disabled={processing === payment.id}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    {processing === payment.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Mark as Collected</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collected Payments - Sent to Finance */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-blue-600">
            ✓ Collected Payments (Sent to Finance: {collectedPayments.length})
          </h2>
          {collectedPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No collected payments pending finance approval</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date Collected</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedPayments.map(payment => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        {formatDate(payment.collected_at || payment.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm">{payment.users?.full_name}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm capitalize">{payment.collection_method || payment.payment_method}</td>
                      <td className="py-3 px-4">
                        <span className="badge-pending">Awaiting Finance</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Approved Payments */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recently Approved by Finance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Period</th>
                </tr>
              </thead>
              <tbody>
                {approvedPayments.slice(0, 10).map(payment => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{formatDate(payment.created_at)}</td>
                    <td className="py-3 px-4 text-sm">{payment.users?.full_name}</td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                    <td className="py-3 px-4 text-sm">{payment.month} {payment.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img 
              src={viewImage} 
              alt="Payment Proof" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
