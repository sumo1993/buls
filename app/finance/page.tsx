'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import BudgetProposalsPanel from '@/components/BudgetProposalsPanel'
import { Loader2, CheckCircle, XCircle, Eye, FileText, Download, TrendingUp, Coins, Calendar, Users, Search, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function FinancePage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set())
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('monthly')
  const [reportPeriod, setReportPeriod] = useState('')
  const [reportNotes, setReportNotes] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([])
  
  // Member Search states
  const [showMemberSearchModal, setShowMemberSearchModal] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMemberPayments, setSelectedMemberPayments] = useState<any[]>([])
  const [selectedMemberInfo, setSelectedMemberInfo] = useState<any>(null)
  const [memberSearchPage, setMemberSearchPage] = useState(1)
  const [memberSearchPerPage] = useState(10)
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Monthly Records states
  const [showMonthPaymentsModal, setShowMonthPaymentsModal] = useState(false)
  const [selectedMonthData, setSelectedMonthData] = useState<{ month: string; year: number; payments: any[] } | null>(null)
  const [loadingMonthPayments, setLoadingMonthPayments] = useState(false)
  const [monthPaymentsPage, setMonthPaymentsPage] = useState(1)
  const [monthPaymentsPerPage] = useState(10)
  
  // Loan repayment tracking states
  const [loanRepayments, setLoanRepayments] = useState<any[]>([])
  const [repaymentPage, setRepaymentPage] = useState(1)
  const [repaymentFilter, setRepaymentFilter] = useState('all')
  const [loadingRepayments, setLoadingRepayments] = useState(false)
  const [showRepaymentSection, setShowRepaymentSection] = useState(false)
  
  // Financial Reports states (enhanced)
  const [showFinancialReportsModal, setShowFinancialReportsModal] = useState(false)
  const [financialReportType, setFinancialReportType] = useState<'summary' | 'detailed' | 'analytics'>('summary')
  const [financialReportDateRange, setFinancialReportDateRange] = useState({
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: new Date().toISOString().split('T')[0]
  })
  
  // Loan Details Modal states
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false)
  const [selectedLoanDetails, setSelectedLoanDetails] = useState<any>(null)
  const [selectedDuesYear, setSelectedDuesYear] = useState(new Date().getFullYear())
  const [loadingDuesData, setLoadingDuesData] = useState(false)
  
  // Loan Dashboard state
  const [financeActiveTab, setFinanceActiveTab] = useState<'payments' | 'loans' | 'budget_proposals' | 'non_member_payments'>('payments')

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'payments' || tab === 'loans' || tab === 'budget_proposals' || tab === 'non_member_payments') {
      setFinanceActiveTab(tab)
    }
  }, [])

  const [financeShowLoanStats, setFinanceShowLoanStats] = useState(true)
  const [financeLoanStatistics, setFinanceLoanStatistics] = useState<any>(null)
  const [financeLoadingStats, setFinanceLoadingStats] = useState(false)
  
  // Budget Proposals state
  const [financeProposals, setFinanceProposals] = useState<any[]>([])
  const [financeShowProposalModal, setFinanceShowProposalModal] = useState(false)
  const [financeSelectedProposalForPayment, setFinanceSelectedProposalForPayment] = useState<any>(null)
  const [financePaymentForm, setFinancePaymentForm] = useState({
    proposal_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    paid_to_name: '',
    paid_to_account: '',
    notes: ''
  })

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const financeLoansLoadedRef = useRef(false)

  // Loans tab: load loans + stats on demand (not on every finance mount)
  useEffect(() => {
    if (!user || loading) return
    if (financeActiveTab === 'loans') {
      void loadFinanceLoansTab()
    }
  }, [financeActiveTab, user, loading])

  const loadFinanceLoansTab = async () => {
    if (financeLoansLoadedRef.current) {
      if (!financeLoanStatistics) fetchLoanStatistics()
      return
    }
    financeLoansLoadedRef.current = true
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const [{ data: loansData }, reportsResult] = await Promise.all([
        supabase
          .from('loans')
          .select(`
            id, amount, status, created_at, user_id, remaining_balance,
            users:user_id (id, full_name, email)
          `)
          .in('status', ['secretary_approved', 'finance_approved', 'finance_rejected', 'disbursed', 'repaid'])
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('financial_reports')
          .select('id, report_type, period, generated_at, notes')
          .order('generated_at', { ascending: false })
          .limit(10),
        fetchLoanStatistics(),
      ])

      if (loansData) setLoans(loansData)
      if (!reportsResult.error && reportsResult.data) setRecentReports(reportsResult.data)
    } catch (e) {
      console.error('Failed to load finance loans tab:', e)
      financeLoansLoadedRef.current = false
    }
  }

  const fetchData = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, clerk_id, full_name, email, role, status')
        .eq('clerk_id', userId)
        .maybeSingle()

      if (userError || !userData) {
        toast.error('Failed to load user data')
        setLoading(false)
        return
      }

      setUser(userData)

      if (userData.role !== 'admin' && userData.role !== 'finance') {
        toast.error('Access denied. Finance panel requires admin or finance role.')
        router.push('/dashboard')
        return
      }

      // Payments tab only on first paint
      const paymentsResponse = await fetch('/api/finance/payments')
      if (!paymentsResponse.ok) {
        toast.error('Failed to load payments data')
      } else {
        const paymentsResult = await paymentsResponse.json()
        setPayments(paymentsResult.payments || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLoanRepayments = async (page = 1, status = 'all') => {
    setLoadingRepayments(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(status !== 'all' && { status })
      })
      
      const response = await fetch(`/api/finance/repayment-tracking?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLoanRepayments(data.loans || [])
        console.log('✅ Loan repayments fetched:', data.loans?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching loan repayments:', error)
    } finally {
      setLoadingRepayments(false)
    }
  }

  const fetchLoanStatistics = async () => {
    setFinanceLoadingStats(true)
    try {
      const response = await fetch('/api/finance/loan-statistics')
      if (response.ok) {
        const data = await response.json()
        setFinanceLoanStatistics(data.statistics)
        console.log('📊 Loan statistics fetched:', data.statistics)
      } else {
        console.error('❌ Failed to fetch loan statistics')
      }
    } catch (error) {
      console.error('Error fetching loan statistics:', error)
    } finally {
      setFinanceLoadingStats(false)
    }
  }

  // Load budget proposals
  useEffect(() => {
    if (financeActiveTab === 'budget_proposals') {
      fetchFinanceBudgetProposals()
    }
  }, [financeActiveTab])

  const fetchFinanceBudgetProposals = async () => {
    try {
      const response = await fetch('/api/budget-proposals')
      if (response.ok) {
        const data = await response.json()
        if (data.proposals) {
          setFinanceProposals(data.proposals)
        }
      }
    } catch (error) {
      console.error('Error fetching budget proposals:', error)
    }
  }

  // Budget Proposals functions
  const openPaymentModal = (proposal: any) => {
    setFinanceSelectedProposalForPayment(proposal)
    setFinancePaymentForm({
      proposal_id: proposal.id,
      amount: proposal.total_amount.toString(),
      payment_method: 'bank_transfer',
      payment_reference: '',
      paid_to_name: '',
      paid_to_account: '',
      notes: ''
    })
    setFinanceShowProposalModal(true)
  }

  const viewBudgetProposal = (proposal: any) => {
    // View functionality - could expand to show full proposal details
    toast.info(`Viewing proposal: ${proposal.title}`)
  }

  const savePaymentRecord = async () => {
    try {
      const response = await fetch('/api/payment-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financePaymentForm)
      })

      if (response.ok) {
        toast.success('Payment recorded successfully')
        setFinanceShowProposalModal(false)
        setFinancePaymentForm({
          proposal_id: '',
          amount: '',
          payment_method: 'bank_transfer',
          payment_reference: '',
          paid_to_name: '',
          paid_to_account: '',
          notes: ''
        })
        const proposalsResponse = await fetch('/api/budget-proposals')
        if (proposalsResponse.ok) {
          const data = await proposalsResponse.json()
          if (data.proposals) {
            setFinanceProposals(data.proposals)
          }
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    }
  }

  const approvePayment = async (paymentId: string) => {
    setProcessing(paymentId)
    try {
      const response = await fetch('/api/finance/approve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve payment')
      }

      toast.success(`✅ Payment approved! Receipt: ${result.receipt_number}`, { duration: 5000 })
      
      // Refresh data to remove approved payment from list
      await fetchData()
    } catch (error: any) {
      console.error('Error approving payment:', error)
      toast.error(error.message || 'Failed to approve payment')
    } finally {
      setProcessing(null)
    }
  }

  const rejectPayment = async (paymentId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setProcessing(paymentId)
    try {
      const response = await fetch('/api/finance/reject-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId,
          rejectionReason 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject payment')
      }

      toast.success('❌ Payment rejected successfully')
      setRejectingId(null)
      setRejectionReason('')
      
      // Refresh data to remove rejected payment from list
      await fetchData()
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      toast.error(error.message || 'Failed to reject payment')
    } finally {
      setProcessing(null)
    }
  }

  // Batch approval function
  const batchApprovePayments = async () => {
    if (selectedPayments.size === 0) {
      toast.error('Please select at least one payment')
      return
    }

    const confirmed = window.confirm(`Are you sure you want to approve ${selectedPayments.size} payment(s)?`)
    if (!confirmed) return

    setProcessing('batch')
    let successCount = 0
    let errorCount = 0

    try {
      for (const paymentId of Array.from(selectedPayments)) {
        try {
          const response = await fetch('/api/finance/approve-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} payment(s) approved successfully!`)
      }
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} payment(s) failed to approve`)
      }

      setSelectedPayments(new Set())
      await fetchData()
    } catch (error: any) {
      toast.error('Batch approval failed')
    } finally {
      setProcessing(null)
    }
  }

  // Toggle payment selection
  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId)
      } else {
        newSet.add(paymentId)
      }
      return newSet
    })
  }

  // Select all payments on current page
  const toggleSelectAll = () => {
    const currentPayments = getCurrentPagePayments()
    if (selectedPayments.size === currentPayments.length) {
      setSelectedPayments(new Set())
    } else {
      setSelectedPayments(new Set(currentPayments.map(p => p.id)))
    }
  }

  // Get filtered and paginated payments
  const getFilteredPayments = () => {
    let filtered = collectedPayments
    
    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      if (paymentMethodFilter === 'cash') {
        filtered = filtered.filter(p => p.payment_source === 'cash')
      } else {
        filtered = filtered.filter(p => 
          p.payment_source !== 'cash' && p.payment_method === paymentMethodFilter
        )
      }
    }
    
    // Filter by receipt number search (for approved payments that have receipt numbers)
    if (receiptSearchQuery.trim()) {
      // Also search in approved payments
      const allPayments = [...collectedPayments, ...approvedPayments]
      filtered = allPayments.filter(p => 
        p.receipt_number?.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
        p.users?.full_name?.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
        p.users?.email?.toLowerCase().includes(receiptSearchQuery.toLowerCase())
      )
    }
    
    return filtered
  }

  const getCurrentPagePayments = () => {
    const filtered = getFilteredPayments()
    const startIndex = (currentPage - 1) * 10
    const endIndex = startIndex + 10
    return filtered.slice(startIndex, endIndex)
  }

  const approveLoan = async (loanId: string) => {
    setProcessing(loanId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('loans')
        .update({
          status: 'finance_approved',
          finance_approved_by: user.id,
          finance_approved_at: new Date().toISOString()
        })
        .eq('id', loanId)

      if (error) throw error

      toast.success('Loan approved and sent to Treasurer for disbursement')
      fetchData()
    } catch (error) {
      toast.error('Failed to approve loan')
    } finally {
      setProcessing(null)
    }
  }

  const rejectLoan = async (loanId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setProcessing(loanId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('loans')
        .update({
          status: 'finance_rejected',
          finance_approved_by: user.id,
          finance_approved_at: new Date().toISOString(),
          finance_rejection_reason: rejectionReason
        })
        .eq('id', loanId)

      if (error) throw error

      toast.success('Loan rejected')
      setRejectingId(null)
      setRejectionReason('')
      fetchData()
    } catch (error) {
      toast.error('Failed to reject loan')
    } finally {
      setProcessing(null)
    }
  }

  const viewLoanDetails = async (loan: any, year?: number) => {
    if (!year) {
      year = selectedDuesYear
    }
    
    setSelectedLoanDetails(loan)
    setShowLoanDetailsModal(true)
    setLoadingDuesData(true)
    
    // Fetch payment history via API (bypasses RLS)
    try {
      console.log('🔍 FETCHING PAYMENTS VIA API FOR LOAN:', {
        loan_id: loan.id,
        user_id: loan.user_id,
        applicant: loan.users?.full_name,
        year: year
      })
      
      const response = await fetch(`/api/loans/${loan.id}/payments?year=${year}`)
      
      if (!response.ok) {
        console.error('❌ API request failed:', response.status)
        setLoadingDuesData(false)
        return
      }
      
      const data = await response.json()
      
      console.log('✅ API RESPONSE:', data)
      
      const payments = data.payments || []
      const currentMonth = data.currentMonth
      const currentYear = data.currentYear
      const selectedYear = data.selectedYear
      
      // Check dues eligibility
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]
      
      const paidMonths = payments.map((p: any) => p.month)
      const unpaidMonths: string[] = []
      
      console.log('📅 PAID MONTHS:', paidMonths)
      
      // For current year, check Jan to current month
      // For previous years, check all 12 months
      const monthsToCheck = (selectedYear === currentYear) ? currentMonth : 12
      
      // Check each month
      for (let i = 0; i < monthsToCheck; i++) {
        const monthName = monthNames[i]
        if (!paidMonths.includes(monthName)) {
          unpaidMonths.push(monthName)
        }
      }
      
      const hasUnpaidDues = unpaidMonths.length > 0
      
      console.log('✅ ELIGIBILITY RESULT:', {
        hasUnpaidDues,
        paidMonthsCount: payments.length,
        requiredMonthsCount: monthsToCheck,
        unpaidMonths,
        year: selectedYear
      })
      
      setSelectedLoanDetails((prev: any) => ({ 
        ...prev, 
        paymentHistory: payments,
        hasUnpaidDues: hasUnpaidDues,
        paidMonths: paidMonths,
        unpaidMonths: unpaidMonths,
        paidMonthsCount: payments.length,
        requiredMonthsCount: monthsToCheck,
        selectedYear: selectedYear,
        userEmail: data.userEmail
      }))
      
      setLoadingDuesData(false)
      
    } catch (error) {
      console.error('❌ Failed to fetch payment history:', error)
      setLoadingDuesData(false)
    }
  }

  const handleMonthClick = (month: string, year: number) => {
    // Navigate to payments page with month filter
    const monthMap: { [key: string]: string } = {
      'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
      'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
      'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
    }
    
    const fullMonthName = monthMap[month] || month
    
    // Close modal and navigate
    setShowLoanDetailsModal(false)
    router.push(`/finance?tab=payments&month=${fullMonthName}&year=${year}`)
  }

  const handleYearChange = (year: number) => {
    setSelectedDuesYear(year)
    if (selectedLoanDetails) {
      viewLoanDetails(selectedLoanDetails, year)
    }
  }

  const generateReport = async () => {
    if (!reportPeriod) {
      toast.error('Please select a report period')
      return
    }

    setGeneratingReport(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Calculate report data based on type
      const currentYear = new Date().getFullYear()
      let startDate: Date
      let endDate: Date = new Date()

      if (reportType === 'monthly') {
        const [year, month] = reportPeriod.split('-')
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        endDate = new Date(parseInt(year), parseInt(month), 0)
      } else if (reportType === 'quarterly') {
        const [year, quarter] = reportPeriod.split('-Q')
        const quarterStart = (parseInt(quarter) - 1) * 3
        startDate = new Date(parseInt(year), quarterStart, 1)
        endDate = new Date(parseInt(year), quarterStart + 3, 0)
      } else if (reportType === 'annual') {
        startDate = new Date(parseInt(reportPeriod), 0, 1)
        endDate = new Date(parseInt(reportPeriod), 11, 31)
      } else {
        // Custom - use reportPeriod as date range
        startDate = new Date()
        endDate = new Date()
      }

      // Fetch payments for period
      const { data: periodPayments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          users:user_id (
            full_name,
            email
          )
        `)
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Fetch loans for period
      const { data: periodLoans, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const totalRevenue = (periodPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0)
      const totalLoansIssued = (periodLoans || []).reduce((sum, l) => sum + parseFloat(l.amount), 0)

      // Save report
      const { error: reportError } = await supabase
        .from('financial_reports')
        .insert({
          report_type: reportType,
          report_period: reportPeriod,
          generated_by: user.id,
          total_revenue: totalRevenue,
          total_payments: (periodPayments || []).length,
          total_loans_issued: totalLoansIssued,
          total_loans_repaid: 0,
          report_data: {
            payments: periodPayments,
            loans: periodLoans,
            period: {
              start: startDate,
              end: endDate
            }
          },
          notes: reportNotes
        })

      if (reportError) throw reportError

      toast.success('Financial report generated successfully!')
      setShowReportModal(false)
      setReportPeriod('')
      setReportNotes('')
      fetchData()
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  const downloadReport = async (report: any) => {
    // Generate downloadable report
    const reportContent = `
FINANCIAL REPORT
================
Type: ${report.report_type.toUpperCase()}
Period: ${report.report_period}
Generated: ${formatDate(report.generated_at)}

SUMMARY
-------
Total Revenue: ${formatCurrency(report.total_revenue)}
Total Payments: ${report.total_payments}
Total Loans Issued: ${formatCurrency(report.total_loans_issued)}

Notes:
${report.notes || 'No notes'}

Generated by: BULS Beijing Management System
    `

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-report-${report.report_period}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Member Search Functions
  const searchMemberPayments = (query: string) => {
    if (!query.trim()) {
      setSelectedMemberPayments([])
      setSelectedMemberInfo(null)
      setShowSuggestions(false)
      return
    }

    const searchLower = query.toLowerCase()
    const memberPayments = payments.filter(p => 
      p.users?.full_name?.toLowerCase().includes(searchLower) ||
      p.users?.email?.toLowerCase().includes(searchLower)
    )

    if (memberPayments.length > 0) {
      memberPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setSelectedMemberPayments(memberPayments)
      setSelectedMemberInfo(memberPayments[0].users)
      setMemberSearchPage(1)
      setShowSuggestions(false)
      toast.success(`Found ${memberPayments.length} payment(s) for "${memberPayments[0].users?.full_name}"`)
    } else {
      setSelectedMemberPayments([])
      setSelectedMemberInfo(null)
      setShowSuggestions(false)
      toast.error('No payments found for this member')
    }
  }

  const handleMemberSearchInput = (query: string) => {
    setMemberSearchQuery(query)
    
    if (query.trim().length >= 2) {
      const searchLower = query.toLowerCase()
      const uniqueUsers = new Map()
      
      payments.forEach(p => {
        if (p.users && !uniqueUsers.has(p.users.id)) {
          const userName = p.users.full_name?.toLowerCase() || ''
          const userEmail = p.users.email?.toLowerCase() || ''
          
          if (userName.includes(searchLower) || userEmail.includes(searchLower)) {
            uniqueUsers.set(p.users.id, p.users)
          }
        }
      })
      
      setMemberSuggestions(Array.from(uniqueUsers.values()).slice(0, 5))
      setShowSuggestions(true)
    } else {
      setMemberSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectMemberFromSuggestion = (user: any) => {
    setMemberSearchQuery(user.full_name)
    setShowSuggestions(false)
    searchMemberPayments(user.full_name)
  }

  // Monthly Records Function
  const viewMonthPayments = async (month: string, year: number) => {
    setLoadingMonthPayments(true)
    setShowMonthPaymentsModal(true)
    setMonthPaymentsPage(1)
    
    try {
      const monthPayments = payments.filter(p => 
        p.month === month && p.year === year
      )
      
      setSelectedMonthData({ month, year, payments: monthPayments })
      toast.success(`Showing ${monthPayments.length} payment(s) for ${month} ${year}`)
    } catch (error: any) {
      console.error('Error loading month payments:', error)
      toast.error('Failed to load payment records')
      setShowMonthPaymentsModal(false)
    } finally {
      setLoadingMonthPayments(false)
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

  const collectedPayments = payments.filter(p => p.status === 'collected')
  const approvedPayments = payments.filter(p => p.status === 'approved')
  const pendingLoans = loans.filter(l => l.status === 'secretary_approved')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Calculate payment method breakdown
  const paymentBreakdown = {
    wechat: collectedPayments.filter(p => p.payment_method === 'wechat').length,
    alipay: collectedPayments.filter(p => p.payment_method === 'alipay').length,
    bank: collectedPayments.filter(p => p.payment_method === 'bank').length,
    cash: collectedPayments.filter(p => p.payment_source === 'cash').length
  }
  
  const totalCollectedAmount = collectedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  const filteredPayments = getFilteredPayments()
  const totalFilteredPages = Math.ceil(filteredPayments.length / 10)

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Panel</h1>
            <p className="text-gray-600">Process collected payments and generate reports</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMemberSearchModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
              <span>Search Member</span>
            </button>
            <button
              onClick={() => setShowMonthPaymentsModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span>Monthly Records</span>
            </button>
            <button
              onClick={() => setShowFinancialReportsModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Financial Reports</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setFinanceActiveTab('payments')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              financeActiveTab === 'payments'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Payment Processing
          </button>
          <button
            onClick={() => setFinanceActiveTab('loans')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              financeActiveTab === 'loans'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Loan Dashboard
          </button>
          <button
            onClick={() => setFinanceActiveTab('budget_proposals')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              financeActiveTab === 'budget_proposals'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Budget Proposals
          </button>
          <button
            onClick={() => setFinanceActiveTab('non_member_payments')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              financeActiveTab === 'non_member_payments'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Non-Member Payments
          </button>
        </div>

        {/* Stats — payments tab only */}
        {financeActiveTab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">From Treasurer</p>
                <p className="text-2xl font-bold text-blue-600">{collectedPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Collected payments</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">This year</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Loans</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingLoans.length}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {formatCurrency(approvedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <Coins className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
        )}

        {/* Loan Dashboard */}
        {financeActiveTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#00205B]">Loan Applications & Payments</h2>
                <p className="text-sm text-gray-600">Track loan applications and payment history</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setFinanceShowLoanStats(!financeShowLoanStats)
                    if (!financeShowLoanStats && !financeLoanStatistics) {
                      fetchLoanStatistics()
                    }
                  }}
                  className="btn-outline flex items-center space-x-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                  <span>{financeShowLoanStats ? 'Hide' : 'Show'} Statistics</span>
                </button>
              </div>
            </div>

            {/* Loan Statistics Dashboard */}
            {financeShowLoanStats && (
              <div className="space-y-4">
                {financeLoadingStats ? (
                  <div className="card text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D62828] mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading statistics...</p>
                  </div>
                ) : financeLoanStatistics ? (
                  <>
                    {/* Overdue Alert */}
                    {financeLoanStatistics.overdue_loans > 0 && (
                      <div style={{
                        backgroundColor: '#FEE2E2',
                        border: '2px solid #DC2626',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '12px'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style={{flex: 1}}>
                          <p style={{fontSize: '1rem', fontWeight: 700, color: '#991B1B', marginBottom: '4px'}}>
                            ⚠️ {financeLoanStatistics.overdue_loans} Overdue Loan{financeLoanStatistics.overdue_loans !== 1 ? 's' : ''}
                          </p>
                          <p style={{fontSize: '0.875rem', color: '#B91C1C'}}>
                            Immediate action required. Outstanding balance: ¥{parseFloat(financeLoanStatistics.total_outstanding || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Total Applications */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-300">Total Applications</p>
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.total_applications}</p>
                      </div>

                      {/* Pending Finance */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-orange-300">Pending Finance</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.pending_finance}</p>
                        <p className="text-xs text-orange-300 mt-1">Awaiting approval</p>
                      </div>

                      {/* Approved */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-300">Approved</p>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.approved_loans}</p>
                        <p className="text-xs text-green-300 mt-1">All stages approved</p>
                      </div>

                      {/* Disbursed */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-purple-300">Disbursed</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.disbursed_loans}</p>
                        <p className="text-xs text-purple-300 mt-1">Currently active</p>
                      </div>

                      {/* Repaid */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-teal-300">Fully Repaid</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.repaid_loans}</p>
                        <p className="text-xs text-teal-300 mt-1">Successfully completed</p>
                      </div>

                      {/* Overdue */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-red-300">Overdue</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{financeLoanStatistics.overdue_loans}</p>
                        <p className="text-xs text-red-300 mt-1">Requires follow-up</p>
                      </div>

                      {/* Total Disbursed */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-300">Total Disbursed</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">¥{parseFloat(financeLoanStatistics.total_amount_disbursed || 0).toFixed(0)}</p>
                        <p className="text-xs text-green-300 mt-1">Total loan volume</p>
                      </div>

                      {/* Total Repaid */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-300">Total Repaid</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">¥{parseFloat(financeLoanStatistics.total_amount_repaid || 0).toFixed(0)}</p>
                        <p className="text-xs text-blue-300 mt-1">Total repayments</p>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-[#00205B] border border-white rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Financial Overview
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(financeLoanStatistics.total_outstanding || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Active Loans</p>
                          <p className="text-2xl font-bold text-[#00205B]">{financeLoanStatistics.active_loans || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
                          <p className="text-2xl font-bold text-[#00205B]">{financeLoanStatistics.collection_rate ? `${financeLoanStatistics.collection_rate}%` : '0%'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Repaid Amount</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(financeLoanStatistics.total_amount_repaid || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card text-center py-8">
                    <p className="text-gray-600">Click "Show Statistics" to view loan analytics</p>
                  </div>
                )}
              </div>
            )}

            {/* Active Loans List */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#00205B]">Active Loans</h3>
              
              {financeLoadingStats ? (
                <div className="card text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D62828] mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading loans...</p>
                </div>
              ) : loans.filter(l => l.status === 'disbursed' || l.status === 'repaid').length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-gray-600">No active loans yet</p>
                  <p className="text-sm text-gray-500 mt-1">Approved loans will appear here after disbursement</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.filter(l => l.status === 'disbursed' || l.status === 'repaid').map(loan => (
                    <div key={loan.id} className="card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-bold text-lg">{loan.users?.full_name}</h3>
                            <span className={`badge-${loan.status}`}>{loan.status.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm text-gray-600">{loan.users?.email}</p>
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-bold text-lg text-green-600">¥{parseFloat(loan.amount).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Remaining Balance</p>
                              <p className="font-bold text-lg text-[#00205B]">¥{parseFloat(loan.remaining_balance || '0').toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Disbursed Date</p>
                              <p className="font-medium">{new Date(loan.disbursed_at || loan.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">University</p>
                              <p className="font-medium">{loan.university || 'N/A'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Applied: {new Date(loan.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewLoanDetails(loan)}
                            className="px-4 py-2 bg-[#00205B] hover:bg-[#003d82] text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            View Payments
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budget Proposals Tab */}
        {financeActiveTab === 'budget_proposals' && (
          <div className="card">
            <BudgetProposalsPanel
              mode="staff"
              canManage={false}
              canPay={false}
              title="Budget Proposals"
              subtitle="View approved committee budgets (Treasurer records payments)"
            />
          </div>
        )}

        {/* Non-Member Payments Tab */}
        {financeActiveTab === 'non_member_payments' && (
          <div className="card p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Non-Member Payments</h2>
              <p className="text-gray-600 mb-6">View and audit non-member event registration payments</p>
              <p className="text-sm text-gray-500 mb-4">
                Click below to view the full non-member payments records:
              </p>
              <a 
                href="/finance/non-member-payments"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Go to Non-Member Payments
              </a>
            </div>
          </div>
        )}

        {/* Collected Payments from Treasurer */}
        {financeActiveTab === 'payments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#D62828]">
              📦 Collected Payments from Treasurer ({filteredPayments.length})
            </h2>
            <div className="flex items-center gap-3">
              {selectedPayments.size > 0 && (
                <button
                  onClick={batchApprovePayments}
                  disabled={processing === 'batch'}
                  className="btn-primary flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {processing === 'batch' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Approve Selected ({selectedPayments.size})</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Payment Summary Stats */}
          {collectedPayments.length > 0 && (
            <div className="grid grid-cols-5 gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-xl font-bold text-[#003366]">{formatCurrency(totalCollectedAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">WeChat</p>
                <p className="text-xl font-bold text-emerald-600">{paymentBreakdown.wechat}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Alipay</p>
                <p className="text-xl font-bold text-blue-600">{paymentBreakdown.alipay}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Bank</p>
                <p className="text-xl font-bold text-indigo-600">{paymentBreakdown.bank}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Cash/Person</p>
                <p className="text-xl font-bold text-purple-600">{paymentBreakdown.cash}</p>
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          {collectedPayments.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700">Filter by Method:</span>
              <button
                onClick={() => {setPaymentMethodFilter('all'); setCurrentPage(1)}}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  paymentMethodFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({collectedPayments.length})
              </button>
              <button
                onClick={() => {setPaymentMethodFilter('wechat'); setCurrentPage(1)}}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  paymentMethodFilter === 'wechat'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                WeChat ({paymentBreakdown.wechat})
              </button>
              <button
                onClick={() => {setPaymentMethodFilter('alipay'); setCurrentPage(1)}}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  paymentMethodFilter === 'alipay'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Alipay ({paymentBreakdown.alipay})
              </button>
              <button
                onClick={() => {setPaymentMethodFilter('bank'); setCurrentPage(1)}}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  paymentMethodFilter === 'bank'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Bank ({paymentBreakdown.bank})
              </button>
              <button
                onClick={() => {setPaymentMethodFilter('cash'); setCurrentPage(1)}}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  paymentMethodFilter === 'cash'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cash ({paymentBreakdown.cash})
              </button>
            </div>
          )}

          {/* Receipt Number Search */}
          {collectedPayments.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <label className="text-sm font-medium text-gray-700">Search by Receipt # / Student:</label>
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={receiptSearchQuery}
                  onChange={(e) => {setReceiptSearchQuery(e.target.value); setCurrentPage(1)}}
                  placeholder="e.g., REC-2026-89112 or student name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {receiptSearchQuery && (
                  <button
                    onClick={() => {setReceiptSearchQuery(''); setCurrentPage(1)}}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {receiptSearchQuery && (
                <span className="text-sm text-gray-600">
                  {filteredPayments.length} result(s) found
                </span>
              )}
            </div>
          )}

          {collectedPayments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No payments awaiting approval</p>
              <p className="text-gray-500">Collected payments will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedPayments.size === getCurrentPagePayments().length && getCurrentPagePayments().length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collector</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collected</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Proof</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPagePayments().map((payment, index) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedPayments.has(payment.id)}
                            onChange={() => togglePaymentSelection(payment.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-gray-900">{payment.users?.full_name}</p>
                            <p className="text-sm text-gray-500">{payment.users?.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-[#003366]">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{payment.month} {payment.year}</p>
                            {payment.collection_notes && 
                             payment.collection_notes !== 'Cash payment received in person' && 
                             payment.collection_notes !== 'Verified by treasurer' && (
                              <p className="text-xs text-gray-500 mt-1">{payment.collection_notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <span className="text-sm text-gray-700 font-medium">
                              {payment.collector?.full_name 
                                ? payment.collector.full_name 
                                : (payment.collected_by 
                                    ? `Treasurer (ID: ${payment.collected_by.substring(0, 8)}...)`
                                    : 'System'
                                  )
                              }
                            </span>
                            <p className="text-xs text-gray-500">
                              {payment.collector?.email 
                                ? payment.collector.email 
                                : 'Treasurer Role'
                              }
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {payment.payment_source === 'cash' ? (
                            // For cash payments, show how treasurer collected it
                            <span 
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 capitalize cursor-help"
                              title="Payment collected in person by treasurer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Person
                            </span>
                          ) : (
                            // For digital payments, show what member used to pay
                            <span 
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 capitalize cursor-help"
                              title={`Digital payment via ${payment.payment_method}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              {payment.payment_method}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {formatDate(payment.collected_at)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {payment.proof_url ? (
                            <button
                              onClick={() => setViewImage(payment.proof_url)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No proof
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {rejectingId === payment.id ? (
                            <div className="space-y-2 min-w-[250px]">
                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                rows={2}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => rejectPayment(payment.id)}
                                  disabled={processing === payment.id}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                                >
                                  {processing === payment.id ? 'Processing...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(null)
                                    setRejectionReason('')
                                  }}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approvePayment(payment.id)}
                                disabled={processing === payment.id}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processing === payment.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Processing
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setRejectingId(payment.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {filteredPayments.length > 10 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalFilteredPages} • {filteredPayments.length} payment(s)
                      {paymentMethodFilter !== 'all' && ` (filtered by ${paymentMethodFilter})`}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalFilteredPages))}
                    disabled={currentPage === totalFilteredPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Pending Loans - Secretary Approved (payments tab) */}
        {financeActiveTab === 'payments' && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-[#D62828]">
            Pending Loans - Secretary Approved ({pendingLoans.length})
          </h2>
          {pendingLoans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending loans from Secretary</p>
          ) : (
            <div className="space-y-4">
              {pendingLoans.map(loan => (
                <div key={loan.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{loan.users?.full_name}</h3>
                      <span className="badge-secretary_approved">Secretary Approved</span>
                    </div>
                    <p className="text-sm text-gray-600">{loan.users?.email}</p>
                    <p className="text-xl font-bold text-[#003366] mt-2">
                      {formatCurrency(loan.amount)}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-sm text-gray-600">{loan.reason}</p>
                  </div>

                  {rejectingId === loan.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => rejectLoan(loan.id)}
                          disabled={processing === loan.id}
                          className="btn-primary text-sm"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null)
                            setRejectionReason('')
                          }}
                          className="text-sm px-4 py-2 border border-gray-300 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewLoanDetails(loan)}
                        className="px-4 py-2 bg-[#00205B] hover:bg-[#003d82] text-white rounded-lg flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => approveLoan(loan.id)}
                        disabled={processing === loan.id}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {processing === loan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve & Send to Treasurer</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingId(loan.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Loan Repayment Tracking */}
        {financeActiveTab === 'payments' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              💰 Loan Repayment Tracking
            </h2>
            <button
              onClick={() => {
                setShowRepaymentSection(!showRepaymentSection)
                if (!showRepaymentSection && loanRepayments.length === 0) {
                  fetchLoanRepayments(1, repaymentFilter)
                }
              }}
              className="btn-secondary text-sm px-4 py-2"
            >
              {showRepaymentSection ? 'Hide' : 'View Repayments'}
            </button>
          </div>

          {showRepaymentSection && (
            <>
              <div className="mb-4">
                <select
                  value={repaymentFilter}
                  onChange={(e) => {
                    setRepaymentFilter(e.target.value)
                    fetchLoanRepayments(1, e.target.value)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Loans</option>
                  <option value="disbursed">Currently Disbursed</option>
                  <option value="overdue">Overdue</option>
                  <option value="repaid">Fully Repaid</option>
                </select>
              </div>

              {loadingRepayments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#00205B]" />
                  <p className="text-sm text-gray-600 mt-2">Loading repayment data...</p>
                </div>
              ) : loanRepayments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No loan repayments found</p>
              ) : (
                <div className="space-y-3">
                  {loanRepayments.map((loan: any) => {
                    const repaymentPercentage = loan.repaymentPercentage || 0
                    
                    return (
                      <div
                        key={loan.id}
                        className={`border-2 rounded-lg p-4 ${
                          loan.is_overdue
                            ? 'border-red-200 bg-red-50'
                            : loan.repayment_status === 'completed'
                            ? 'border-green-200 bg-green-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold">{loan.users.full_name}</h3>
                              {loan.is_overdue && (
                                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                                  Overdue {loan.daysOverdue} days
                                </span>
                              )}
                              {loan.repayment_status === 'completed' && (
                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                  ✓ Fully Repaid
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{loan.users.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-600">Loan Amount</p>
                            <p className="font-bold text-gray-900">¥{parseFloat(loan.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total Repaid</p>
                            <p className="font-bold text-blue-600">¥{parseFloat(loan.total_repaid || '0').toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Remaining</p>
                            <p className="font-bold text-green-600">¥{parseFloat(loan.remaining_balance || '0').toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Interest Rate</p>
                            <p className="font-bold text-gray-900">{loan.interest_rate}%</p>
                          </div>
                        </div>

                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Repayment Progress</span>
                            <span className="text-xs font-bold text-gray-900">{repaymentPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                repaymentPercentage === 100
                                  ? 'bg-green-600'
                                  : repaymentPercentage >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-yellow-600'
                              }`}
                              style={{ width: `${repaymentPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div>
                            <span>Disbursed: {formatDate(loan.disbursed_at)}</span>
                            {loan.last_payment_date && (
                              <span className="ml-3">• Last Payment: {formatDate(loan.last_payment_date)}</span>
                            )}
                          </div>
                          {loan.daysSinceLastPayment !== null && (
                            <span className="text-gray-500">
                              {loan.daysSinceLastPayment} days since last payment
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* All Loans History - Including Disbursed */}
        {financeActiveTab === 'payments' && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-[#00205B]">
            All Loans History ({loans.length})
          </h2>
          {loans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No loan applications</p>
          ) : (
            <div className="space-y-4">
              {loans.map(loan => (
                <div key={loan.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{loan.users?.full_name}</h3>
                      <p className="text-sm text-gray-600">{loan.users?.email}</p>
                    </div>
                    <span className={`badge-${loan.status}`}>
                      {loan.status === 'secretary_approved' && 'Secretary Approved'}
                      {loan.status === 'finance_approved' && 'Finance Approved'}
                      {loan.status === 'disbursed' && '✅ Disbursed'}
                      {loan.status === 'finance_rejected' && 'Rejected'}
                      {loan.status === 'repaid' && 'Repaid'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="text-lg font-bold text-[#003366]">{formatCurrency(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Applied Date</p>
                      <p className="text-sm font-medium">{formatDate(loan.created_at)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => viewLoanDetails(loan)}
                    className="w-full px-4 py-2 bg-[#00205B] hover:bg-[#003d82] text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Recent Reports */}
        {financeActiveTab === 'payments' && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Financial Reports</h2>
          {recentReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reports generated yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Report Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Payments</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Generated</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map(report => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm capitalize">{report.report_type}</td>
                      <td className="py-3 px-4 text-sm font-medium">{report.report_period}</td>
                      <td className="py-3 px-4 text-sm text-green-600 font-medium">
                        {formatCurrency(report.total_revenue)}
                      </td>
                      <td className="py-3 px-4 text-sm">{report.total_payments}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(report.generated_at)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => downloadReport(report)}
                          className="btn-outline text-sm flex items-center space-x-1"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Image Modal */}
      {viewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <div className="max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={viewImage} 
              alt="Payment Proof" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Generate Financial Report</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="monthly">Monthly Report</option>
                  <option value="quarterly">Quarterly Report</option>
                  <option value="annual">Annual Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Period
                </label>
                {reportType === 'monthly' && (
                  <input
                    type="month"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                )}
                {reportType === 'quarterly' && (
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Quarter</option>
                    <option value={`${currentYear}-Q1`}>Q1 {currentYear}</option>
                    <option value={`${currentYear}-Q2`}>Q2 {currentYear}</option>
                    <option value={`${currentYear}-Q3`}>Q3 {currentYear}</option>
                    <option value={`${currentYear}-Q4`}>Q4 {currentYear}</option>
                  </select>
                )}
                {reportType === 'annual' && (
                  <input
                    type="number"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    placeholder={currentYear.toString()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Add any notes for this report..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className="btn-primary flex-1"
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportPeriod('')
                  setReportNotes('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Search Modal - Copy from Treasurer */}
      {showMemberSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Search className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Search Member Payment History</h2>
                    <p className="text-sm text-gray-600 mt-1">View complete payment records for any member</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMemberSearchModal(false)
                    setMemberSearchQuery('')
                    setSelectedMemberPayments([])
                    setSelectedMemberInfo(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={memberSearchQuery}
                    onChange={(e) => handleMemberSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchMemberPayments(memberSearchQuery)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                  />
                  
                  {showSuggestions && memberSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                      {memberSuggestions.map((user, index) => (
                        <button
                          key={index}
                          onClick={() => selectMemberFromSuggestion(user)}
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-semibold text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => searchMemberPayments(memberSearchQuery)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {selectedMemberInfo && selectedMemberPayments.length > 0 ? (
                <>
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-gray-200">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedMemberInfo.full_name}</h3>
                        <p className="text-gray-600 mt-1">{selectedMemberInfo.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-500 mb-2">Total Payments</p>
                        <p className="text-3xl font-extrabold text-blue-600">{selectedMemberPayments.length}</p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-500 mb-2">Total Amount</p>
                        <p className="text-3xl font-extrabold text-green-600">
                          ¥{selectedMemberPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-500 mb-2">Approved</p>
                        <p className="text-3xl font-extrabold text-emerald-600">
                          {selectedMemberPayments.filter(p => p.status === 'approved').length}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-500 mb-2">Pending</p>
                        <p className="text-3xl font-extrabold text-yellow-600">
                          {selectedMemberPayments.filter(p => p.status === 'pending').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Month</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Method</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Proof</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMemberPayments
                            .slice((memberSearchPage - 1) * memberSearchPerPage, memberSearchPage * memberSearchPerPage)
                            .map((payment) => (
                            <tr key={payment.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-6 text-sm text-gray-900">{formatDate(payment.created_at)}</td>
                              <td className="py-4 px-6 text-sm font-medium text-gray-900">{payment.month} {payment.year}</td>
                              <td className="py-4 px-6 text-sm font-bold text-green-600">¥{payment.amount}</td>
                              <td className="py-4 px-6">
                                <span className={`badge-${payment.status} text-xs px-3 py-1 rounded-full`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-600 capitalize">{payment.payment_method}</td>
                              <td className="py-4 px-6">
                                {payment.proof_url ? (
                                  <button
                                    onClick={() => setViewImage(payment.proof_url)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    View
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-sm">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedMemberPayments.length > memberSearchPerPage && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                          onClick={() => setMemberSearchPage(prev => Math.max(1, prev - 1))}
                          disabled={memberSearchPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm font-medium"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {memberSearchPage} of {Math.ceil(selectedMemberPayments.length / memberSearchPerPage)}
                        </span>
                        <button
                          onClick={() => setMemberSearchPage(prev => Math.min(Math.ceil(selectedMemberPayments.length / memberSearchPerPage), prev + 1))}
                          disabled={memberSearchPage === Math.ceil(selectedMemberPayments.length / memberSearchPerPage)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm font-medium"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">Search for a Member</p>
                  <p className="text-sm text-gray-500">Enter a student name or email to view their complete payment history</p>
                </div>
              )}
            </div>

            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowMemberSearchModal(false)
                  setMemberSearchQuery('')
                  setSelectedMemberPayments([])
                  setSelectedMemberInfo(null)
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Payment Records Modal */}
      {showMonthPaymentsModal && !selectedMonthData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Monthly Payment Records</h2>
                    <p className="text-sm text-gray-600 mt-1">Click on any month to view detailed payment records</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMonthPaymentsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => {
                  const monthPayments = payments.filter(p => p.month === month && p.year === new Date().getFullYear())
                  const totalAmount = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
                  
                  return (
                    <button
                      key={month}
                      onClick={() => viewMonthPayments(month, new Date().getFullYear())}
                      className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all text-left"
                    >
                      <p className="text-sm font-semibold text-gray-700 mb-2">{month}</p>
                      <p className="text-2xl font-bold text-indigo-600">{monthPayments.length}</p>
                      <p className="text-xs text-gray-500 mt-1">payments</p>
                      <p className="text-sm font-semibold text-green-600 mt-2">¥{totalAmount.toFixed(2)}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowMonthPaymentsModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Detail Modal */}
      {showMonthPaymentsModal && selectedMonthData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedMonthData.month} {selectedMonthData.year}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedMonthData.payments.length} payment(s) recorded</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMonthData(null)
                    setShowMonthPaymentsModal(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Student</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonthData.payments
                        .slice((monthPaymentsPage - 1) * monthPaymentsPerPage, monthPaymentsPage * monthPaymentsPerPage)
                        .map((payment) => (
                        <tr key={payment.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 text-sm text-gray-900">{formatDate(payment.created_at)}</td>
                          <td className="py-4 px-6 text-sm font-medium text-gray-900">{payment.users?.full_name}</td>
                          <td className="py-4 px-6 text-sm font-bold text-green-600">¥{payment.amount}</td>
                          <td className="py-4 px-6">
                            <span className={`badge-${payment.status} text-xs px-3 py-1 rounded-full`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600 capitalize">{payment.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedMonthData.payments.length > monthPaymentsPerPage && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setMonthPaymentsPage(prev => Math.max(1, prev - 1))}
                      disabled={monthPaymentsPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm font-medium"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {monthPaymentsPage} of {Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage)}
                    </span>
                    <button
                      onClick={() => setMonthPaymentsPage(prev => Math.min(Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage), prev + 1))}
                      disabled={monthPaymentsPage === Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage)}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors text-sm font-medium"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <button
                onClick={() => setSelectedMonthData(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                ← Back to Months
              </button>
              <button
                onClick={() => {
                  setSelectedMonthData(null)
                  setShowMonthPaymentsModal(false)
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Proposals Modals */}
      {financeShowProposalModal && financeSelectedProposalForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-gray-600 mb-4">Proposal: <span className="font-medium">{financeSelectedProposalForPayment.title}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (¥)</label>
                <input
                  type="number"
                  value={financePaymentForm.amount}
                  onChange={(e) => setFinancePaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={financePaymentForm.payment_method}
                  onChange={(e) => setFinancePaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={financePaymentForm.payment_reference}
                  onChange={(e) => setFinancePaymentForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Transaction ID, check number, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid To (Name)</label>
                <input
                  type="text"
                  value={financePaymentForm.paid_to_name}
                  onChange={(e) => setFinancePaymentForm(prev => ({ ...prev, paid_to_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Committee name or contact person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={financePaymentForm.notes}
                  onChange={(e) => setFinancePaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Additional payment notes"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setFinanceShowProposalModal(false)
                  setFinanceSelectedProposalForPayment(null)
                  setFinancePaymentForm({
                    proposal_id: '',
                    amount: '',
                    payment_method: 'bank_transfer',
                    payment_reference: '',
                    paid_to_name: '',
                    paid_to_account: '',
                    notes: ''
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={savePaymentRecord}
                className="btn-primary"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Reports & Analytics Modal */}
      {showFinancialReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Financial Reports & Analytics
              </h2>
              <button
                onClick={() => setShowFinancialReportsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setFinancialReportType('summary')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      financialReportType === 'summary'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Summary Report</div>
                    <div className="text-xs text-gray-600 mt-1">Executive overview with key metrics and trends</div>
                  </button>
                  <button
                    onClick={() => setFinancialReportType('detailed')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      financialReportType === 'detailed'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Detailed Report</div>
                    <div className="text-xs text-gray-600 mt-1">Comprehensive data with full transaction records</div>
                  </button>
                  <button
                    onClick={() => setFinancialReportType('analytics')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      financialReportType === 'analytics'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Analytics Report</div>
                    <div className="text-xs text-gray-600 mt-1">Advanced insights with statistical analysis</div>
                  </button>
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={financialReportDateRange.startDate}
                    onChange={(e) => setFinancialReportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={financialReportDateRange.endDate}
                    onChange={(e) => setFinancialReportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Report Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What's included in this report:
                </h3>
                {financialReportType === 'summary' && (
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Executive summary with key metrics</li>
                    <li>• Top performers analysis</li>
                    <li>• Period-based breakdown</li>
                  </ul>
                )}
                {financialReportType === 'detailed' && (
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• All summary report content</li>
                    <li>• Complete transaction records</li>
                    <li>• Individual payment details</li>
                  </ul>
                )}
                {financialReportType === 'analytics' && (
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• All detailed report content</li>
                    <li>• Statistical analysis and trends</li>
                    <li>• Performance metrics</li>
                    <li>• Insights and recommendations</li>
                  </ul>
                )}
              </div>

              {/* Export Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toast.info('Excel export will be implemented with treasurer report API')
                    }}
                    disabled={generatingReport}
                    className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as Excel
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toast.info('PDF export will be implemented with treasurer report API')
                    }}
                    disabled={generatingReport}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Export as PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowFinancialReportsModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Details Modal with Dues Eligibility Check */}
      {showLoanDetailsModal && selectedLoanDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#00205B]">Loan Application Details</h2>
                <button
                  onClick={() => {
                    setShowLoanDetailsModal(false)
                    setSelectedLoanDetails(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Applicant Information */}
                <div>
                  <h3 className="font-bold text-xl mb-4 text-[#00205B] border-b-2 border-[#00205B] pb-2">
                    Applicant Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Name</p>
                      <p className="font-semibold text-gray-900">{selectedLoanDetails.users?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Email</p>
                      <p className="font-semibold text-gray-900">{selectedLoanDetails.users?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Amount Requested</p>
                      <p className="font-bold text-2xl text-[#00205B]">¥{parseFloat(selectedLoanDetails.amount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Expected Repayment</p>
                      <p className="font-semibold text-gray-900">
                        {selectedLoanDetails.expected_repayment_date ? 
                          new Date(selectedLoanDetails.expected_repayment_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dues Eligibility Check */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-xl text-[#00205B]">
                      Dues Payment Eligibility
                    </h3>
                    
                    {/* Year Selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Year:</label>
                      <select
                        value={selectedDuesYear}
                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00205B]"
                        disabled={loadingDuesData}
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {loadingDuesData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-[#00205B]" />
                    </div>
                  ) : selectedLoanDetails.hasUnpaidDues ? (
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-bold text-red-800 mb-2">
                            ⚠️ DUES PAYMENT REQUIREMENT NOT MET
                          </h4>
                          <p className="text-sm text-red-700 mb-4">
                            This member has <span className="font-bold">{selectedLoanDetails.unpaidMonths?.length} unpaid month(s)</span> for {selectedLoanDetails.selectedYear || selectedDuesYear}.
                            Financial policy requires all monthly dues to be paid before loan approval.
                          </p>
                          
                          {/* Paid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✓ Paid Months ({selectedLoanDetails.paidMonthsCount || 0}) - Click to view payment history:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoanDetails.paidMonths?.map((month: string) => (
                                <button
                                  key={month}
                                  onClick={() => handleMonthClick(month, selectedLoanDetails.selectedYear || selectedDuesYear)}
                                  className="px-3 py-1.5 border-2 border-green-500 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 transition-all cursor-pointer"
                                  title={`Click to view ${month} ${selectedLoanDetails.selectedYear || selectedDuesYear} payment history`}
                                >
                                  {month}
                                </button>
                              ))}
                              {selectedLoanDetails.paidMonths?.length === 0 && (
                                <span className="text-sm text-gray-500 italic">No payments recorded</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Unpaid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✗ Unpaid Months ({selectedLoanDetails.unpaidMonths?.length || 0}):</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoanDetails.unpaidMonths?.map((month: string) => (
                                <span key={month} className="px-3 py-1.5 border-2 border-red-500 text-red-700 rounded-md text-sm font-medium">
                                  {month}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {/* Required Total */}
                          <div>
                            <p className="text-sm text-gray-700 font-medium mb-1">Required Total: <span className="text-lg font-bold text-gray-900">{selectedLoanDetails.requiredMonthsCount || 0}</span> months</p>
                            <p className="text-xs text-gray-600">
                              Member must pay all months from January to {
                                selectedLoanDetails.selectedYear === new Date().getFullYear() 
                                  ? new Date().toLocaleString('default', { month: 'long' })
                                  : 'December'
                              } for {selectedLoanDetails.selectedYear || selectedDuesYear}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-bold text-green-800 mb-2">
                            ✓ DUES PAYMENT REQUIREMENT MET
                          </h4>
                          <p className="text-sm text-green-700 mb-4">
                            This member has paid all required monthly dues for {selectedLoanDetails.selectedYear || selectedDuesYear}.
                            Financial eligibility requirements are satisfied.
                          </p>
                          
                          {/* Paid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✓ Paid Months ({selectedLoanDetails.paidMonthsCount || 0}) - Click to view payment history:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoanDetails.paidMonths?.map((month: string) => (
                                <button
                                  key={month}
                                  onClick={() => handleMonthClick(month, selectedLoanDetails.selectedYear || selectedDuesYear)}
                                  className="px-3 py-1.5 border-2 border-green-500 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 transition-all cursor-pointer"
                                  title={`Click to view ${month} ${selectedLoanDetails.selectedYear || selectedDuesYear} payment history`}
                                >
                                  {month}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Required Total */}
                          <div>
                            <p className="text-sm text-gray-700 font-medium mb-1">Required Total: <span className="text-lg font-bold text-gray-900">{selectedLoanDetails.requiredMonthsCount || 0}</span> months</p>
                            <p className="text-xs text-gray-600">
                              Member must pay all months from January to {
                                selectedLoanDetails.selectedYear === new Date().getFullYear() 
                                  ? new Date().toLocaleString('default', { month: 'long' })
                                  : 'December'
                              } for {selectedLoanDetails.selectedYear || selectedDuesYear}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loan Purpose */}
                <div>
                  <h3 className="font-bold text-xl mb-4 text-[#00205B] border-b-2 border-[#00205B] pb-2">
                    Loan Purpose
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">{selectedLoanDetails.reason}</p>
                  </div>
                </div>

                {/* Disbursement Information - Finance View (WITH Proof Access) */}
                {selectedLoanDetails.status === 'disbursed' && (
                  <div className="border-t pt-4">
                    <h3 className="font-bold text-xl mb-4 text-[#00205B] border-b-2 border-[#00205B] pb-2 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Disbursement Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Disbursement Method</p>
                          <p className="font-semibold text-gray-900">
                            {selectedLoanDetails.disbursement_method === 'bank_transfer' && '🏦 Bank Transfer'}
                            {selectedLoanDetails.disbursement_method === 'cash' && '💵 Cash'}
                            {selectedLoanDetails.disbursement_method === 'wechat' && '💚 WeChat Pay'}
                            {selectedLoanDetails.disbursement_method === 'alipay' && '💙 Alipay'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Disbursement Date</p>
                          <p className="font-semibold text-gray-900">
                            {selectedLoanDetails.disbursed_at ? new Date(selectedLoanDetails.disbursed_at).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Disbursed By</p>
                          <p className="font-semibold text-gray-900">Treasurer</p>
                        </div>
                      </div>
                      
                      {selectedLoanDetails.disbursement_notes && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Disbursement Notes</p>
                          <p className="text-sm text-gray-800">
                            {selectedLoanDetails.disbursement_notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <p className="text-xs text-green-700 italic flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Loan successfully disbursed
                        </p>
                        {selectedLoanDetails.disbursement_proof_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewImage(selectedLoanDetails.disbursement_proof_url)
                            }}
                            className="bg-[#00205B] hover:bg-[#003d82] text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Disbursement Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowLoanDetailsModal(false)
                      approveLoan(selectedLoanDetails.id)
                    }}
                    disabled={processing === selectedLoanDetails.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {processing === selectedLoanDetails.id ? 'Processing...' : 'Approve & Send to Treasurer'}
                  </button>
                  <button
                    onClick={() => {
                      setShowLoanDetailsModal(false)
                      setRejectingId(selectedLoanDetails.id)
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setShowLoanDetailsModal(false)
                      setSelectedLoanDetails(null)
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
