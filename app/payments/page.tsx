'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Plus, 
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDateTime, getCurrentMonth, getCurrentYear, formatMonthYear } from '@/lib/utils'
import { MONTHS } from '@/lib/types/database'
import { cachedFetch, clientCache } from '@/lib/cache'
import { useRoleSwitch } from '@/lib/hooks/useRoleSwitch'

// Helper function to abbreviate month names
const abbreviateMonth = (month: string): string => {
  const monthMap: { [key: string]: string } = {
    'January': 'Jan',
    'February': 'Feb',
    'March': 'Mar',
    'April': 'Apr',
    'May': 'May',
    'June': 'Jun',
    'July': 'Jul',
    'August': 'Aug',
    'September': 'Sep',
    'October': 'Oct',
    'November': 'Nov',
    'December': 'Dec'
  }
  return monthMap[month] || month
}

export default function PaymentsPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [formData, setFormData] = useState({
    month: getCurrentMonth(),
    year: getCurrentYear().toString(),
    amount: '100.00',
    payment_method: 'wechat',
    proof_url: '',
    user_id: '', // For admin submissions
    months_count: 1, // Number of months to pay for
    reference_code: '' // Reference code from payment screenshot
  })
  const [referenceCode, setReferenceCode] = useState<string>('')
  const [monthlyRate, setMonthlyRate] = useState(100) // Store the monthly rate separately
  const [showPaymentWarning, setShowPaymentWarning] = useState(true) // Control warning visibility
  const [isWarningMinimized, setIsWarningMinimized] = useState(false) // Control minimized state
  const [zoomedQR, setZoomedQR] = useState<string | null>(null) // Track which QR is zoomed

  // Use role switching hook to get effective role
  const { effectiveRole } = useRoleSwitch({ userRole: user?.role })

  // Check if current view should show admin features
  const isAdminView = ['admin', 'secretary', 'finance', 'treasurer'].includes(effectiveRole)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  // Auto-calculate payment amount for members when form opens
  useEffect(() => {
    if (showForm && user && !isAdminView) {
      // For regular members, auto-calculate their own dues
      calculatePaymentAmount(user)
    }
  }, [showForm, user, isAdminView])

  // Function to generate reference code (client-side, no Supabase needed)
  const generateReferenceCode = async () => {
    try {
      console.log('Generating reference code for:', formData.month, formData.year)
      
      // Generate reference code client-side without Supabase
      // Format: BULS-YYYY-MM-XXXX (random 4-digit number for now)
      const year = formData.year
      const month = formData.month
      const monthNum = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
                        .indexOf(month) + 1
      const randomNum = Math.floor(Math.random() * 9000) + 1000 // 4-digit random
      const referenceCode = `BULS-${year}-${String(monthNum).padStart(2, '0')}-${randomNum}`
      
      console.log('Reference code generated (client-side):', referenceCode)
      setReferenceCode(referenceCode)
    } catch (error) {
      console.error('Error generating reference code:', error)
      toast.error('Error generating reference code')
    }
  }

  // Generate reference code when form opens or month/year changes
  useEffect(() => {
    if (showForm && formData.month && formData.year) {
      generateReferenceCode()
    }
  }, [showForm, formData.month, formData.year])

  // Helper function to get payment status by month
  const getPaymentStatus = () => {
    const currentYear = getCurrentYear()
    const currentMonth = getCurrentMonth()
    const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
    
    const currentMonthIndex = allMonths.indexOf(currentMonth)
    
    // Get all approved OR collected payments for current year
    // 'collected' means verified by Treasurer, 'approved' means processed by Finance
    // Both should count as "paid" from member's perspective
    const paidPayments = payments.filter(p => 
      (p.status === 'approved' || p.status === 'collected') && parseInt(p.year) === currentYear
    )
    
    // Create a map of paid months
    const paidMonths = new Set(paidPayments.map(p => p.month))
    
    // Categorize months
    const paidMonthsList: string[] = []
    const owedMonthsList: string[] = []  // Past/current months not paid (overdue)
    const upcomingMonthsList: string[] = []  // Future months only
    
    allMonths.forEach((month, index) => {
      if (paidMonths.has(month)) {
        paidMonthsList.push(month)
      } else if (index <= currentMonthIndex) {
        // Past or current month not paid = OWED (includes current month)
        owedMonthsList.push(month)
      } else {
        // Future months only = UPCOMING
        upcomingMonthsList.push(month)
      }
    })
    
    return {
      paidMonths: paidMonthsList,
      owedMonths: owedMonthsList,
      upcomingMonths: upcomingMonthsList,
      totalPaid: paidMonthsList.length,
      totalOwed: owedMonthsList.length,
      totalUpcoming: upcomingMonthsList.length,
      year: currentYear,
      currentMonth: currentMonth
    }
  }

  const fetchData = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .maybeSingle()

      if (userError || !userData) {
        console.error('❌ User fetch error:', userError)
        throw new Error('Unable to load user data')
      }

      console.log('✅ User fetched:', { id: userData.id, name: userData.full_name, clerk_id: userId })

      // If user is admin/secretary/finance/treasurer, fetch all users
      let usersData: any[] = []
      if (['admin', 'secretary', 'finance', 'treasurer'].includes(userData.role)) {
        const { data: allUsersData, error: usersError } = await supabase
          .from('users')
          .select(`
            id, 
            full_name, 
            email,
            members_profile (
              scholarship_status
            )
          `)
          .order('full_name')
        
        if (!usersError && allUsersData) {
          usersData = allUsersData
        }
      }

      // Fetch payments using API route to bypass RLS issues
      console.log('📞 Calling /api/payments...')
      const paymentsResponse = await fetch('/api/payments')
      console.log('📡 API response status:', paymentsResponse.status)
      
      if (!paymentsResponse.ok) {
        const errorText = await paymentsResponse.text()
        console.error('❌ API error:', errorText)
        throw new Error('Failed to fetch payments from API')
      }
      
      const paymentsResult = await paymentsResponse.json()
      
      console.log('💳 Payments API result:', {
        userId: userData.id,
        count: paymentsResult.payments?.length || 0,
        payments: paymentsResult.payments
      })

      setUser(userData)
      setAllUsers(usersData)
      setPayments(paymentsResult.payments || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load payment data')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Handle months_count changes - recalculate total amount
    if (name === 'months_count') {
      const monthsCount = parseInt(value) || 1
      const totalAmount = (monthlyRate * monthsCount).toFixed(2)
      setFormData(prev => ({
        ...prev,
        months_count: monthsCount,
        amount: totalAmount
      }))
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // If user_id changes, fetch the student's profile and calculate amount
    if (name === 'user_id' && value) {
      const selectedUser = allUsers.find(u => u.id === value)
      if (selectedUser) {
        setSelectedStudent(selectedUser)
        calculatePaymentAmount(selectedUser)
      }
    }
  }

  const calculatePaymentAmount = async (student: any) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Call the database function to calculate due based on scholarship_status AND rank
      const { data, error } = await supabase
        .rpc('calculate_monthly_due', { p_user_id: student.id })
      
      if (error) {
        console.error('Error calculating due:', error)
        const monthlyDue = 100
        setMonthlyRate(monthlyDue)
        setFormData(prev => ({
          ...prev,
          amount: (monthlyDue * (prev.months_count || 1)).toString()
        }))
        return
      }
      
      const monthlyDue = parseFloat(data) || 100
      setMonthlyRate(monthlyDue)
      const totalAmount = monthlyDue * (formData.months_count || 1)
      
      setFormData(prev => ({
        ...prev,
        amount: totalAmount.toFixed(2)
      }))
      
      toast.success(
        `Monthly rate: ¥${monthlyDue} × ${formData.months_count || 1} month(s) = ¥${totalAmount.toFixed(2)}`,
        { duration: 4000 }
      )
    } catch (error) {
      console.error('Error:', error)
      const monthlyDue = 100
      setMonthlyRate(monthlyDue)
      setFormData(prev => ({
        ...prev,
        amount: (monthlyDue * (prev.months_count || 1)).toString()
      }))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setSubmitting(true)
    toast.loading('Processing payment proof...')

    try {
      // Convert image to base64 instead of uploading to storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData(prev => ({ ...prev, proof_url: base64String }))
        toast.dismiss()
        toast.success('Payment proof uploaded successfully')
        setSubmitting(false)
      }
      reader.onerror = () => {
        toast.dismiss()
        toast.error('Failed to process payment proof')
        setSubmitting(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || 'Failed to process payment proof')
      setSubmitting(false)
    }
  }

  const handleMonthClick = (month: string) => {
    // Open payment form with the clicked month pre-selected
    setFormData(prev => ({
      ...prev,
      month: month,
      year: getCurrentYear().toString()
    }))
    setShowForm(true)
    
    // Note: The useEffect will handle auto-calculation when showForm changes
    // So we don't need to call calculatePaymentAmount here
    
    // Scroll to form smoothly
    setTimeout(() => {
      const formElement = document.querySelector('form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
    toast.success(`Payment form opened for ${month} ${getCurrentYear()}`, { duration: 2000 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Temporarily disable status check for debugging
    // if (user?.status !== 'active') {
    //   toast.error('Only active members can submit payments')
    //   return
    // }

    if (!formData.proof_url) {
      toast.error('Please upload payment proof')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check if it's a connection error
        if (errorData.error?.includes('fetch failed') || errorData.error?.includes('ECONNRESET')) {
          toast.error('Database connection error. Please check your internet connection and try again.')
          console.error('Supabase connection error:', errorData)
          return
        }
        
        throw new Error(errorData.error || 'Failed to submit payment')
      }

      const data = await response.json()
      
      toast.success(
        `Payment submitted successfully! Reference Code: ${referenceCode}`,
        { duration: 5000 }
      )

      // Invalidate cache to force fresh data
      clientCache.invalidate(`payments-data-${userId}`)

      // Reset form
      setFormData({
        month: getCurrentMonth(),
        year: getCurrentYear().toString(),
        amount: '100.00',
        payment_method: 'wechat',
        proof_url: '',
        user_id: '',
        months_count: 1,
        reference_code: ''
      })
      setMonthlyRate(100)
      setReferenceCode('') // Reset reference code
      setShowForm(false)
      
      // Fetch fresh data
      await fetchData()

    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
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

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600">Manage your monthly dues</p>
            {/* Debug info - remove after testing */}
            <p className="text-xs text-gray-400 mt-1">
              View Mode: {isAdminView ? 'Admin' : 'Member'} | Payments: {payments.length} | Role: {user?.role}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                clientCache.invalidate(`payments-data-${userId}`)
                fetchData()
                toast.success('Refreshed payment data')
              }}
              className="btn-outline flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Payment</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Status Summary - Beautiful Professional Design with Brand Colors */}
        {(() => {
          const status = getPaymentStatus()
          return (
            <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              {/* Header with Brand Blue #00205B */}
              <div className="px-6 py-4" style={{ background: 'linear-gradient(to right, #00205B, #003875)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                      💰 Payment Status {status.year}
                    </h2>
                    <p className="text-sm text-blue-200 mt-1">Current Month: {status.currentMonth}</p>
                  </div>
                  <div className="flex items-center space-x-6 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{status.totalPaid}</p>
                      <p className="text-xs text-blue-100 uppercase tracking-wide">Paid</p>
                    </div>
                    <div className="h-8 w-px bg-white/30"></div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-200">{status.totalOwed}</p>
                      <p className="text-xs text-blue-100 uppercase tracking-wide">Owed</p>
                    </div>
                    <div className="h-8 w-px bg-white/30"></div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-200">{status.totalUpcoming}</p>
                      <p className="text-xs text-blue-100 uppercase tracking-wide">Upcoming</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Paid Months - GREEN */}
                {status.paidMonths.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full mr-2">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        ✓ Months Paid ({status.paidMonths.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {status.paidMonths.map(month => {
                        const isCurrentMonth = month === status.currentMonth
                        return (
                          <span 
                            key={month}
                            className={`group relative inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 ${
                              isCurrentMonth ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {abbreviateMonth(month)}
                            {isCurrentMonth && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-gray-900 text-xs rounded-full font-bold">
                                NOW
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Owed Months - RED (Past/Current months not paid) - CLICKABLE */}
                {status.owedMonths.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full mr-2">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        ✗ Months Owed - Overdue ({status.owedMonths.length})
                      </p>
                      <p className="text-xs text-gray-500 ml-3 italic">👆 Click to pay</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {status.owedMonths.map(month => {
                        const isCurrentMonth = month === status.currentMonth
                        return (
                          <button
                            key={month}
                            onClick={() => handleMonthClick(month)}
                            className={`group relative inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer active:scale-95 ${
                              isCurrentMonth 
                                ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 ring-4 ring-yellow-400 ring-opacity-50' 
                                : 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                            }`}
                            title={`Click to pay for ${month}${isCurrentMonth ? ' (CURRENT MONTH)' : ''}`}
                          >
                            <XCircle className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                            {abbreviateMonth(month)}
                            {isCurrentMonth && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-gray-900 text-xs rounded-full font-bold">
                                NOW
                              </span>
                            )}
                            <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              💰
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-red-600 mt-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      Click any overdue month to start payment
                    </p>
                  </div>
                )}

                {/* Upcoming Months - BRAND BLUE (Future months only) */}
                {status.upcomingMonths.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full mr-2" style={{ backgroundColor: '#00205B' }}>
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        🕐 Upcoming Months - Not Yet Due ({status.upcomingMonths.length})
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {status.upcomingMonths.map(month => (
                        <span 
                          key={month}
                          className="group relative inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                          style={{ background: 'linear-gradient(to bottom right, #00205B, #003875)' }}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {abbreviateMonth(month)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No payments yet - All months owed */}
                {status.paidMonths.length === 0 && status.owedMonths.length > 0 && status.upcomingMonths.length === 0 && (
                  <div className="text-center py-8 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                    <XCircle className="w-16 h-16 mx-auto text-red-500 mb-3" />
                    <p className="text-lg font-bold text-red-900">All months for {status.year} are overdue!</p>
                    <p className="text-sm text-red-700 mt-2">Please make a payment as soon as possible</p>
                  </div>
                )}

                {/* Progress Bar with Brand Blue */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" style={{ color: '#00205B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Annual Progress
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#00205B' }}>
                      {Math.round((status.totalPaid / 12) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
                    <div 
                      className="h-4 rounded-full transition-all duration-500 shadow-sm"
                      style={{ 
                        width: `${(status.totalPaid / 12) * 100}%`,
                        background: status.totalPaid > 0 ? 'linear-gradient(to right, #10b981, #059669)' : 'transparent'
                      }}
                    >
                      {status.totalPaid > 0 && (
                        <div className="h-full flex items-center justify-end pr-2">
                          <span className="text-xs font-bold text-white drop-shadow">
                            {status.totalPaid}/12
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Status Warning */}
        {user?.status === 'pending' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-800">
              Your account is pending approval. You cannot submit payments until activated.
            </p>
          </div>
        )}

        {/* Payment Form */}
        {showForm && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Submit Payment</h2>
              <button 
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Member Info Display - COMPACT MINIMAL STYLE */}
              {!isAdminView && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {/* Monthly Rate */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly Rate</p>
                      <p className="text-2xl font-bold text-blue-600">¥{monthlyRate}</p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                    
                    {/* Total Payment */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Payment</p>
                      <p className="text-2xl font-bold text-green-600">¥{formData.amount}</p>
                      <p className="text-xs text-gray-600">{formData.months_count} month{formData.months_count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {/* Compact Calculation */}
                  <div className="text-center pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-700 mb-1">
                      <span className="font-mono">¥{monthlyRate}</span>
                      <span className="text-gray-400">×</span>
                      <span className="font-semibold">{formData.months_count} month{formData.months_count > 1 ? 's' : ''}</span>
                      <span className="text-gray-400">=</span>
                      <span className="font-bold text-green-600">¥{formData.amount}</span>
                    </div>
                    <p className="text-xs text-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Auto-calculated based on your scholarship status and rank
                    </p>
                  </div>
                </div>
              )}

              {/* Student selector for admins ONLY */}
              {isAdminView && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student *
                  </label>
                  <input
                    type="text"
                    placeholder="Search student by name or email..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] mb-2"
                  />
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                  >
                    <option value="">-- Select Student --</option>
                    {allUsers
                      .filter(u => 
                        u.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
                      )
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.email}) - {u.members_profile?.scholarship_status || 'No scholarship'}
                        </option>
                      ))}
                  </select>
                  {selectedStudent && (
                    <div className="mt-3 bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-900">📊 Auto-Calculated Dues</p>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Scholarship Status:</span>
                          <span className="text-sm font-semibold text-gray-900">{selectedStudent.members_profile?.scholarship_status || 'None'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Monthly Rate:</span>
                          <span className="text-2xl font-bold text-blue-600">¥{monthlyRate}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Total Payment:</span>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-green-600">¥{formData.amount}</span>
                            <p className="text-xs text-gray-500 mt-1">({formData.months_count} month{formData.months_count > 1 ? 's' : ''})</p>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-blue-600 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            Based on scholarship type AND union rank
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Amount is auto-calculated from the dues matrix. Admin can adjust at /admin/dues
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Reference Code & QR Codes */}
                <div className="lg:col-span-1 space-y-3">
                  {/* Reference Code Display */}
                  {referenceCode && (
                    <div className="rounded-xl p-4">
                      <p className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Your Reference Code</p>
                      <div className="bg-white rounded-lg p-3 mb-2">
                        <p className="text-2xl font-mono font-bold text-center text-gray-900 tracking-wider select-all">
                          {referenceCode}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(referenceCode)
                          toast.success('Reference code copied to clipboard!')
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Code</span>
                      </button>
                      <p className="text-xs text-gray-600 mt-2 text-center">Include this in your payment note</p>
                    </div>
                  )}

                  <p className="text-sm font-bold text-gray-900 mb-2">Scan to Pay</p>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div
                      className="w-24 h-24 mx-auto rounded flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setZoomedQR('wechat')}
                    >
                      <svg className="w-20 h-20 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">WeChat</p>
                    <p className="text-xs text-gray-500">Tap to zoom</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div
                      className="w-24 h-24 mx-auto rounded flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setZoomedQR('alipay')}
                    >
                      <svg className="w-20 h-20 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">Alipay</p>
                    <p className="text-xs text-gray-500">Tap to zoom</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-700 text-center">
                      <span className="font-bold">Scan → Pay → Upload</span>
                    </p>
                  </div>
                </div>

                {/* Right: Form Fields */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting Month *
                  </label>
                  <select
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                  >
                    {MONTHS.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">First month of payment period</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="2020"
                    max="2030"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Months *
                  </label>
                  <select
                    name="months_count"
                    value={formData.months_count}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                  >
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months (Quarter)</option>
                    <option value="4">4 Months</option>
                    <option value="5">5 Months</option>
                    <option value="6">6 Months (Semester)</option>
                    <option value="7">7 Months</option>
                    <option value="8">8 Months</option>
                    <option value="9">9 Months</option>
                    <option value="10">10 Months</option>
                    <option value="11">11 Months</option>
                    <option value="12">12 Months (Full Year)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Total: ¥{monthlyRate} × {formData.months_count} = ¥{formData.amount}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (¥) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                    readOnly={!isAdminView}
                    title={!isAdminView ? "Amount is auto-calculated based on your scholarship status" : ""}
                  />
                  {!isAdminView && (
                    <p className="text-xs text-gray-500 mt-1">✓ Auto-calculated based on your scholarship status</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                    required
                  >
                    <option value="wechat">WeChat Pay</option>
                    <option value="alipay">Alipay</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof (Screenshot) *
                </label>
                <div className="rounded-lg p-6 text-center">
                  {formData.proof_url ? (
                    <div>
                      <div className="flex items-start gap-4">
                        {/* Show uploaded screenshot */}
                        <div className="flex-1">
                          <img
                            src={formData.proof_url}
                            alt="Payment proof"
                            className="max-w-full max-h-64 rounded-lg border border-gray-200"
                          />
                        </div>
                        
                        {/* Reference code input next to image */}
                        <div className="flex-shrink-0 border border-gray-300 rounded-lg p-4">
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Reference Code
                          </label>
                          <input
                            type="text"
                            name="reference_code"
                            value={formData.reference_code}
                            onChange={handleChange}
                            placeholder="BULS-2025-01-0001"
                            className="w-56 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D62828]"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-2">Enter code from screenshot</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, proof_url: '', reference_code: '' }))}
                          className="text-sm text-[#D62828] hover:underline"
                        >
                          Change image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-1">Click to upload payment screenshot</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {showPaymentWarning && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">IMPORTANT - Payment Process</h3>
                        <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Please read carefully before proceeding</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsWarningMinimized(!isWarningMinimized)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title={isWarningMinimized ? "Expand" : "Minimize"}
                      >
                        {isWarningMinimized ? (
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setShowPaymentWarning(false)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Close"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {!isWarningMinimized && (
                    <div className="p-6 space-y-4">
                  {/* Step 1 */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start p-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mr-4">
                        1
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Submit This Form
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          After clicking <span className="font-semibold text-gray-900">"Submit Payment"</span> below, you will receive a unique <span className="font-semibold text-blue-600">Reference Code</span> in this application.
                        </p>
                        <div className="mt-2 inline-block bg-blue-50 border border-blue-200 rounded-md px-3 py-1">
                          <p className="text-xs text-blue-700 font-mono">Example: BULS-2026-01-0001</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start p-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold mr-4">
                        2
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Make the Actual Payment
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          Open your <span className="font-semibold text-gray-900">WeChat Pay</span>, <span className="font-semibold text-gray-900">Alipay</span>, or <span className="font-semibold text-gray-900">Bank App</span> and transfer the money to the union account.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start p-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold mr-4">
                        3
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Add Reference Code to Payment
                        </h4>
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">Include the reference code in the appropriate field:</p>
                        <div className="space-y-2 ml-1">
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-bold text-gray-600 mr-2 flex-shrink-0 mt-0.5">•</span>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">WeChat Pay:</span> Add in <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"Add Note"</span> or <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"留言"</span> field
                            </p>
                          </div>
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-bold text-gray-600 mr-2 flex-shrink-0 mt-0.5">•</span>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">Alipay:</span> Add in <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"Remark"</span> or <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"备注"</span> field
                            </p>
                          </div>
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-bold text-gray-600 mr-2 flex-shrink-0 mt-0.5">•</span>
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">Bank Transfer:</span> Add in <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"Payment Purpose"</span> or <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">"附言"</span> field
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Critical Warning */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-red-900 mb-1 text-sm uppercase tracking-wide">Critical Warning</h4>
                        <p className="text-sm text-red-800 font-semibold leading-relaxed">
                          Payments <span className="underline decoration-2">WITHOUT</span> the correct reference code will be <span className="underline decoration-2">REJECTED</span> or delayed for verification!
                        </p>
                        <p className="text-xs text-red-700 mt-2 leading-relaxed">
                          The reference code helps us match your payment to your submission record.
                        </p>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                </div>
              )}

              {!showPaymentWarning && (
                <button
                  onClick={() => {
                    setShowPaymentWarning(true)
                    setIsWarningMinimized(false)
                  }}
                  className="w-full bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Show Payment Instructions</span>
                </button>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Payment'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payments List */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Payment History</h2>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Month</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Reference Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatMonthYear(payment.month, payment.year)}</td>
                      <td className="py-3 px-4 font-medium">
                        <span className={
                          payment.payment_method === 'wechat' 
                            ? 'text-green-600 font-bold' 
                            : payment.payment_method === 'alipay' 
                            ? 'text-blue-600 font-bold' 
                            : 'text-gray-900 font-bold'
                        }>
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{payment.reference_code}</td>
                      <td className="py-3 px-4 capitalize">{payment.payment_method}</td>
                      <td className="py-3 px-4">
                        <span className={`badge-${payment.status} flex items-center space-x-1 w-fit`}>
                          {payment.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {payment.status === 'pending' && <Clock className="w-3 h-3" />}
                          {payment.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          <span>{payment.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDateTime(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* QR Code Zoom Modal */}
        {zoomedQR && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" onClick={() => setZoomedQR(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {zoomedQR === 'wechat' ? 'WeChat Pay' : 'Alipay'} QR Code
                </h3>
                <button
                  onClick={() => setZoomedQR(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center mb-4">
                <svg className="w-64 h-64 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <button
                onClick={() => {
                  // Download functionality - will work when actual QR images are added
                  toast('Download feature - Add actual QR images first')
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download QR Code</span>
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Tap outside or close button to dismiss
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
