'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, Loader2, CheckCircle, Clock, XCircle, Upload, FileText, X, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cachedFetch, clientCache } from '@/lib/cache'

export default function LoansPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawingLoan, setWithdrawingLoan] = useState<any>(null)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingLoan, setEditingLoan] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingLoan, setDeletingLoan] = useState<any>(null)
  const [viewProofImage, setViewProofImage] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [selectedLoanHistory, setSelectedLoanHistory] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [paymentQRCodes, setPaymentQRCodes] = useState<any>({ wechat: null, alipay: null })
  const [loadingQRCodes, setLoadingQRCodes] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    expected_repayment_date: '',
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_relationship: '',
    university: ''
  })
  const [applicationFile, setApplicationFile] = useState<File | null>(null)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    try {
      if (!userId) {
        setLoading(false)
        return
      }
      
      // Clear cache on fetch to ensure fresh data
      clientCache.invalidate(`loans-${userId}`)
      
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Fetch user from Supabase
      console.log('🔍 Fetching user with clerk_id:', userId)
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()
      
      if (userError || !userData) {
        console.error('❌ User fetch error:', userError)
        throw new Error('Failed to load user data')
      }
      
      console.log('✅ User found:', { id: userData.id, clerk_id: userData.clerk_id, name: userData.full_name })
      
      // Fetch loans via API - server handles filtering by user role
      console.log('🔍 Fetching loans via API')
      
      const loansResponse = await fetch('/api/loans')
      if (!loansResponse.ok) {
        console.error('❌ Failed to fetch loans from API:', await loansResponse.text())
        throw new Error('Failed to load loans')
      }
      
      const loansResult = await loansResponse.json()
      const loansData = loansResult.loans || []
      
      console.log('📊 Loans fetched via API:', loansData?.length || 0, 'loans')
      console.log('📊 User ID:', userData.id)
      console.log('📊 User Role:', userData.role)
      if (loansData && loansData.length > 0) {
        console.log('📊 First loan user_id:', loansData[0].user_id)
        console.log('📊 First loan:', loansData[0])
      }
      
      setUser(userData)
      setLoans(loansData)
      console.log('💰 Member loans loaded:', loansData)
      console.log('💰 Total loans:', loansData?.length || 0)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load loan data')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Validate file type (PDF, DOC, DOCX, JPG, PNG)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF, Word document, or image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      setApplicationFile(file)
    }
  }

  const handleWithdraw = (loan: any) => {
    setWithdrawingLoan(loan)
    setShowWithdrawModal(true)
  }

  const confirmWithdraw = async () => {
    if (!withdrawingLoan) return

    try {
      const response = await fetch(`/api/loans/${withdrawingLoan.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success('Loan application withdrawn successfully')
      setShowWithdrawModal(false)
      setWithdrawingLoan(null)
      setWithdrawReason('')
      
      // Refresh loans
      clientCache.invalidate(`loans-${userId}`)
      await fetchData()

    } catch (error: any) {
      toast.error(error.message || 'Failed to withdraw loan')
    }
  }

  // Open payment modal
  const openPaymentModal = async (loan: any) => {
    setSelectedLoanForPayment(loan)
    setPaymentAmount('')
    setPaymentMethod('bank_transfer')
    setPaymentProof(null)
    setPaymentProofUrl(null)
    setPaymentNotes('')
    setShowPaymentModal(true)
    
    // Fetch payment QR codes
    await fetchPaymentQRCodes()
  }

  // Fetch payment QR codes - Same as guest payment system
  const fetchPaymentQRCodes = async () => {
    setLoadingQRCodes(true)
    try {
      const response = await fetch('/api/qr-codes')
      if (response.ok) {
        const data = await response.json()
        console.log('📱 Fetched QR codes:', data)
        
        // Simple approach: Get first available WeChat and Alipay QR codes
        // Same logic as guest payment system
        const qrCodes = {
          wechat: data.qrCodes?.find((qr: any) => qr.payment_method === 'wechat'),
          alipay: data.qrCodes?.find((qr: any) => qr.payment_method === 'alipay'),
          // Fallback: if no specific payment method, use first available
          default: data.qrCodes?.[0]
        }
        setPaymentQRCodes(qrCodes)
        console.log('📱 Payment QR codes loaded:', qrCodes)
      } else {
        console.error('Failed to fetch QR codes:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error)
    } finally {
      setLoadingQRCodes(false)
    }
  }

  // Handle payment proof upload
  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setPaymentProof(file)
    setUploadingProof(true)

    try {
      // Convert image to base64 and save directly (no storage bucket needed)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPaymentProofUrl(base64String)
        toast.success('Payment proof uploaded successfully')
        setUploadingProof(false)
      }
      reader.onerror = () => {
        toast.error('Failed to upload payment proof')
        setPaymentProof(null)
        setUploadingProof(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      toast.error('Failed to upload payment proof')
      setPaymentProof(null)
      setUploadingProof(false)
    }
  }

  // Submit payment
  const submitPayment = async () => {
    if (!selectedLoanForPayment) return

    // Validate amount
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > selectedLoanForPayment.remaining_balance) {
      toast.error(`Payment amount cannot exceed remaining balance of ¥${selectedLoanForPayment.remaining_balance.toFixed(2)}`)
      return
    }

    // Proof is recommended but not required
    if (!paymentProofUrl) {
      const confirmed = confirm('No payment proof uploaded. Continue without proof?')
      if (!confirmed) return
    }

    setSubmittingPayment(true)

    try {
      const payloadData = {
        amount,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl,
        notes: paymentNotes,
        payment_type: 'member',  // Changed from 'member_payment' to match treasurer filter
        user_id: user?.id,
        recorded_by: user?.id  // Member recording their own payment
      }
      
      console.log('💳 Submitting payment:', {
        ...payloadData,
        payment_proof_url_length: paymentProofUrl?.length || 0,
        has_proof: !!paymentProofUrl
      })

      const response = await fetch(`/api/loans/${selectedLoanForPayment.id}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Payment API error:', error)
        throw new Error(error.error || 'Failed to record payment')
      }

      const result = await response.json()
      
      toast.success('Payment recorded successfully!')
      setShowPaymentModal(false)
      
      // Refresh loans
      clientCache.invalidate(`loans-${userId}`)
      await fetchData()

      // Show completion message if fully repaid
      if (result.updatedLoan?.repayment_status === 'completed') {
        setTimeout(() => {
          toast.success('🎉 Congratulations! Your loan is fully repaid!', { duration: 5000 })
        }, 500)
      }
    } catch (error: any) {
      console.error('Error submitting payment:', error)
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setSubmittingPayment(false)
    }
  }

  // View payment history
  const viewPaymentHistory = async (loan: any) => {
    setSelectedLoanHistory(loan)
    setLoadingHistory(true)
    setShowPaymentHistory(true)

    try {
      const response = await fetch(`/api/loans/${loan.id}/repayments`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history')
      }

      const result = await response.json()
      setPaymentHistory(result.repayments || [])
    } catch (error: any) {
      console.error('Error fetching payment history:', error)
      toast.error('Failed to load payment history')
      setPaymentHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Pagination logic
  const itemsPerPage = user?.role === 'member' ? 3 : 6
  const totalPages = Math.ceil(loans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLoans = loans.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRecheck = (loan: any) => {
    setEditingLoan(loan)
    setFormData({
      amount: loan.amount.toString(),
      reason: loan.reason,
      expected_repayment_date: loan.expected_repayment_date,
      guarantor_name: loan.guarantor_name || '',
      guarantor_phone: loan.guarantor_phone || '',
      guarantor_relationship: loan.guarantor_relationship || '',
      university: loan.university || ''
    })
    setShowForm(true)
  }

  const handleDelete = (loan: any) => {
    setDeletingLoan(loan)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingLoan) return

    try {
      const response = await fetch(`/api/loans/${deletingLoan.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success('Loan application deleted successfully')
      setShowDeleteModal(false)
      setDeletingLoan(null)
      
      // Refresh loans
      clientCache.invalidate(`loans-${userId}`)
      await fetchData()

    } catch (error: any) {
      toast.error(error.message || 'Failed to delete loan')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (user?.status !== 'active') {
      toast.error('Only active members can request loans')
      return
    }

    if (!formData.amount || !formData.reason || !formData.expected_repayment_date || 
        !formData.guarantor_name || !formData.guarantor_phone || !formData.guarantor_relationship ||
        !formData.university) {
      toast.error('Please fill in all required fields')
      return
    }

    // For new applications, require document
    if (!editingLoan && !applicationFile) {
      toast.error('Please upload your written loan application')
      return
    }

    setSubmitting(true)

    try {
      let documentUrl = editingLoan?.application_document_url
      let fileName = editingLoan?.application_document_name

      // Upload new document if provided
      if (applicationFile) {
        const fileFormData = new FormData()
        fileFormData.append('file', applicationFile)

        const uploadResponse = await fetch('/api/upload-loan-document', {
          method: 'POST',
          body: fileFormData
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          throw new Error(error.error || 'Failed to upload document')
        }

        const uploadResult = await uploadResponse.json()
        documentUrl = uploadResult.url
        fileName = uploadResult.fileName
      }

      // Determine if creating or updating
      const url = editingLoan ? `/api/loans/${editingLoan.id}` : '/api/loans'
      const method = editingLoan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          application_document_url: documentUrl,
          application_document_name: fileName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success(editingLoan ? 'Loan application updated successfully!' : 'Loan request submitted successfully!')
      setFormData({ 
        amount: '', 
        reason: '', 
        expected_repayment_date: '',
        guarantor_name: '',
        guarantor_phone: '',
        guarantor_relationship: '',
        university: ''
      })
      setApplicationFile(null)
      setEditingLoan(null)
      setShowForm(false)
      
      // Clear cache and force fresh data fetch
      clientCache.invalidate(`loans-${userId}`)
      await fetchData()

    } catch (error: any) {
      toast.error(error.message || 'Failed to submit loan request')
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
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#00205B] to-[#003d82] rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Loan Management</h1>
              <p className="text-blue-100 text-lg">Request and track your loans</p>
            </div>
            {user?.status === 'active' && !showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="bg-white text-[#00205B] px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>New Loan Request</span>
              </button>
            )}
          </div>
        </div>

        {user?.status === 'pending' && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-amber-600 mr-3" />
              <div>
                <p className="text-amber-900 font-semibold">Account Pending Approval</p>
                <p className="text-amber-800 text-sm">You cannot request loans until your account is activated by an administrator.</p>
              </div>
            </div>
          </div>
        )}

        {/* Loan Request Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingLoan ? 'Recheck Loan Application' : 'New Loan Request'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {editingLoan ? 'Review and update your loan application details' : 'Complete the form below to submit your loan application'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowForm(false)
                    setEditingLoan(null)
                    setFormData({
                      amount: '',
                      reason: '',
                      expected_repayment_date: '',
                      guarantor_name: '',
                      guarantor_phone: '',
                      guarantor_relationship: ''
                    })
                    setApplicationFile(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-7 h-7" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* University, Amount, and Repayment Date in one row - 3 columns */}
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      University *
                    </label>
                    <input
                      type="text"
                      name="university"
                      list="universities-list"
                      value={formData.university || ''}
                      onChange={handleChange}
                      placeholder="Select or type your university"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                      required
                    />
                    <datalist id="universities-list">
                      {/* 985 & 211 Project Universities */}
                      <option value="Peking University (北京大学)" />
                      <option value="Tsinghua University (清华大学)" />
                      <option value="Renmin University of China (中国人民大学)" />
                      <option value="Beijing Normal University (北京师范大学)" />
                      <option value="Beijing Institute of Technology (北京理工大学)" />
                      <option value="Beihang University / BUAA (北京航空航天大学)" />
                      <option value="China Agricultural University (中国农业大学)" />
                      <option value="Beijing Jiaotong University (北京交通大学)" />
                      <option value="University of Science and Technology Beijing (北京科技大学)" />
                      <option value="Beijing Foreign Studies University (北京外国语大学)" />
                      <option value="Beijing University of Posts and Telecommunications (北京邮电大学)" />
                      <option value="Beijing Forestry University (北京林业大学)" />
                      <option value="Beijing University of Chinese Medicine (北京中医药大学)" />
                      <option value="Beijing Language and Culture University (北京语言大学)" />
                      <option value="Central University of Finance and Economics (中央财经大学)" />
                      <option value="University of International Business and Economics (对外经济贸易大学)" />
                      <option value="Beijing Sport University (北京体育大学)" />
                      <option value="Central Academy of Fine Arts (中央美术学院)" />
                      <option value="Central Conservatory of Music (中央音乐学院)" />
                      <option value="Communication University of China (中国传媒大学)" />
                      <option value="China University of Political Science and Law (中国政法大学)" />
                      <option value="Central Academy of Drama (中央戏剧学院)" />
                      <option value="Beijing University of Chemical Technology (北京化工大学)" />
                      <option value="China University of Mining and Technology Beijing (中国矿业大学北京)" />
                      <option value="China University of Petroleum Beijing (中国石油大学北京)" />
                      <option value="China University of Geosciences Beijing (中国地质大学北京)" />
                      <option value="North China Electric Power University (华北电力大学)" />
                      
                      {/* Capital & Municipal Universities */}
                      <option value="Capital Normal University (首都师范大学)" />
                      <option value="Capital University of Economics and Business (首都经济贸易大学)" />
                      <option value="Capital Medical University (首都医科大学)" />
                      <option value="Capital University of Physical Education and Sports (首都体育学院)" />
                      
                      {/* Beijing Municipal Universities */}
                      <option value="Beijing Union University (北京联合大学)" />
                      <option value="Beijing Technology and Business University (北京工商大学)" />
                      <option value="Beijing Information Science and Technology University (北京信息科技大学)" />
                      <option value="Beijing University of Civil Engineering and Architecture (北京建筑大学)" />
                      <option value="Beijing International Studies University (北京第二外国语学院)" />
                      <option value="North China University of Technology (北方工业大学)" />
                      <option value="Beijing Institute of Fashion Technology (北京服装学院)" />
                      <option value="Beijing Film Academy (北京电影学院)" />
                      <option value="Beijing Dance Academy (北京舞蹈学院)" />
                      <option value="Beijing Wuzi University (北京物资学院)" />
                      <option value="Beijing Institute of Graphic Communication (北京印刷学院)" />
                      <option value="Beijing Institute of Petrochemical Technology (北京石油化工学院)" />
                      <option value="Beijing Agriculture College (北京农学院)" />
                      <option value="Beijing University of Agriculture (北京农业大学)" />
                      <option value="China Opera Academy (中国戏曲学院)" />
                      <option value="China Conservatory of Music (中国音乐学院)" />
                      
                      {/* Special & National Universities */}
                      <option value="Chinese Academy of Social Sciences (中国社会科学院大学)" />
                      <option value="University of Chinese Academy of Sciences (中国科学院大学)" />
                      <option value="China Women's University (中华女子学院)" />
                      <option value="China Youth University for Political Sciences (中国青年政治学院)" />
                      <option value="International Relations University (国际关系学院)" />
                      <option value="Diplomatic Academy of China (外交学院)" />
                      <option value="Chinese People's Public Security University (中国人民公安大学)" />
                      <option value="China Criminal Police University Beijing Campus (中国刑事警察学院北京校区)" />
                      <option value="Beijing Electronic Science and Technology Institute (北京电子科技学院)" />
                      
                      {/* Arts & Media Universities */}
                      <option value="Beijing Film Academy (北京电影学院)" />
                      <option value="Central Academy of Fine Arts (中央美术学院)" />
                      <option value="Central Academy of Drama (中央戏剧学院)" />
                      <option value="Central Conservatory of Music (中央音乐学院)" />
                      <option value="China Conservatory of Music (中国音乐学院)" />
                      <option value="Beijing Dance Academy (北京舞蹈学院)" />
                      <option value="Communication University of China (中国传媒大学)" />
                      <option value="China Opera Academy (中国戏曲学院)" />
                      
                      {/* Military & Police Academies */}
                      <option value="National Defense University (国防大学)" />
                      <option value="PLA Academy of Military Science (军事科学院)" />
                      <option value="PLA Strategic Support Force Information Engineering University (战略支援部队信息工程大学)" />
                      <option value="Armed Police Force Academy (武警指挥学院)" />
                      <option value="Chinese People's Armed Police Force Engineering University (武警工程大学)" />
                      
                      {/* Private Universities */}
                      <option value="Beijing City University (北京城市学院)" />
                      <option value="Beijing Geely University (北京吉利学院)" />
                      <option value="Beijing Institute of Graphic Arts (北京吉利学院)" />
                      <option value="Beijing Hengqi University (北京恒企教育)" />
                      
                      {/* Higher Vocational & Technical Colleges */}
                      <option value="Beijing Polytechnic (北京工业职业技术学院)" />
                      <option value="Beijing Information Technology College (北京信息职业技术学院)" />
                      <option value="Beijing Institute of Economics and Management (北京经济管理职业学院)" />
                      <option value="Beijing College of Finance and Commerce (北京财贸职业学院)" />
                      <option value="Beijing Vocational College of Agriculture (北京农业职业学院)" />
                      <option value="Beijing Vocational College of Electronic Technology (北京电子科技职业学院)" />
                      <option value="Beijing Electric Power College (北京电力高等专科学校)" />
                      <option value="Beijing Vocational College of Politics and Law (北京政法职业学院)" />
                      <option value="Beijing College of Social Administration (北京社会管理职业学院)" />
                      <option value="Beijing Vocational College of Science and Technology (北京科技职业学院)" />
                      <option value="Beijing Vocational College of Labor and Social Security (北京劳动保障职业学院)" />
                      <option value="Beijing Industrial Technician College (北京市工业技师学院)" />
                      <option value="Beijing Open University (北京开放大学)" />
                      <option value="Beijing Youth Politics College (北京青年政治学院)" />
                      <option value="Beijing Institute of Technology Zhuhai (北京理工大学珠海学院)" />
                      
                      {/* Adult Education & Distance Learning */}
                      <option value="Beijing Radio and TV University (北京广播电视大学)" />
                      <option value="Communication University of China Nanguang College (中国传媒大学南广学院)" />
                      
                      {/* International Programs & Joint Ventures */}
                      <option value="University of International Relations (国际关系学院)" />
                      <option value="Beijing Normal University - Hong Kong Baptist University United International College (北师港浸大)" />
                      
                      {/* Research Institutes with Degree Programs */}
                      <option value="Graduate School of Chinese Academy of Sciences (中国科学院研究生院)" />
                      <option value="Graduate University of Chinese Academy of Social Sciences (中国社科院研究生院)" />
                      
                      {/* Other Beijing Universities */}
                      <option value="Beijing Institute of Machinery (北京机械工业学院)" />
                      <option value="Beijing Institute of Clothing Technology (北京服装学院)" />
                      <option value="Beijing Materials College (北京物资学院)" />
                      <option value="Beijing Union Medical College (北京协和医学院)" />
                      <option value="Peking Union Medical College (中国协和医科大学)" />
                      <option value="Capital Institute of Pediatrics (首都儿科研究所)" />
                      <option value="Beijing Tiantan Hospital (北京天坛医院)" />
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">Select from list or type your own</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Loan Amount (¥) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">¥</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount || ''}
                        onChange={handleChange}
                        step="0.01"
                        min="1"
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent text-lg font-semibold"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Amount to borrow</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Repayment Date *
                    </label>
                    <input
                      type="date"
                      name="expected_repayment_date"
                      value={formData.expected_repayment_date || ''}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Repayment date</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Purpose of Loan *
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Please provide a detailed explanation of why you need this loan and how you plan to use the funds..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Be specific about the purpose and repayment plan</p>
                </div>

                {/* Guarantor Information */}
                <div className="md:col-span-2 border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Guarantor Information</h3>
                  <p className="text-sm text-gray-600 mb-4">A guarantor is required to stand as surety for your loan</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Guarantor Full Name *
                  </label>
                  <input
                    type="text"
                    name="guarantor_name"
                    value={formData.guarantor_name || ''}
                    onChange={handleChange}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Guarantor Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="guarantor_phone"
                    value={formData.guarantor_phone || ''}
                    onChange={handleChange}
                    placeholder="e.g., +1234567890"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Relationship to Guarantor *
                  </label>
                  <input
                    type="text"
                    name="guarantor_relationship"
                    value={formData.guarantor_relationship || ''}
                    onChange={handleChange}
                    placeholder="e.g., Family member, Friend, Colleague"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Describe your relationship with the guarantor</p>
                </div>

                {/* Application Document Upload */}
                <div className="md:col-span-2 border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Written Application Document</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {editingLoan ? 'Current document or upload a new one (optional)' : 'Upload your formal written loan application (PDF, Word, or Image)'}
                  </p>
                  
                  {/* Show existing document if editing */}
                  {editingLoan && editingLoan.application_document_url && !applicationFile && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-green-600 mr-2" />
                          <div>
                            <p className="text-sm font-semibold text-green-800">Current Document</p>
                            <p className="text-xs text-green-700">{editingLoan.application_document_name || 'Application document'}</p>
                          </div>
                        </div>
                        <a
                          href={editingLoan.application_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          View Document
                        </a>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Upload a new file below to replace this document (optional)
                      </p>
                    </div>
                  )}
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="application-file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      required={!editingLoan}
                    />
                    <label
                      htmlFor="application-file"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#00205B] hover:bg-gray-50 transition-all"
                    >
                      {applicationFile ? (
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-gray-900">{applicationFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(applicationFile.size / 1024).toFixed(2)} KB
                          </p>
                          <p className="text-xs text-blue-600 mt-2">Click to change file</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-gray-700">
                            {editingLoan ? 'Click to upload new document (optional)' : 'Click to upload document'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PDF, Word, JPG, or PNG (Max 5MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-900 font-semibold mb-2">Eligibility Requirements</p>
                    <ul className="text-sm text-blue-800 space-y-1.5">
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Active member status required
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        All monthly dues must be current and paid
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Valid guarantor information required
                      </li>
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                        Realistic repayment date must be provided
                      </li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-3 italic">
                      Your eligibility will be automatically verified upon submission
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#00205B] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#003d82] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {editingLoan ? 'Updating...' : 'Processing Request...'}
                    </span>
                  ) : (
                    editingLoan ? 'Update Loan Application' : 'Submit Loan Request'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingLoan(null)
                    setFormData({
                      amount: '',
                      reason: '',
                      expected_repayment_date: '',
                      guarantor_name: '',
                      guarantor_phone: '',
                      guarantor_relationship: '',
                      university: ''
                    })
                    setApplicationFile(null)
                  }}
                  className="px-8 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loans List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Loan History</h2>
                <p className="text-gray-600 mt-1">Track the status of all your loan applications</p>
              </div>
              {loans.length > 0 && (
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, loans.length)} of {loans.length}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {loans.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">No loan applications yet</p>
                <p className="text-gray-400 text-sm mt-2">Your loan requests will appear here once submitted</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {currentLoans.map(loan => {
                    // Debug: Log payment proof status
                    if (loan.id === '2ea425ee-f40a-4a4e-a3dd-732183dff4ec') {
                      console.log('🔍 Rendering loan with ID:', loan.id)
                      console.log('🖼️ Has last_payment_proof_url?', !!loan.last_payment_proof_url)
                      console.log('🖼️ Last payment proof URL:', loan.last_payment_proof_url ? loan.last_payment_proof_url.substring(0, 50) : 'NONE')
                    }
                    
                    return (
                  <div 
                    key={loan.id} 
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="p-5">
                      {/* Header: Amount and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-baseline space-x-3">
                          <p className="text-2xl font-bold text-[#00205B]">
                            {formatCurrency(loan.amount)}
                          </p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                            loan.status === 'secretary_approved' ? 'bg-blue-100 text-blue-700' :
                            loan.status === 'finance_approved' ? 'bg-indigo-100 text-indigo-700' :
                            loan.status === 'disbursed' ? 'bg-purple-100 text-purple-700' :
                            loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            loan.status === 'withdrawn' ? 'bg-gray-100 text-gray-700' :
                            loan.status === 'repaid' ? 'bg-teal-100 text-teal-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {loan.status === 'secretary_approved' ? 'Secretary Approved' : 
                             loan.status === 'finance_approved' ? 'Finance Approved' :
                             loan.status === 'disbursed' ? 'Disbursed' :
                             loan.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">
                            {formatDate(loan.created_at)}
                          </p>
                          {/* Action buttons - only for pending */}
                          {loan.status === 'pending' && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleRecheck(loan)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center px-2 py-1 rounded hover:bg-blue-50"
                                title="Recheck and edit application"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Recheck
                              </button>
                              <button
                                onClick={() => handleDelete(loan)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center px-2 py-1 rounded hover:bg-red-50"
                                title="Delete application"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Delete
                              </button>
                            </div>
                          )}
                          {/* Withdraw button - only for secretary_approved */}
                          {loan.status === 'secretary_approved' && (
                            <button
                              onClick={() => handleWithdraw(loan)}
                              className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center px-2 py-1 rounded hover:bg-orange-50"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              Withdraw
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Purpose */}
                      <div className="bg-gray-50 rounded px-3 py-2 mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Purpose</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{loan.reason}</p>
                      </div>

                      {/* University and Member Info */}
                      {loan.university && (
                        <div className="px-3 py-2 mb-3">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">University</p>
                          <p className="text-sm text-gray-800 font-medium">{loan.university}</p>
                        </div>
                      )}

                      {/* Guarantor & Repayment Info */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="bg-gray-50 rounded px-3 py-2">
                          <p className="text-gray-500 font-semibold mb-0.5">Guarantor</p>
                          <p className="text-gray-800 font-medium">{loan.guarantor_name || 'N/A'}</p>
                          {loan.guarantor_phone && (
                            <p className="text-gray-600 text-xs">{loan.guarantor_phone}</p>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded px-3 py-2">
                          <p className="text-gray-500 font-semibold mb-0.5">Expected Repayment</p>
                          <p className="text-gray-800 font-medium">
                            {loan.expected_repayment_date ? formatDate(loan.expected_repayment_date) : 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Application Document */}
                      {loan.application_document_url && (
                        <div className="mb-3">
                          <a
                            href={loan.application_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            View Written Application
                          </a>
                        </div>
                      )}

                      {/* Approval Progress Bar */}
                      {(loan.status === 'pending' || loan.status === 'secretary_approved' || loan.status === 'finance_approved' || loan.status === 'disbursed' || loan.status === 'approved') && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Progress</p>
                          <div className="flex items-center space-x-1.5">
                            <div className={`flex-1 h-1.5 rounded-full ${
                              ['secretary_approved', 'finance_approved', 'disbursed', 'approved', 'repaid'].includes(loan.status) 
                                ? 'bg-blue-500' 
                                : 'bg-gray-200'
                            }`}></div>
                            <div className={`flex-1 h-1.5 rounded-full ${
                              ['finance_approved', 'disbursed', 'approved', 'repaid'].includes(loan.status) 
                                ? 'bg-indigo-500' 
                                : 'bg-gray-200'
                            }`}></div>
                            <div className={`flex-1 h-1.5 rounded-full ${
                              ['disbursed', 'approved', 'repaid'].includes(loan.status) 
                                ? 'bg-purple-500' 
                                : 'bg-gray-200'
                            }`}></div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs">
                            <span className={['secretary_approved', 'finance_approved', 'disbursed', 'approved', 'repaid'].includes(loan.status) ? 'font-semibold text-blue-600' : 'text-gray-500'}>Secretary</span>
                            <span className={['finance_approved', 'disbursed', 'approved', 'repaid'].includes(loan.status) ? 'font-semibold text-indigo-600' : 'text-gray-500'}>Finance</span>
                            <span className={['disbursed', 'approved', 'repaid'].includes(loan.status) ? 'font-semibold text-purple-600' : 'text-gray-500'}>Treasurer</span>
                          </div>
                        </div>
                      )}

                      {/* Status Message - Compact */}
                      {loan.status === 'pending' && (
                        <div className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-2 text-yellow-600 flex-shrink-0" />
                          <p className="text-xs text-yellow-800 font-medium">Awaiting review by Secretary</p>
                        </div>
                      )}

                      {loan.status === 'secretary_approved' && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-2 text-blue-600 flex-shrink-0" />
                          <p className="text-xs text-blue-800 font-medium">Secretary approved - Finance reviewing</p>
                        </div>
                      )}

                      {loan.status === 'finance_approved' && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-2 text-indigo-600 flex-shrink-0" />
                          <p className="text-xs text-indigo-800 font-medium">Finance approved - Treasurer processing</p>
                        </div>
                      )}

                      {(loan.status === 'approved' || loan.status === 'disbursed') && loan.approved_at && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-2 text-green-600 flex-shrink-0" />
                          <p className="text-xs text-green-800 font-medium">Approved & disbursed on {formatDate(loan.approved_at)}</p>
                        </div>
                      )}

                      {/* Disbursement Details - Show when loan is disbursed or repaid */}
                      {(loan.status === 'disbursed' || loan.status === 'repaid') && (
                        <div className="mt-4 p-4 border-t border-gray-200">
                          {/* Repayment Status */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-gray-900 uppercase">
                                Repayment Status
                              </p>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                loan.repayment_status === 'completed' ? 'bg-green-100 text-green-800' :
                                loan.repayment_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                loan.repayment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.repayment_status === 'completed' ? '✓ Completed' :
                                 loan.repayment_status === 'in_progress' ? 'In Progress' :
                                 loan.repayment_status === 'overdue' ? 'Overdue' :
                                 'Not Started'}
                              </span>
                            </div>

                            {/* Repayment Progress */}
                            {loan.total_amount_with_interest > 0 && (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Total to Repay:</span>
                                  <span className="font-bold text-gray-900">¥{loan.total_amount_with_interest.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Already Paid:</span>
                                  <span className="font-semibold text-green-700">¥{(loan.total_repaid || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-2">
                                  <span className="text-gray-600 font-medium">Remaining Balance:</span>
                                  <span className="font-bold text-[#00205B] text-sm">¥{(loan.remaining_balance || 0).toFixed(2)}</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${((loan.total_repaid || 0) / loan.total_amount_with_interest) * 100}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 text-center">
                                  {((loan.total_repaid || 0) / loan.total_amount_with_interest * 100).toFixed(1)}% repaid
                                </p>
                              </div>
                            )}

                            {/* Payment Schedule Info */}
                            {loan.monthly_installment && (
                              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-blue-700">Monthly Installment:</span>
                                  <span className="font-bold text-blue-900">¥{loan.monthly_installment.toFixed(2)}</span>
                                </div>
                                {loan.interest_rate > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-blue-700">Interest Rate:</span>
                                    <span className="font-semibold text-blue-900">{loan.interest_rate}% per year</span>
                                  </div>
                                )}
                                {loan.final_repayment_date && (
                                  <div className="flex justify-between text-xs mt-1">
                                    <span className="text-blue-700">Final Due Date:</span>
                                    <span className="font-semibold text-blue-900">{formatDate(loan.final_repayment_date)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {loan.repayment_status !== 'completed' && (
                            <div className="space-y-2 mb-3">
                              <button
                                onClick={() => openPaymentModal(loan)}
                                className="w-full bg-[#00205B] hover:bg-[#003d82] text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                              >
                                <Upload className="w-4 h-4" />
                                Make Payment
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => viewPaymentHistory(loan)}
                            className="w-full border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <FileText className="w-4 h-4" />
                            View Payment History
                          </button>

                          {/* Latest Payment Proofs Preview */}
                          {loan.last_payment_proof_url && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-bold text-gray-700 uppercase mb-2">
                                Latest Payment Proof
                              </p>
                              <div className="flex items-center gap-2">
                                <img
                                  src={loan.last_payment_proof_url}
                                  alt="Payment Proof"
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#00205B] transition-colors"
                                  onClick={() => setViewProofImage(loan.last_payment_proof_url)}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600 mb-1">
                                    Click image to view full size
                                  </p>
                                  <button
                                    onClick={() => viewPaymentHistory(loan)}
                                    className="text-[#00205B] hover:text-[#003d82] text-xs font-semibold"
                                  >
                                    View All Proofs →
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Disbursement Info */}
                          {loan.disbursement_proof_url && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-bold text-gray-700 uppercase mb-2">
                                Disbursement Details
                              </p>
                              <div className="space-y-1 mb-2">
                                {loan.disbursement_method && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Method:</span>
                                    <span className="text-gray-900 font-semibold flex items-center gap-1.5">
                                      {loan.disbursement_method === 'bank_transfer' && '🏦 Bank Transfer'}
                                      {loan.disbursement_method === 'cash' && '💵 Cash'}
                                      {loan.disbursement_method === 'wechat' && (
                                        <>
                                          <img src="/wechat-logo.svg" alt="WeChat" className="h-4 w-4 object-contain" />
                                          WeChat Pay
                                        </>
                                      )}
                                      {loan.disbursement_method === 'alipay' && (
                                        <>
                                          <img src="/alipay-logo.svg" alt="Alipay" className="h-4 w-4 object-contain" />
                                          Alipay
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {loan.disbursed_at && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Disbursed:</span>
                                    <span className="text-gray-900 font-semibold">{formatDate(loan.disbursed_at)}</span>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => setViewProofImage(loan.disbursement_proof_url)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-semibold"
                              >
                                View Disbursement Proof
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {loan.status === 'rejected' && (
                        <div>
                          <div className="flex items-center mb-1">
                            <XCircle className="w-3.5 h-3.5 mr-2 text-red-600 flex-shrink-0" />
                            <p className="text-xs text-red-800 font-semibold">Rejected</p>
                          </div>
                          <p className="text-xs text-red-700 ml-5">{loan.rejection_reason || 'No reason provided'}</p>
                        </div>
                      )}

                      {loan.status === 'repaid' && loan.repaid_at && (
                        <div className="flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-2 text-teal-600 flex-shrink-0" />
                          <p className="text-xs text-teal-800 font-medium">Fully repaid on {formatDate(loan.repaid_at)}</p>
                        </div>
                      )}

                      {loan.status === 'withdrawn' && (
                        <div>
                          <div className="flex items-center mb-1">
                            <X className="w-3.5 h-3.5 mr-2 text-gray-600 flex-shrink-0" />
                            <p className="text-xs text-gray-800 font-semibold">Withdrawn on {formatDate(loan.withdrawn_at)}</p>
                          </div>
                          {loan.withdrawn_reason && (
                            <p className="text-xs text-gray-700 ml-5">{loan.withdrawn_reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                            currentPage === page
                              ? 'bg-[#00205B] text-white'
                              : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1"
                    >
                      <span className="text-sm font-medium">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-sm text-gray-600">
                    {itemsPerPage} per page
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Withdraw Loan Application</h3>
                <button
                  onClick={() => {
                    setShowWithdrawModal(false)
                    setWithdrawingLoan(null)
                    setWithdrawReason('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {withdrawingLoan && (
                <div className="mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">
                      Are you sure you want to withdraw this loan application?
                    </p>
                    <div className="text-sm text-red-700">
                      <p className="font-bold">{formatCurrency(withdrawingLoan.amount)}</p>
                      <p className="text-xs mt-1">Applied on {formatDate(withdrawingLoan.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Withdrawal (Optional)
                    </label>
                    <textarea
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      rows={3}
                      placeholder="Please provide a reason for withdrawing this application..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={confirmWithdraw}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Confirm Withdrawal
                </button>
                <button
                  onClick={() => {
                    setShowWithdrawModal(false)
                    setWithdrawingLoan(null)
                    setWithdrawReason('')
                  }}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Note: Withdrawn applications are kept for audit purposes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Delete Loan Application</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingLoan(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {deletingLoan && (
                <div className="mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Trash2 className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800 mb-2">
                          Are you sure you want to permanently delete this loan application?
                        </p>
                        <div className="text-sm text-red-700">
                          <p className="font-bold">{formatCurrency(deletingLoan.amount)}</p>
                          <p className="text-xs mt-1">Applied on {formatDate(deletingLoan.created_at)}</p>
                        </div>
                        <p className="text-xs text-red-600 mt-3 font-medium">
                          ⚠️ This action cannot be undone!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Delete Permanently
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingLoan(null)
                  }}
                  className="px-6 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disbursement Proof Viewing Modal */}
      {viewProofImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewProofImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white rounded-t-lg px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Payment Proof</h3>
              <button
                onClick={() => setViewProofImage(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image Container */}
            <div className="bg-white p-4 max-h-[calc(90vh-8rem)] overflow-auto">
              <img
                src={viewProofImage}
                alt="Payment proof"
                className="w-full h-auto rounded-lg"
                onError={(e) => {
                  console.error('❌ Failed to load proof image')
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-white rounded-b-lg px-6 py-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Payment proof document
              </p>
              <div className="flex gap-3">
                <a
                  href={viewProofImage}
                  download="disbursement-proof.jpg"
                  className="px-4 py-2 bg-[#00205B] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={() => setViewProofImage(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoanForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#00205B]">Make Loan Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600">Record your payment to reduce your loan balance</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Loan Summary */}
              <div className="rounded-lg p-4">
                <h3 className="font-bold text-[#00205B] mb-3">Loan Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700">Total Amount:</p>
                    <p className="font-bold text-[#00205B] text-lg">¥{selectedLoanForPayment.total_amount_with_interest?.toFixed(2) || selectedLoanForPayment.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Already Paid:</p>
                    <p className="font-semibold text-green-700 text-lg">¥{(selectedLoanForPayment.total_repaid || 0).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-blue-700">Remaining Balance:</p>
                    <p className="font-bold text-[#00205B] text-2xl">¥{(selectedLoanForPayment.remaining_balance || selectedLoanForPayment.amount).toFixed(2)}</p>
                  </div>
                  {selectedLoanForPayment.monthly_installment && (
                    <div className="col-span-2 pt-2 border-t border-gray-200">
                      <p className="text-blue-700">Suggested Payment:</p>
                      <p className="font-semibold text-[#00205B]">¥{selectedLoanForPayment.monthly_installment.toFixed(2)} (monthly installment)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Payment Amount (¥) *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  max={selectedLoanForPayment.remaining_balance}
                  placeholder="Enter amount"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-lg ${
                    paymentAmount && parseFloat(paymentAmount) > selectedLoanForPayment.remaining_balance
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-[#00205B]'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum allowed: ¥{(selectedLoanForPayment.remaining_balance || 0).toFixed(2)}
                </p>
                {paymentAmount && parseFloat(paymentAmount) > selectedLoanForPayment.remaining_balance && (
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    ⚠️ Amount exceeds remaining balance! Please enter ¥{selectedLoanForPayment.remaining_balance.toFixed(2)} or less.
                  </p>
                )}
                {paymentAmount && parseFloat(paymentAmount) <= selectedLoanForPayment.remaining_balance && parseFloat(paymentAmount) > 0 && (
                  <p className="text-sm font-semibold text-green-600 mt-2">
                    ✓ New Balance: ¥{Math.max(0, (selectedLoanForPayment.remaining_balance || 0) - parseFloat(paymentAmount || '0')).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'bank_transfer', label: '🏦 Bank Transfer', icon: null },
                    { value: 'wechat', label: 'WeChat Pay', icon: '/wechat-logo.svg' },
                    { value: 'alipay', label: 'Alipay', icon: '/alipay-logo.svg' },
                    { value: 'cash', label: '💵 Cash', icon: null }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        paymentMethod === method.value
                          ? 'border-[#00205B] bg-blue-50 text-[#00205B]'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {method.icon ? (
                        <img src={method.icon} alt={method.label} className="h-6 w-6 object-contain" />
                      ) : null}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code Display for WeChat/Alipay */}
              {(paymentMethod === 'wechat' || paymentMethod === 'alipay') && (
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    <h3 className="font-bold text-[#00205B] text-lg mb-2">
                      {paymentMethod === 'wechat' ? '📱 Scan to Pay via WeChat' : '📱 Scan to Pay via Alipay'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Scan the QR code below with {paymentMethod === 'wechat' ? 'WeChat' : 'Alipay'} app to make the payment
                    </p>
                    
                    {loadingQRCodes ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00205B]" />
                        <p className="ml-2 text-sm text-gray-600">Loading QR code...</p>
                      </div>
                    ) : (paymentQRCodes[paymentMethod]?.qr_code_url || paymentQRCodes.default?.qr_code_url) ? (
                      <div className="bg-white p-4 rounded-lg inline-block shadow-lg">
                        <img 
                          src={paymentQRCodes[paymentMethod]?.qr_code_url || paymentQRCodes.default?.qr_code_url} 
                          alt={`Payment QR Code`}
                          className="w-64 h-64 object-contain mx-auto"
                        />
                        {(paymentQRCodes[paymentMethod]?.title || paymentQRCodes.default?.title) && (
                          <p className="text-sm font-semibold text-gray-700 mt-2">
                            {paymentQRCodes[paymentMethod]?.title || paymentQRCodes.default?.title}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No payment QR code available. Please contact admin or choose another payment method.
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs text-[#00205B] font-semibold">
                        💡 After payment, upload a screenshot as proof below
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Payment Proof (Recommended)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {!paymentProofUrl ? (
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-[#00205B] hover:text-[#003d82] font-semibold">
                          {uploadingProof ? 'Uploading...' : 'Click to upload'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofUpload}
                          className="hidden"
                          disabled={uploadingProof}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload a screenshot or photo of your payment (PNG, JPG, max 5MB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm font-semibold text-green-900">Proof uploaded successfully</span>
                        </div>
                        <button
                          onClick={() => {
                            setPaymentProof(null)
                            setPaymentProofUrl(null)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                      {paymentProofUrl && (
                        <div className="relative">
                          <img 
                            src={paymentProofUrl} 
                            alt="Payment proof" 
                            className="w-full rounded-lg border border-gray-200 max-h-64 object-contain bg-gray-50"
                            onError={(e) => {
                              console.error('Error loading payment proof image:', paymentProofUrl)
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment (e.g., transaction ID, reference number)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={
                    submittingPayment || 
                    !paymentAmount || 
                    parseFloat(paymentAmount) <= 0 ||
                    parseFloat(paymentAmount) > selectedLoanForPayment.remaining_balance
                  }
                  className="flex-1 px-6 py-3 bg-[#00205B] hover:bg-[#003d82] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && selectedLoanHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#00205B]">Payment History</h2>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600">Complete payment records for this loan</p>
            </div>

            <div className="p-6">
              {/* Loan Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Original Amount</p>
                    <p className="text-xl font-bold text-gray-900">¥{selectedLoanHistory.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Repaid</p>
                    <p className="text-xl font-bold text-green-700">¥{(selectedLoanHistory.total_repaid || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Remaining</p>
                    <p className="text-xl font-bold text-[#00205B]">¥{(selectedLoanHistory.remaining_balance || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${((selectedLoanHistory.total_repaid || 0) / (selectedLoanHistory.total_amount_with_interest || selectedLoanHistory.amount)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center mt-1">
                    {((selectedLoanHistory.total_repaid || 0) / (selectedLoanHistory.total_amount_with_interest || selectedLoanHistory.amount) * 100).toFixed(1)}% repaid
                  </p>
                </div>
              </div>

              {/* Payment Records */}
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00205B]" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">No payments recorded yet</p>
                  <p className="text-sm text-gray-400 mt-1">Payment history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 mb-3">Payment Records ({paymentHistory.length})</h3>
                  {paymentHistory.map((payment, index) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="font-bold text-green-700">#{paymentHistory.length - index}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">¥{payment.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{formatDate(payment.payment_date)}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          {payment.payment_method === 'bank_transfer' && (
                            <>🏦 Bank Transfer</>
                          )}
                          {payment.payment_method === 'wechat' && (
                            <>
                              <img src="/wechat-logo.svg" alt="WeChat" className="h-4 w-4 object-contain" />
                              WeChat
                            </>
                          )}
                          {payment.payment_method === 'alipay' && (
                            <>
                              <img src="/alipay-logo.svg" alt="Alipay" className="h-4 w-4 object-contain" />
                              Alipay
                            </>
                          )}
                          {payment.payment_method === 'cash' && (
                            <>💵 Cash</>
                          )}
                        </span>
                      </div>

                      {payment.notes && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{payment.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {payment.payment_type === 'member' 
                            ? (payment.recorded_by === selectedLoanHistory?.user_id 
                                ? 'Recorded by self' 
                                : `Recorded by ${payment.recorded_by_user?.full_name || 'member'}`)
                            : `Recorded by ${payment.recorded_by_user?.full_name || 'treasurer'}`}
                        </p>
                        {payment.payment_proof_url && (
                          <div className="flex items-center gap-2">
                            {/* Thumbnail Preview */}
                            <img
                              src={payment.payment_proof_url}
                              alt="Payment Proof Preview"
                              className="w-12 h-12 object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-[#00205B] transition-colors"
                              onClick={() => setViewProofImage(payment.payment_proof_url)}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <button
                              onClick={() => setViewProofImage(payment.payment_proof_url)}
                              className="text-[#00205B] hover:text-[#003d82] text-sm font-semibold flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              View Proof
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Close Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
