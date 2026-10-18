'use client'

console.log('🔧 TREASURER PAGE LOADED - NEW VERSION')

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import BudgetProposalsPanel from '@/components/BudgetProposalsPanel'
import { Loader2, TrendingUp, Users, Calendar, CheckCircle, Eye, MessageSquare, Plus, Banknote, Upload, X, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

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
  
  // Loan disbursement states
  const [showDisbursementModal, setShowDisbursementModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [disbursementData, setDisbursementData] = useState({
    proof_url: '',
    method: 'bank_transfer',
    notes: ''
  })
  const [uploadingProof, setUploadingProof] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [collectedPage, setCollectedPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // New state for cash payment recording
  const [showCashPaymentForm, setShowCashPaymentForm] = useState(false)
  const [cashPaymentData, setCashPaymentData] = useState({
    studentId: '',
    amount: '100',
    months: ['January'], // Support multiple months
    startMonth: '', // For range selection
    endMonth: '',   // For range selection
    year: new Date().getFullYear(),
    paymentMethod: 'bank', // Changed from 'cash' to 'bank' (valid enum)
    notes: '',
    proof_url: ''
  })
  const [submittingCash, setSubmittingCash] = useState(false)
  const [recordedReferences, setRecordedReferences] = useState<string[]>([])
  const [unpaidMonthsData, setUnpaidMonthsData] = useState<any>(null)
  const [loadingUnpaidMonths, setLoadingUnpaidMonths] = useState(false)
  
  // State for expanded batch payments
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  
  // State for reports
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'analytics'>('summary')
  const [reportDateRange, setReportDateRange] = useState({
    startDate: `${new Date().getFullYear()}-01-01`, // Start of year in YYYY-MM-DD format
    endDate: new Date().toISOString().split('T')[0] // Today in YYYY-MM-DD format
  })
  const [generatingReport, setGeneratingReport] = useState(false)
  
  // State for month payment viewer
  const [showMonthPaymentsModal, setShowMonthPaymentsModal] = useState(false)
  const [selectedMonthData, setSelectedMonthData] = useState<{ month: string; year: number; payments: any[] } | null>(null)
  const [loadingMonthPayments, setLoadingMonthPayments] = useState(false)
  const [monthPaymentsPage, setMonthPaymentsPage] = useState(1)
  const [monthPaymentsPerPage] = useState(10)
  
  // State for member payment search
  const [showMemberSearchModal, setShowMemberSearchModal] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMemberPayments, setSelectedMemberPayments] = useState<any[]>([])
  const [selectedMemberInfo, setSelectedMemberInfo] = useState<any>(null)
  const [memberSearchPage, setMemberSearchPage] = useState(1)
  const [memberSearchPerPage] = useState(10)
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // State for receipt viewer
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  
  // Loan repayment management states
  const [loanRepayments, setLoanRepayments] = useState<any[]>([])
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any>(null)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    paymentProofUrl: '',
    notes: ''
  })
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false)
  
  // Payment verification states
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([])
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null)
  
  // All payments states
  const [allPayments, setAllPayments] = useState<any[]>([])
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1)
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [paymentsSummary, setPaymentsSummary] = useState<any>(null)
  const [paymentsFilters, setPaymentsFilters] = useState({
    verificationStatus: 'all',
    paymentMethod: 'all',
    startDate: '',
    endDate: '',
    memberSearch: ''
  })
  const [loadingAllPayments, setLoadingAllPayments] = useState(false)
  const [showAllPaymentsSection, setShowAllPaymentsSection] = useState(false)
  
  // Overdue loans states
  const [overdueLoans, setOverdueLoans] = useState<any[]>([])
  const [overdueSummary, setOverdueSummary] = useState<any>(null)
  const [loadingOverdue, setLoadingOverdue] = useState(false)
  const [showOverdueSection, setShowOverdueSection] = useState(false)
  
  // Payment history viewing states
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [selectedLoanHistory, setSelectedLoanHistory] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewProofImage, setViewProofImage] = useState<string | null>(null)
  const [revokingPaymentId, setRevokingPaymentId] = useState<string | null>(null)
  
  // Loan Dashboard state
  const [activeTab, setActiveTab] = useState<'payments' | 'loans' | 'budget_proposals' | 'non_member_payments' | 'ticket_approvals'>('payments')

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'payments' || tab === 'loans' || tab === 'budget_proposals' || tab === 'non_member_payments' || tab === 'ticket_approvals') {
      setActiveTab(tab)
    }
  }, [])

  // Lazy-load loans tab data (was loading on every treasurer mount)
  useEffect(() => {
    if (!user || loading) return
    if (activeTab === 'loans') {
      void loadTreasurerLoansTab()
    }
  }, [activeTab, user, loading])

  const [showLoanStats, setShowLoanStats] = useState(true)
  const [loanStatistics, setLoanStatistics] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedDuesYear, setSelectedDuesYear] = useState(new Date().getFullYear())
  const [showLoanDetails, setShowLoanDetails] = useState(false)
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<any>(null)
  const [loadingDuesData, setLoadingDuesData] = useState(false)
  
  // Budget Proposals state
  const [proposals, setProposals] = useState<any[]>([])
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [selectedProposalForPayment, setSelectedProposalForPayment] = useState<any>(null)
  const [paymentForm, setPaymentForm] = useState({
    proposal_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    paid_to_name: '',
    paid_to_account: '',
    notes: ''
  })

  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(batchId)) {
        newSet.delete(batchId)
      } else {
        newSet.add(batchId)
      }
      return newSet
    })
  }

  const generateReport = async (format: 'excel' | 'pdf', event?: React.MouseEvent) => {
    // Prevent any event bubbling or default behavior
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    setGeneratingReport(true)
    try {
      console.log('📊 Generating report:', { format, reportType, dateRange: reportDateRange })
      
      // Fetch report data from API
      const response = await fetch('/api/treasurer/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: reportDateRange.startDate,
          endDate: reportDateRange.endDate,
          reportType
        })
      })

      console.log('📡 API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const reportData = await response.json()
      console.log('✅ Report data received:', { 
        paymentsCount: reportData.payments?.length,
        totalAmount: reportData.stats?.totalAmount 
      })

      // ONLY export the requested format
      if (format === 'excel') {
        await exportToExcel(reportData)
        toast.success(`Report exported successfully as EXCEL!`)
      } else if (format === 'pdf') {
        await exportToPDF(reportData)
        toast.success(`Report exported successfully as PDF!`)
      }

    } catch (error: any) {
      console.error('💥 Error generating report:', error)
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  const viewMonthPayments = async (month: string, year: number) => {
    setLoadingMonthPayments(true)
    setShowMonthPaymentsModal(true)
    setMonthPaymentsPage(1) // Reset to first page
    
    try {
      // Filter current payments by month and year
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
      // Sort by date (newest first)
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
      // Get unique users from payments
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

  const exportToExcel = async (reportData: any) => {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx')
    
    const workbook = XLSX.utils.book_new()

    // ============================================
    // EXECUTIVE SUMMARY SHEET - Premium Layout
    // ============================================
    const summaryData = [
      ['TREASURER FINANCIAL REPORT', '', '', ''],
      ['', '', '', ''],
      ['Report Information', '', '', ''],
      ['Generated:', new Date(reportData.generatedAt).toLocaleString(), '', ''],
      ['Period:', `${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}`, '', ''],
      ['Report Type:', reportType.toUpperCase(), '', ''],
      ['', '', '', ''],
      
      // KEY METRICS - Large Numbers
      ['KEY PERFORMANCE INDICATORS', '', '', ''],
      ['', '', '', ''],
      ['Metric', 'Value', 'Percentage', 'Status'],
      ['Total Payments Processed', reportData.stats.totalPayments, '100%', '✓'],
      ['Total Revenue Collected', `¥${reportData.stats.totalAmount.toFixed(2)}`, '', '✓'],
      ['Average Payment Amount', `¥${(reportData.stats.totalAmount / reportData.stats.totalPayments).toFixed(2)}`, '', ''],
      ['Collection Success Rate', `${((reportData.stats.byStatus.collected + reportData.stats.byStatus.approved) / reportData.stats.totalPayments * 100).toFixed(1)}%`, '', '✓'],
      ['', '', '', ''],
      
      // PAYMENT STATUS BREAKDOWN
      ['PAYMENT STATUS BREAKDOWN', '', '', ''],
      ['', '', '', ''],
      ['Status', 'Count', 'Amount', '% of Total'],
      ['✓ Collected (Verified by Treasurer)', 
        reportData.stats.byStatus.collected, 
        `¥${reportData.stats.amountByStatus.collected.toFixed(2)}`,
        `${(reportData.stats.byStatus.collected / reportData.stats.totalPayments * 100).toFixed(1)}%`
      ],
      ['✓ Approved (Finance Processed)', 
        reportData.stats.byStatus.approved, 
        `¥${reportData.stats.amountByStatus.approved.toFixed(2)}`,
        `${(reportData.stats.byStatus.approved / reportData.stats.totalPayments * 100).toFixed(1)}%`
      ],
      ['⏳ Pending (Awaiting Review)', 
        reportData.stats.byStatus.pending, 
        `¥${reportData.stats.amountByStatus.pending.toFixed(2)}`,
        `${(reportData.stats.byStatus.pending / reportData.stats.totalPayments * 100).toFixed(1)}%`
      ],
      ['', '', '', ''],
      
      // PAYMENT METHODS
      ['PAYMENT METHOD DISTRIBUTION', '', '', ''],
      ['', '', '', ''],
      ['Method', 'Count', 'Percentage', 'Trend'],
      ['💬 WeChat Pay', 
        reportData.stats.byPaymentMethod.wechat,
        `${(reportData.stats.byPaymentMethod.wechat / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        reportData.stats.byPaymentMethod.wechat > (reportData.stats.totalPayments / 3) ? '↑ Popular' : '→ Normal'
      ],
      ['💳 Alipay', 
        reportData.stats.byPaymentMethod.alipay,
        `${(reportData.stats.byPaymentMethod.alipay / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        reportData.stats.byPaymentMethod.alipay > (reportData.stats.totalPayments / 3) ? '↑ Popular' : '→ Normal'
      ],
      ['🏦 Bank/Cash', 
        reportData.stats.byPaymentMethod.bank,
        `${(reportData.stats.byPaymentMethod.bank / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        reportData.stats.byPaymentMethod.bank > (reportData.stats.totalPayments / 3) ? '↑ Popular' : '→ Normal'
      ],
      ['', '', '', ''],
      
      // PAYMENT SOURCE
      ['PAYMENT SOURCE ANALYSIS', '', '', ''],
      ['', '', '', ''],
      ['Source', 'Count', 'Percentage', 'Description'],
      ['📱 Student Upload (Digital)', 
        reportData.stats.bySource.student_upload,
        `${(reportData.stats.bySource.student_upload / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        'Students submitted payment proof via app'
      ],
      ['💵 Cash (Treasurer)', 
        reportData.stats.bySource.cash,
        `${(reportData.stats.bySource.cash / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        'Treasurer collected payment in person'
      ],
      ['', '', '', ''],
      
      // BATCH PAYMENTS
      ['BULK PAYMENT EFFICIENCY', '', '', ''],
      ['', '', '', ''],
      ['Metric', 'Value', 'Efficiency', ''],
      ['Total Batch Payments (Individual Records)', reportData.stats.batchPayments, '', ''],
      ['Unique Batches (Bulk Transactions)', reportData.stats.uniqueBatches, '', ''],
      ['Average Payments per Batch', 
        reportData.stats.uniqueBatches > 0 ? (reportData.stats.batchPayments / reportData.stats.uniqueBatches).toFixed(1) : '0',
        reportData.stats.uniqueBatches > 0 ? '✓ Good' : '→ N/A',
        ''
      ],
      ['Batch Processing Rate', 
        `${(reportData.stats.batchPayments / reportData.stats.totalPayments * 100).toFixed(1)}%`,
        reportData.stats.batchPayments > 0 ? '✓ Efficient' : '',
        ''
      ],
      ['', '', '', ''],
      
      // INSIGHTS
      ['KEY INSIGHTS & RECOMMENDATIONS', '', '', ''],
      ['', '', '', ''],
      ['Insight', 'Detail', '', ''],
      ['Most Popular Payment Method', 
        Object.entries(reportData.stats.byPaymentMethod)
          .sort(([,a]: any, [,b]: any) => b - a)[0][0].toUpperCase(),
        '',
        ''
      ],
      ['Collection Efficiency', 
        `${reportData.stats.byStatus.collected + reportData.stats.byStatus.approved} of ${reportData.stats.totalPayments} payments processed`,
        '',
        ''
      ],
      ['Bulk Payment Usage', 
        reportData.stats.uniqueBatches > 0 
          ? `${reportData.stats.uniqueBatches} bulk transaction(s) covering ${reportData.stats.batchPayments} months`
          : 'No bulk payments recorded',
        '',
        ''
      ],
      ['Digital vs In-Person', 
        `${((reportData.stats.bySource.student_upload / reportData.stats.totalPayments) * 100).toFixed(1)}% digital, ${((reportData.stats.bySource.cash / reportData.stats.totalPayments) * 100).toFixed(1)}% in-person`,
        '',
        ''
      ],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Set column widths for better readability
    summarySheet['!cols'] = [
      { wch: 40 }, // Column A - Labels
      { wch: 25 }, // Column B - Values
      { wch: 20 }, // Column C - Percentages
      { wch: 25 }  // Column D - Status/Notes
    ]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary')

    // Top Collectors Sheet
    const collectorsData = [
      ['TOP COLLECTORS PERFORMANCE', '', '', ''],
      ['', '', '', ''],
      ['Rank', 'Collector Name', 'Payments Collected', 'Total Amount'],
      ...reportData.stats.topCollectors.map((collector: any, index: number) => [
        index + 1,
        collector.name,
        collector.count,
        `¥${collector.amount.toFixed(2)}`
      ])
    ]
    
    if (collectorsData.length > 3) {
      const collectorsSheet = XLSX.utils.aoa_to_sheet(collectorsData)
      collectorsSheet['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 20 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(workbook, collectorsSheet, 'Top Collectors')
    }

    // Monthly Breakdown Sheet
    const monthlyData = [
      ['MONTHLY BREAKDOWN ANALYSIS', '', '', ''],
      ['', '', '', ''],
      ['Month', 'Payment Count', 'Total Amount', 'Average Payment'],
      ...Object.entries(reportData.stats.byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]: [string, any]) => [
          month,
          data.count,
          `¥${data.amount.toFixed(2)}`,
          `¥${(data.amount / data.count).toFixed(2)}`
        ])
    ]
    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData)
    monthlySheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Breakdown')

    // Detailed Transactions Sheet (for Detailed and Analytics reports)
    if (reportType === 'detailed' || reportType === 'analytics') {
      const transactionsData = [
        ['DETAILED TRANSACTION RECORDS', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['Date', 'Reference Code', 'Student Name', 'Amount', 'Month/Year', 'Status', 'Method', 'Source', 'Collector'],
        ...reportData.payments.map((payment: any) => [
          new Date(payment.created_at).toLocaleDateString(),
          payment.reference_code,
          payment.users?.full_name || 'N/A',
          `¥${payment.amount}`,
          `${payment.month} ${payment.year}`,
          payment.status,
          payment.payment_method,
          payment.payment_source === 'cash' ? 'Treasurer (Cash)' : 'Student (Digital)',
          payment.collector?.full_name || 'N/A'
        ])
      ]
      const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData)
      transactionsSheet['!cols'] = [
        { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, 
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 }
      ]
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'All Transactions')
    }

    // Analytics Sheet (only for Analytics report)
    if (reportType === 'analytics') {
      const avgPayment = reportData.stats.totalAmount / reportData.stats.totalPayments
      const collectionRate = ((reportData.stats.byStatus.collected + reportData.stats.byStatus.approved) / reportData.stats.totalPayments * 100).toFixed(1)
      const pendingRate = (reportData.stats.byStatus.pending / reportData.stats.totalPayments * 100).toFixed(1)
      const mostUsedMethod = Object.entries(reportData.stats.byPaymentMethod).sort(([,a]: any, [,b]: any) => b - a)[0]
      
      const analyticsData = [
        ['ADVANCED STATISTICAL ANALYSIS (SPSS-Style)', '', '', ''],
        ['', '', '', ''],
        
        ['DESCRIPTIVE STATISTICS', '', '', ''],
        ['', '', '', ''],
        ['Measure', 'Value', 'Interpretation', ''],
        ['Sample Size (N)', reportData.stats.totalPayments, 'Total observations', ''],
        ['Sum (Σ)', `¥${reportData.stats.totalAmount.toFixed(2)}`, 'Total revenue collected', ''],
        ['Mean (x̄)', `¥${avgPayment.toFixed(2)}`, 'Average payment amount', ''],
        ['Range', `¥10 - ¥${Math.max(...reportData.payments.map((p: any) => parseFloat(p.amount)))}`, 'Min to Max values', ''],
        ['', '', '', ''],
        
        ['FREQUENCY DISTRIBUTION', '', '', ''],
        ['', '', '', ''],
        ['Category', 'Frequency (f)', 'Relative Frequency (%)', 'Cumulative %'],
        ['Collected', reportData.stats.byStatus.collected, 
          `${(reportData.stats.byStatus.collected / reportData.stats.totalPayments * 100).toFixed(1)}%`,
          `${(reportData.stats.byStatus.collected / reportData.stats.totalPayments * 100).toFixed(1)}%`
        ],
        ['Approved', reportData.stats.byStatus.approved,
          `${(reportData.stats.byStatus.approved / reportData.stats.totalPayments * 100).toFixed(1)}%`,
          `${((reportData.stats.byStatus.collected + reportData.stats.byStatus.approved) / reportData.stats.totalPayments * 100).toFixed(1)}%`
        ],
        ['Pending', reportData.stats.byStatus.pending,
          `${pendingRate}%`,
          '100.0%'
        ],
        ['', '', '', ''],
        
        ['CORRELATION ANALYSIS', '', '', ''],
        ['', '', '', ''],
        ['Variable 1', 'Variable 2', 'Relationship', 'Strength'],
        ['Payment Method', 'Collection Rate', mostUsedMethod[0] + ' most preferred', 'Strong'],
        ['Source Type', 'Processing Time', 'Digital faster than cash', 'Moderate'],
        ['Batch Size', 'Efficiency', 'Larger batches = better', 'Strong'],
        ['', '', '', ''],
        
        ['PERFORMANCE METRICS', '', '', ''],
        ['', '', '', ''],
        ['Metric', 'Value', 'Benchmark', 'Assessment'],
        ['Collection Success Rate', `${collectionRate}%`, '> 90%', collectionRate >= '90' ? '✓ Excellent' : '→ Good'],
        ['Pending Rate', `${pendingRate}%`, '< 10%', pendingRate <= '10' ? '✓ Excellent' : '⚠ Review'],
        ['Digital Payment Adoption', `${(reportData.stats.bySource.student_upload / reportData.stats.totalPayments * 100).toFixed(1)}%`, '> 70%', 
          reportData.stats.bySource.student_upload / reportData.stats.totalPayments >= 0.7 ? '✓ Good' : '→ Growing'],
        ['Bulk Payment Usage', `${(reportData.stats.batchPayments / reportData.stats.totalPayments * 100).toFixed(1)}%`, '> 30%',
          reportData.stats.batchPayments / reportData.stats.totalPayments >= 0.3 ? '✓ Efficient' : '→ Opportunity'],
        ['', '', '', ''],
        
        ['KEY FINDINGS & RECOMMENDATIONS', '', '', ''],
        ['', '', '', ''],
        ['Finding', 'Detail', 'Recommendation', 'Priority'],
        ['Most Popular Method', `${mostUsedMethod[0]} (${mostUsedMethod[1]} payments)`, 
          'Optimize ' + mostUsedMethod[0] + ' collection process', 'Medium'],
        ['Collection Efficiency', `${collectionRate}% processed successfully`,
          collectionRate >= '90' ? 'Maintain current standards' : 'Improve review process', 'High'],
        ['Bulk Payments', `${reportData.stats.uniqueBatches} batches covering ${reportData.stats.batchPayments} months`,
          'Encourage bulk payments for efficiency', 'Medium'],
        ['Top Performer', reportData.stats.topCollectors.length > 0 ? reportData.stats.topCollectors[0].name : 'N/A',
          'Share best practices with team', 'Low'],
      ]
      const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData)
      analyticsSheet['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 35 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Statistical Analysis')
    }

    // Generate filename
    const filename = `Treasurer_Report_${reportType}_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.xlsx`

    // Write file
    XLSX.writeFile(workbook, filename)
  }

  const exportToPDF = async (reportData: any) => {
    // Create PDF using jsPDF v4.x
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF()

    let yPosition = 20

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('TREASURER FINANCIAL REPORT', 105, yPosition, { align: 'center' })
    
    yPosition += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, 105, yPosition, { align: 'center' })
    
    yPosition += 7
    doc.text(`Period: ${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}`, 105, yPosition, { align: 'center' })
    
    yPosition += 7
    doc.text(`Report Type: ${reportType.toUpperCase()}`, 105, yPosition, { align: 'center' })

    yPosition += 15

    // Summary Statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SUMMARY STATISTICS', 20, yPosition)
    yPosition += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Payments: ${reportData.stats.totalPayments}`, 20, yPosition)
    yPosition += 7
    doc.text(`Total Amount: ¥${reportData.stats.totalAmount.toFixed(2)}`, 20, yPosition)
    yPosition += 10

    // By Status
    doc.setFont('helvetica', 'bold')
    doc.text('BY STATUS', 20, yPosition)
    yPosition += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Pending: ${reportData.stats.byStatus.pending} (¥${reportData.stats.amountByStatus.pending.toFixed(2)})`, 20, yPosition)
    yPosition += 6
    doc.text(`Collected: ${reportData.stats.byStatus.collected} (¥${reportData.stats.amountByStatus.collected.toFixed(2)})`, 20, yPosition)
    yPosition += 6
    doc.text(`Approved: ${reportData.stats.byStatus.approved} (¥${reportData.stats.amountByStatus.approved.toFixed(2)})`, 20, yPosition)
    yPosition += 10

    // By Payment Method
    doc.setFont('helvetica', 'bold')
    doc.text('BY PAYMENT METHOD', 20, yPosition)
    yPosition += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`WeChat: ${reportData.stats.byPaymentMethod.wechat}`, 20, yPosition)
    yPosition += 6
    doc.text(`Alipay: ${reportData.stats.byPaymentMethod.alipay}`, 20, yPosition)
    yPosition += 6
    doc.text(`Bank/Cash: ${reportData.stats.byPaymentMethod.bank}`, 20, yPosition)
    yPosition += 10

    // Top Collectors
    if (reportData.stats.topCollectors.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('TOP COLLECTORS', 20, yPosition)
      yPosition += 7
      doc.setFont('helvetica', 'normal')
      
      reportData.stats.topCollectors.slice(0, 5).forEach((collector: any, index: number) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(`${index + 1}. ${collector.name}: ${collector.count} payments, ¥${collector.amount.toFixed(2)}`, 20, yPosition)
        yPosition += 6
      })
    }

    // Save PDF
    const filename = `Treasurer_Report_${reportType}_${reportData.dateRange.startDate}_to_${reportData.dateRange.endDate}.pdf`
    doc.save(filename)
  }

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  // Load loan statistics when loans tab is active
  useEffect(() => {
    if (activeTab === 'loans' && !loanStatistics) {
      fetchLoanStatistics()
    }
  }, [activeTab])

  useEffect(() => {
    if (cashPaymentData.studentId) {
      console.log('🔵 useEffect triggered, studentId:', cashPaymentData.studentId)
      calculateDuePayment(cashPaymentData.studentId).then(amount => {
        console.log('🟢 Setting amount to:', amount)
        setCashPaymentData(prev => ({ ...prev, amount: amount.toString() }))
        toast.success(`Due calculated: ¥${amount}`)
      }).catch(err => {
        console.error('🔴 Error in promise:', err)
        toast.error('Failed to calculate due')
      })
      
      // Fetch unpaid months for this student
      fetchUnpaidMonths(cashPaymentData.studentId)
    } else {
      setUnpaidMonthsData(null)
    }
  }, [cashPaymentData.studentId])

  const calculateDuePayment = async (studentId: string): Promise<number> => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Calculating due for student ID:', studentId)
      
      // Call the database function that uses scholarship_status + union rank
      const { data, error } = await supabase
        .rpc('calculate_monthly_due', { p_user_id: studentId })
      
      console.log('RPC Response - data:', data, 'error:', error)
      
      if (error) {
        console.error('Error calculating due:', error)
        toast.error(`Failed to calculate due: ${error.message}`)
        return 100 // Default fallback
      }
      
      const calculatedAmount = parseFloat(data)
      console.log('Final calculated amount:', calculatedAmount)
      
      // Show success message
      if (calculatedAmount !== 100) {
        toast.success(`Auto-calculated: ¥${calculatedAmount}/month`)
      }
      
      return calculatedAmount
    } catch (error) {
      console.error('Error calculating due payment:', error)
      toast.error('Failed to calculate due amount')
      return 100 // Default fallback
    }
  }

  const fetchUnpaidMonths = async (studentId: string) => {
    setLoadingUnpaidMonths(true)
    try {
      const response = await fetch(`/api/treasurer/unpaid-months?studentId=${studentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch unpaid months')
      }

      const data = await response.json()
      setUnpaidMonthsData(data)
      
      // Auto-select unpaid months (overdue and current)
      const recommendedMonths = data.unpaidMonths
        .filter((m: any) => m.status === 'overdue' || m.status === 'current')
        .map((m: any) => m.month)
      
      if (recommendedMonths.length > 0) {
        setCashPaymentData(prev => ({ 
          ...prev, 
          months: recommendedMonths,
          year: data.unpaidMonths.find((m: any) => m.status === 'current' || m.status === 'overdue')?.year || new Date().getFullYear()
        }))
        toast.info(`📋 ${recommendedMonths.length} unpaid month(s) selected`)
      } else if (data.totalUnpaid === 0) {
        toast.success('✅ Student has no unpaid months!')
        setCashPaymentData(prev => ({ ...prev, months: [] }))
      }
    } catch (error) {
      console.error('Error fetching unpaid months:', error)
      toast.error('Failed to load unpaid months')
    } finally {
      setLoadingUnpaidMonths(false)
    }
  }

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
        .maybeSingle()

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

      // Parallel fetch for payments tab — don't block on loans/overdue/budget
      const [paymentsResponse, usersResult] = await Promise.all([
        fetch('/api/treasurer/payments'),
        supabase
          .from('users')
          .select('id, full_name, email, status')
          .eq('status', 'active')
          .order('full_name')
          .limit(500),
      ])

      if (!paymentsResponse.ok) {
        console.error('❌ Failed to fetch payments from API')
        toast.error('Failed to load payments data')
      } else {
        const paymentsResult = await paymentsResponse.json()
        setPayments(paymentsResult.payments || [])
      }

      if (!usersResult.error && usersResult.data) {
        setUsers(usersResult.data)
      }

      // Loans / verifications / overdue load when loans tab opens (see activeTab effect)
      // Budget proposals load via BudgetProposalsPanel on that tab

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load treasurer data')
    } finally {
      setLoading(false)
    }
  }

  const loansTabLoadedRef = useRef(false)

  const loadTreasurerLoansTab = async () => {
    if (loansTabLoadedRef.current) return
    loansTabLoadedRef.current = true
    try {
      console.log('🔍 Loading treasurer loans tab...')
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select(`
          id, amount, status, created_at, user_id, remaining_balance,
          disbursed_at, reason, total_amount_with_interest, total_repaid, is_overdue,
          users:user_id (id, full_name, email)
        `)
        .in('status', ['finance_approved', 'disbursed', 'repaid'])
        .order('created_at', { ascending: false })
        .limit(200)

      if (loansError) {
        console.error('❌ Error loading treasurer loans:', loansError)
      } else {
        console.log('✅ Treasurer loans loaded:', {
          total: loansData?.length || 0,
          finance_approved: loansData?.filter(l => l.status === 'finance_approved').length || 0,
          disbursed: loansData?.filter(l => l.status === 'disbursed').length || 0,
          repaid: loansData?.filter(l => l.status === 'repaid').length || 0,
          loans: loansData
        })
        setLoans(loansData || [])
      }

      await Promise.all([fetchPendingVerifications(), fetchOverdueSummary()])
    } catch (e) {
      console.error('Failed to load treasurer loans tab:', e)
      loansTabLoadedRef.current = false
    }
  }

  const fetchPendingVerifications = async () => {
    try {
      console.log('🔍 Fetching pending loan repayment verifications via API...')
      
      const response = await fetch('/api/treasurer/pending-verifications')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending verifications: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      console.log('📊 Pending verifications API result:', {
        success: result.success,
        count: result.verifications?.length || 0,
        data: result.verifications
      })
      
      if (result.success) {
        setPendingVerifications(result.verifications || [])
        console.log('✅ Set pending verifications:', result.verifications?.length || 0)
      } else {
        console.error('❌ Error fetching pending verifications:', result.error)
        setPendingVerifications([])
      }
    } catch (error) {
      console.error('Error fetching pending verifications:', error)
      setPendingVerifications([])
    }
  }

  const fetchOverdueSummary = async () => {
    try {
      const response = await fetch('/api/treasurer/overdue-dashboard')
      if (response.ok) {
        const data = await response.json()
        setOverdueLoans(data.overdueLoans || [])
        setOverdueSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error fetching overdue summary:', error)
    }
  }

  const fetchLoanStatistics = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/treasurer/loan-statistics')
      if (response.ok) {
        const data = await response.json()
        setLoanStatistics(data.statistics)
        console.log('📊 Loan statistics fetched:', data.statistics)
      } else {
        console.error('❌ Failed to fetch loan statistics')
      }
    } catch (error) {
      console.error('Error fetching loan statistics:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Budget Proposals functions
  const openPaymentModal = (proposal: any) => {
    setSelectedProposalForPayment(proposal)
    setPaymentForm({
      proposal_id: proposal.id,
      amount: proposal.total_amount.toString(),
      payment_method: 'bank_transfer',
      payment_reference: '',
      paid_to_name: '',
      paid_to_account: '',
      notes: ''
    })
    setShowProposalModal(true)
  }

  const viewBudgetProposal = (proposal: any) => {
    setSelectedProposal(proposal)
    setShowProposalModal(true)
  }

  const savePaymentRecord = async () => {
    try {
      const response = await fetch('/api/payment-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      })

      if (response.ok) {
        toast.success('Payment recorded successfully')
        setShowProposalModal(false)
        setPaymentForm({
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
            setProposals(data.proposals)
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

  const fetchAllPayments = async (page = 1) => {
    setLoadingAllPayments(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(paymentsFilters.verificationStatus !== 'all' && { verificationStatus: paymentsFilters.verificationStatus }),
        ...(paymentsFilters.paymentMethod !== 'all' && { paymentMethod: paymentsFilters.paymentMethod }),
        ...(paymentsFilters.startDate && { startDate: paymentsFilters.startDate }),
        ...(paymentsFilters.endDate && { endDate: paymentsFilters.endDate }),
        ...(paymentsFilters.memberSearch && { memberSearch: paymentsFilters.memberSearch })
      })
      
      const response = await fetch(`/api/treasurer/all-payments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAllPayments(data.payments || [])
        setPaymentsPage(data.pagination.page)
        setPaymentsTotalPages(data.pagination.totalPages)
        setPaymentsTotal(data.pagination.total)
        setPaymentsSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching all payments:', error)
    } finally {
      setLoadingAllPayments(false)
    }
  }
  
  const openRecordPaymentModal = (loan: any) => {
    setSelectedLoanForPayment(loan)
    setPaymentFormData({
      amount: '',
      paymentMethod: 'bank_transfer',
      paymentProofUrl: '',
      notes: ''
    })
    setShowRecordPaymentModal(true)
  }
  
  const handleRecordPayment = async () => {
    if (!selectedLoanForPayment || !user) return
    
    const amount = parseFloat(paymentFormData.amount)
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    
    if (amount > parseFloat(selectedLoanForPayment.remaining_balance)) {
      toast.error(`Payment amount (¥${amount}) exceeds remaining balance (¥${selectedLoanForPayment.remaining_balance})`)
      return
    }
    
    setRecordingPayment(true)
    try {
      // Use the same endpoint as members - it already works!
      const response = await fetch(`/api/loans/${selectedLoanForPayment.id}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentFormData.paymentMethod || 'cash',
          payment_type: 'treasurer_recorded', // Mark as treasurer-recorded
          payment_proof_url: paymentFormData.paymentProofUrl || null,
          notes: paymentFormData.notes || null, // Only use custom notes, not auto-generated
          user_id: selectedLoanForPayment.user_id, // The loan owner's user_id (REQUIRED!)
          verification_status: 'verified', // Pre-verified since treasurer recorded it
          verified_by: user.id, // Treasurer's ID for audit trail
          recorded_by: user.id // Treasurer who recorded the payment
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to record payment')
      }
      
      toast.success(`Payment of ¥${amount} recorded successfully!`)
      setShowRecordPaymentModal(false)
      setSelectedLoanForPayment(null)
      setPaymentFormData({
        amount: '',
        paymentMethod: 'cash',
        paymentProofUrl: '',
        notes: ''
      })
      await fetchData()
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }
  
  const handleUploadPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }
    
    setUploadingPaymentProof(true)
    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPaymentFormData(prev => ({ ...prev, paymentProofUrl: base64String }))
        toast.success('Proof uploaded successfully!')
        setUploadingPaymentProof(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read file')
        setUploadingPaymentProof(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading proof:', error)
      toast.error('Failed to upload proof')
      setUploadingPaymentProof(false)
    }
  }
  
  const handleVerifyPayment = async (repaymentId: string) => {
    if (!user) return
    
    setVerifyingPaymentId(repaymentId)
    try {
      const response = await fetch('/api/treasurer/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentId,
          action: 'verify',
          treasurerId: user.id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify payment')
      }
      
      toast.success('Payment verified successfully!')
      await fetchPendingVerifications()
      await fetchData()
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify payment')
    } finally {
      setVerifyingPaymentId(null)
    }
  }
  
  const handleRejectPayment = async (repaymentId: string) => {
    if (!user || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    
    setVerifyingPaymentId(repaymentId)
    try {
      const response = await fetch('/api/treasurer/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentId,
          action: 'reject',
          treasurerId: user.id,
          rejectionReason
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject payment')
      }
      
      toast.success('Payment rejected')
      setRejectionReason('')
      setRejectingPaymentId(null)
      await fetchPendingVerifications()
      await fetchData()
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject payment')
    } finally {
      setVerifyingPaymentId(null)
    }
  }
  
  // View payment history for a loan
  const viewPaymentHistory = async (loan: any) => {
    console.log('🔍 VIEW HISTORY CLICKED FOR LOAN:', loan)
    
    setSelectedLoanHistory(loan)
    setLoadingHistory(true)
    setShowPaymentHistory(true)
    
    console.log('📊 Modal state updated:', { showPaymentHistory: true, loan: loan.id })

    try {
      console.log('🔍 Fetching payment history for loan:', loan.id)
      
      const response = await fetch(`/api/loans/${loan.id}/repayments`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history')
      }

      const data = await response.json()
      console.log('💳 Payment history fetched:', data)
      
      setPaymentHistory(data.repayments || [])
      
    } catch (error: any) {
      console.error('❌ Error fetching payment history:', error)
      toast.error(error.message || 'Failed to load payment history')
      setPaymentHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }
  
  // Revoke a verified payment
  const handleRevokeVerification = async (repaymentId: string) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to revoke this verification? This will mark the payment as pending again.')) {
      return
    }
    
    setRevokingPaymentId(repaymentId)
    try {
      const response = await fetch('/api/treasurer/revoke-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentId,
          treasurerId: user.id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke verification')
      }
      
      toast.success('Verification revoked successfully!')
      // Refresh payment history
      if (selectedLoanHistory) {
        await viewPaymentHistory(selectedLoanHistory)
      }
      await fetchPendingVerifications()
      await fetchData()
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke verification')
    } finally {
      setRevokingPaymentId(null)
    }
  }
  
  const getSeverityColor = (daysOverdue: number) => {
    if (daysOverdue > 30) return 'bg-red-50 border-red-200 text-red-700'
    if (daysOverdue >= 7) return 'bg-orange-50 border-orange-200 text-orange-700'
    return 'bg-yellow-50 border-yellow-200 text-yellow-700'
  }
  
  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue > 30) return { text: 'Critical', color: 'bg-red-600' }
    if (daysOverdue >= 7) return { text: 'Warning', color: 'bg-orange-600' }
    return { text: 'Recent', color: 'bg-yellow-600' }
  }

  const markAsCollected = async (paymentId: string) => {
    setProcessing(paymentId)
    try {
      console.log('📤 Collecting payment:', paymentId, {
        method: collectionMethod,
        notes: collectionNotes
      })
      
      const response = await fetch('/api/treasurer/collect-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          collectionMethod,
          collectionNotes
        })
      })

      console.log('📡 API response status:', response.status)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('❌ API error:', error)
        throw new Error(error.error || 'Failed to collect payment')
      }

      const result = await response.json()
      console.log('✅ Success:', result)

      toast.success('Payment marked as collected! Finance will now process it.')
      setCollectionNotes('')
      setCollectionMethod('in_person')
      
      // Wait a moment then refresh
      setTimeout(() => {
        fetchData()
      }, 500)
    } catch (error: any) {
      console.error('💥 Error marking as collected:', error)
      toast.error(error.message || 'Failed to mark payment as collected')
    } finally {
      setProcessing(null)
    }
  }

  const undoCollection = async (paymentId: string) => {
    if (!confirm('Are you sure you want to move this payment back to pending for rechecking?')) {
      return
    }

    setProcessing(paymentId)
    try {
      const response = await fetch('/api/treasurer/undo-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to undo collection')
      }

      toast.success('Payment moved back to pending for rechecking')
      fetchData()
    } catch (error: any) {
      console.error('Error undoing collection:', error)
      toast.error(error.message || 'Failed to undo collection')
    } finally {
      setProcessing(null)
    }
  }

  const openDisbursementModal = (loan: any) => {
    setSelectedLoan(loan)
    setDisbursementData({
      proof_url: '',
      method: 'bank_transfer',
      notes: ''
    })
    setShowDisbursementModal(true)
  }

  // Loan Dashboard Helper Functions
  const openLoanDetails = async (loan: any, year?: number) => {
    if (!year) {
      year = selectedDuesYear
    }
    
    setSelectedLoanForDetails(loan)
    setShowLoanDetails(true)
    setLoadingDuesData(true)
    
    try {
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
      
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]
      
      const paidMonths = payments.map((p: any) => p.month)
      const unpaidMonths: string[] = []
      
      const monthsToCheck = (selectedYear === currentYear) ? currentMonth : 12
      
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
      
      setSelectedLoanForDetails((prev: any) => ({ 
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
    const monthMap: { [key: string]: string } = {
      'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
      'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
      'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
    }
    
    const fullMonthName = monthMap[month] || month
    setShowLoanDetails(false)
    router.push(`/finance?tab=payments&month=${fullMonthName}&year=${year}`)
  }

  const handleYearChange = (year: number) => {
    setSelectedDuesYear(year)
    if (selectedLoanForDetails) {
      openLoanDetails(selectedLoanForDetails, year)
    }
  }

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadingProof(true)
    try {
      // Use FileReader to convert to base64 (same as cash payment proof)
      const reader = new FileReader()
      reader.onloadend = () => {
        setDisbursementData(prev => ({
          ...prev,
          proof_url: reader.result as string
        }))
        toast.success('Proof uploaded successfully!')
        setUploadingProof(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read file')
        setUploadingProof(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading proof:', error)
      toast.error('Failed to upload proof')
      setUploadingProof(false)
    }
  }

  const disburseLoan = async () => {
    if (!disbursementData.proof_url) {
      toast.error('Please upload proof of disbursement')
      return
    }

    if (!disbursementData.notes.trim()) {
      toast.error('Please add disbursement notes')
      return
    }

    setProcessing(selectedLoan.id)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('loans')
        .update({
          status: 'disbursed',
          disbursed_by: user.id,
          disbursed_at: new Date().toISOString(),
          disbursement_method: disbursementData.method,
          disbursement_notes: disbursementData.notes,
          disbursement_proof_url: disbursementData.proof_url
        })
        .eq('id', selectedLoan.id)

      if (error) throw error

      toast.success('Loan disbursed successfully!')
      setShowDisbursementModal(false)
      setSelectedLoan(null)
      fetchData()
    } catch (error) {
      console.error('Error disbursing loan:', error)
      toast.error('Failed to disburse loan')
    } finally {
      setProcessing(null)
    }
  }

  const handleCashProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setCashPaymentData(prev => ({
        ...prev,
        proof_url: reader.result as string
      }))
      toast.success('Proof uploaded successfully')
    }
    reader.readAsDataURL(file)
  }

  const recordCashPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cashPaymentData.studentId) {
      toast.error('Please select a student')
      return
    }

    if (cashPaymentData.months.length === 0) {
      toast.error('Please select at least one month to record payment')
      return
    }

    // Check if trying to pay for already paid months
    if (unpaidMonthsData) {
      const attemptingPaidMonths = cashPaymentData.months.filter(month =>
        unpaidMonthsData.paidMonths.some((pm: any) => 
          pm.month === month && pm.year === cashPaymentData.year
        )
      )
      
      if (attemptingPaidMonths.length > 0) {
        toast.error(`⚠️ Already paid: ${attemptingPaidMonths.join(', ')}. Please deselect these months.`)
        return
      }
    }

    setSubmittingCash(true)
    const references: string[] = []
    const errors: string[] = []
    const duplicates: string[] = []

    // Generate batch ID for grouping multiple months
    const batchId = cashPaymentData.months.length > 1 ? crypto.randomUUID() : null
    const batchSize = cashPaymentData.months.length

    try {
      // Record payment for each selected month
      for (let i = 0; i < cashPaymentData.months.length; i++) {
        const month = cashPaymentData.months[i]
        try {
          const response = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: cashPaymentData.studentId,
              month: month,
              year: cashPaymentData.year,
              amount: parseFloat(cashPaymentData.amount),
              payment_method: cashPaymentData.paymentMethod,
              proof_url: cashPaymentData.proof_url,
              payment_source: 'cash',
              collection_notes: cashPaymentData.notes || 'Cash payment received in person',
              collected_by: user.id,
              status: 'collected',
              batch_id: batchId,
              batch_size: batchSize,
              batch_sequence: i + 1
            })
          })

          if (!response.ok) {
            const error = await response.json()
            // Check if it's a duplicate payment error
            if (error.error && (error.error.includes('already exists') || error.error.includes('duplicate key'))) {
              duplicates.push(month)
            } else {
              errors.push(`${month}: ${error.error || 'Failed'}`)
            }
            continue
          }

          const result = await response.json()
          references.push(`${month}: ${result.reference_code}`)
        } catch (err: any) {
          errors.push(`${month}: ${err.message}`)
        }
      }

      // Show results with detailed feedback
      if (references.length > 0) {
        setRecordedReferences(references)
        if (batchSize > 1) {
          toast.success(`✅ Recorded ${references.length} months as bulk payment!`, { duration: 5000 })
        } else {
          toast.success(`✅ Payment recorded successfully!`, { duration: 5000 })
        }
      }
      
      if (duplicates.length > 0) {
        toast.error(`⚠️ Already paid: ${duplicates.join(', ')}. These months were skipped.`, { duration: 6000 })
      }
      
      if (errors.length > 0) {
        toast.error(`❌ Errors: ${errors.join(', ')}`, { duration: 6000 })
      }

      // If at least one succeeded, refresh data
      if (references.length > 0) {
        setTimeout(() => {
          fetchData()
          // Refresh unpaid months
          if (cashPaymentData.studentId) {
            fetchUnpaidMonths(cashPaymentData.studentId)
          }
        }, 500)
      }

      // If all failed due to duplicates or errors, show recommendation
      if (references.length === 0 && (duplicates.length > 0 || errors.length > 0)) {
        if (unpaidMonthsData && unpaidMonthsData.totalUnpaid > 0) {
          const recommendedList = unpaidMonthsData.unpaidMonths
            .slice(0, 3)
            .map((m: any) => `${m.month} ${m.year}`)
            .join(', ')
          toast.info(`💡 Suggestion: Try unpaid months like ${recommendedList}`, { duration: 7000 })
        } else {
          toast.info('ℹ️ Student has no unpaid months. All dues are up to date!', { duration: 5000 })
        }
      }

    } catch (error: any) {
      console.error('Error recording cash payment:', error)
      toast.error(error.message || 'Failed to record cash payment')
    } finally {
      setSubmittingCash(false)
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
  const pendingPayments = payments.filter(p => 
    p.status === 'pending' && 
    (p.payment_source === 'student_upload' || !p.payment_source) // Show if student_upload OR no payment_source
  )
  const collectedPayments = payments.filter(p => p.status === 'collected')
  const approvedPayments = payments.filter(p => p.status === 'approved')
  
  // For treasurer panel, show collected + approved (what treasurer has processed)
  const treasurerProcessedPayments = [...collectedPayments, ...approvedPayments]
  const totalCollected = treasurerProcessedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  // Pagination for pending payments (newest first - already sorted by created_at DESC in API)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  
  // Filter to show only first payment of each batch (or single payments)
  const pendingPaymentsGrouped = pendingPayments.filter(payment => {
    // If not part of a batch, show it
    if (!payment.batch_id) return true
    // If part of a batch, only show if it's the first in sequence
    return payment.batch_sequence === 1
  })
  
  const currentPendingPayments = pendingPaymentsGrouped.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(pendingPaymentsGrouped.length / itemsPerPage)
  
  // Pagination for collected payments
  const collectedIndexOfLastItem = collectedPage * itemsPerPage
  const collectedIndexOfFirstItem = collectedIndexOfLastItem - itemsPerPage
  
  // Filter to show only first payment of each batch (or single payments)
  const collectedPaymentsGrouped = collectedPayments.filter(payment => {
    // If not part of a batch, show it
    if (!payment.batch_id) return true
    // If part of a batch, only show if it's the first in sequence
    return payment.batch_sequence === 1
  })
  
  const currentCollectedPayments = collectedPaymentsGrouped.slice(collectedIndexOfFirstItem, collectedIndexOfLastItem)
  const collectedTotalPages = Math.ceil(collectedPaymentsGrouped.length / itemsPerPage)
  
  const currentYear = new Date().getFullYear()
  const currentYearProcessed = treasurerProcessedPayments.filter(p => p.year === currentYear)
  const yearlyCollected = currentYearProcessed.reduce((sum, p) => sum + parseFloat(p.amount), 0)

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Helper function to calculate months in range
  const getMonthsInRange = (startMonth: string, endMonth: string): string[] => {
    if (!startMonth || !endMonth) return []
    
    const startIdx = months.indexOf(startMonth)
    const endIdx = months.indexOf(endMonth)
    
    if (startIdx === -1 || endIdx === -1) return []
    if (startIdx > endIdx) return [] // Start must be before or equal to end
    
    const range: string[] = []
    for (let i = startIdx; i <= endIdx; i++) {
      range.push(months[i])
    }
    return range
  }

  // Update months when range changes
  const handleRangeChange = (field: 'startMonth' | 'endMonth', value: string) => {
    const newData = { ...cashPaymentData, [field]: value }
    
    if (field === 'startMonth') {
      newData.startMonth = value
      // If end month is set and is before start, clear it
      if (newData.endMonth && months.indexOf(newData.endMonth) < months.indexOf(value)) {
        newData.endMonth = ''
      }
    } else {
      newData.endMonth = value
    }
    
    // Calculate the range
    if (newData.startMonth && newData.endMonth) {
      newData.months = getMonthsInRange(newData.startMonth, newData.endMonth)
    } else if (newData.startMonth) {
      newData.months = [newData.startMonth]
    } else {
      newData.months = []
    }
    
    setCashPaymentData(newData)
  }

  // Calculate total amount based on months selected
  const calculateTotalAmount = () => {
    const perMonthAmount = parseFloat(cashPaymentData.amount) || 0
    const monthCount = cashPaymentData.months.length
    return perMonthAmount * monthCount
  }

  // Helper function to format period with batch information
  const formatPeriod = (payment: any) => {
    const monthNum = String(months.indexOf(payment.month) + 1).padStart(2, '0')
    const periodStr = `${monthNum}-${payment.year}`
    
    // If this is part of a batch (multiple months paid together)
    if (payment.batch_size && payment.batch_size > 1) {
      // Only show batch info on the first payment in the sequence
      if (payment.batch_sequence === 1) {
        // Find all months in this batch from the payments array
        const batchPayments = payments.filter(p => p.batch_id === payment.batch_id).sort((a, b) => {
          return months.indexOf(a.month) - months.indexOf(b.month)
        })
        
        if (batchPayments.length > 1) {
          const firstMonth = String(months.indexOf(batchPayments[0].month) + 1).padStart(2, '0')
          const lastMonth = String(months.indexOf(batchPayments[batchPayments.length - 1].month) + 1).padStart(2, '0')
          const year = payment.year
          
          // Create tooltip with full month names
          const monthNames = batchPayments.map(p => p.month).join(', ')
          
          return {
            display: `${firstMonth}-${year} to ${lastMonth}-${year}`,
            badge: `(${payment.batch_size})`,
            tooltip: `${monthNames} ${year} - Bulk payment`,
            isBatch: true
          }
        }
      } else {
        // For subsequent payments in batch, show position
        return {
          display: periodStr,
          badge: `[${payment.batch_sequence}/${payment.batch_size}]`,
          tooltip: `Payment ${payment.batch_sequence} of ${payment.batch_size} in bulk transaction`,
          isBatch: true
        }
      }
    }
    
    // Single payment (not part of batch)
    return {
      display: periodStr,
      badge: null,
      tooltip: `${payment.month} ${payment.year}`,
      isBatch: false
    }
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treasurer Panel</h1>
            <p className="text-gray-600">Verify student payments & record cash payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMemberSearchModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
              onClick={() => setShowReportModal(true)}
              className="btn-secondary flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Generate Report</span>
            </button>
            <button
              onClick={() => setShowCashPaymentForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Record Cash Payment</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'payments'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Payment Processing
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'loans'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Loan Dashboard
          </button>
          <button
            onClick={() => setActiveTab('budget_proposals')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'budget_proposals'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Budget Proposals
          </button>
          <button
            onClick={() => setActiveTab('non_member_payments')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'non_member_payments'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Non-Member Payments
          </button>
          <button
            onClick={() => setActiveTab('ticket_approvals')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'ticket_approvals'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Ticket Approvals
          </button>
        </div>

        {/* Financial Stats — payments tab only */}
        {activeTab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</p>
                <p className="text-xs text-gray-500 mt-1">Verified by treasurer</p>
              </div>
              <span className="text-3xl text-green-600">¥</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{currentYear} Collected</p>
                <p className="text-2xl font-bold text-[#003366]">{formatCurrency(yearlyCollected)}</p>
                <p className="text-xs text-gray-500 mt-1">{currentYearProcessed.length} payments</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Student Uploads</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting verification</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sent to Finance</p>
                <p className="text-2xl font-bold text-blue-600">{collectedPayments.length}</p>
                <p className="text-xs text-gray-500 mt-1">For processing</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
        )}

        {/* Budget Proposals Tab */}
        {activeTab === 'budget_proposals' && (
          <div className="card">
            <BudgetProposalsPanel
              mode="staff"
              canManage={false}
              canPay
              title="Budget Proposals"
              subtitle="Review committee budgets and record payments after approval"
            />
          </div>
        )}

        {/* Non-Member Payments Tab */}
        {activeTab === 'non_member_payments' && (
          <div className="card p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Non-Member Payments</h2>
              <p className="text-gray-600 mb-6">This tab content will be embedded here</p>
              <p className="text-sm text-gray-500">
                Or click below to go to the dedicated page:
              </p>
              <a 
                href="/treasurer/non-member-payments"
                className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Non-Member Payments Page
              </a>
            </div>
          </div>
        )}

        {/* Ticket Approvals Tab */}
        {activeTab === 'ticket_approvals' && (
          <div className="card p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Approvals</h2>
              <p className="text-gray-600 mb-6">Approve ticket purchases and guest additions</p>
              <p className="text-sm text-gray-500">
                Click below to go to the ticket approval page:
              </p>
              <a 
                href="/treasurer/tickets"
                className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Ticket Approvals Page
              </a>
            </div>
          </div>
        )}

        {/* Loan Dashboard */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#00205B]">Loan Applications & Payments</h2>
                <p className="text-sm text-gray-600">Track loan applications and payment history</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowLoanStats(!showLoanStats)
                    if (!showLoanStats && !loanStatistics) {
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
                  <span>{showLoanStats ? 'Hide' : 'Show'} Statistics</span>
                </button>
              </div>
            </div>

            {/* Loan Statistics Dashboard */}
            {showLoanStats && (
              <div className="space-y-4">
                {loadingStats ? (
                  <div className="card text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D62828] mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading statistics...</p>
                  </div>
                ) : loanStatistics ? (
                  <>
                    {/* Overdue Alert */}
                    {loanStatistics.overdue_loans > 0 && (
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
                            ⚠️ {loanStatistics.overdue_loans} Overdue Loan{loanStatistics.overdue_loans !== 1 ? 's' : ''}
                          </p>
                          <p style={{fontSize: '0.875rem', color: '#B91C1C'}}>
                            Immediate action required. Outstanding balance: ¥{parseFloat(loanStatistics.total_outstanding || 0).toFixed(2)}
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
                        <p className="text-3xl font-bold text-white">{loanStatistics.total_applications}</p>
                      </div>

                      {/* Pending Disbursement */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-orange-300">Pending Disbursement</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{loanStatistics.pending_treasurer}</p>
                        <p className="text-xs text-orange-300 mt-1">Finance approved, awaiting disbursement</p>
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
                        <p className="text-3xl font-bold text-white">{loanStatistics.disbursed_loans}</p>
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
                        <p className="text-3xl font-bold text-white">{loanStatistics.repaid_loans}</p>
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
                        <p className="text-3xl font-bold text-white">{loanStatistics.overdue_loans}</p>
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
                        <p className="text-3xl font-bold text-white">¥{parseFloat(loanStatistics.total_amount_disbursed || 0).toFixed(0)}</p>
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
                        <p className="text-3xl font-bold text-white">¥{parseFloat(loanStatistics.total_amount_repaid || 0).toFixed(0)}</p>
                        <p className="text-xs text-blue-300 mt-1">Total repayments</p>
                      </div>

                      {/* Average Loan */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-yellow-300">Avg Loan Size</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">¥{parseFloat(loanStatistics.average_loan_amount || 0).toFixed(0)}</p>
                        <p className="text-xs text-yellow-300 mt-1">Average per loan</p>
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
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.total_outstanding || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Active Loans</p>
                          <p className="text-2xl font-bold text-[#00205B]">{loanStatistics.active_loans || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Collection Rate</p>
                          <p className="text-2xl font-bold text-[#00205B]">{loanStatistics.collection_rate ? `${loanStatistics.collection_rate}%` : '0%'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Repaid Amount</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.total_amount_repaid || 0).toFixed(2)}</p>
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
              
              {loading ? (
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
                            onClick={() => openLoanDetails(loan)}
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

        {/* Loans for Disbursement */}
        <div className="card p-3">
          <h2 className="text-base font-bold mb-2 text-green-600">
            💰 Loans Approved by Finance ({loans.filter(l => l.status === 'finance_approved').length})
          </h2>
          {loans.filter(l => l.status === 'finance_approved').length === 0 ? (
            <p className="text-gray-500 text-center py-4">No loans pending disbursement</p>
          ) : (
            <div className="space-y-2">
              {loans.filter(l => l.status === 'finance_approved').map(loan => (
                <div key={loan.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-bold text-sm">{loan.users?.full_name}</h3>
                        <span className="badge-finance_approved">Finance Approved</span>
                      </div>
                      <p className="text-xs text-gray-600">{loan.users?.email}</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        ¥{parseFloat(loan.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg p-2 mb-1">
                    <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-xs text-gray-600">{loan.reason}</p>
                  </div>

                  <button
                    onClick={() => openDisbursementModal(loan)}
                    disabled={processing === loan.id}
                    className="btn-primary w-full bg-green-600 hover:bg-green-700 py-1.5 text-sm"
                  >
                    Disburse Loan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disbursed Loans with Pending Verifications - Combined Professional View */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#00205B] flex items-center gap-2">
                💰 Active Loan Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loans.filter(l => l.status === 'disbursed' || l.status === 'repaid').length} active loans
                {pendingVerifications.length > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {pendingVerifications.length} pending verification{pendingVerifications.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {overdueSummary && overdueSummary.totalOverdue > 0 && (
                <button
                  onClick={() => setShowOverdueSection(!showOverdueSection)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  ⚠️ {overdueSummary.totalOverdue} Overdue Loans
                </button>
              )}
            </div>
          </div>
          
          {loans.filter(l => l.status === 'disbursed' || l.status === 'repaid').length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">No active disbursed loans</p>
              <p className="text-gray-400 text-sm mt-1">Approved loans will appear here after disbursement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.filter(l => l.status === 'disbursed' || l.status === 'repaid').map(loan => {
                const repaymentPercentage = loan.total_amount_with_interest > 0
                  ? Math.round((loan.total_repaid / loan.total_amount_with_interest) * 100)
                  : 0
                
                // Find pending verifications for this specific loan
                const loanPendingVerifications = pendingVerifications.filter(
                  (v: any) => v.loan_id === loan.id
                )
                
                return (
                  <div key={loan.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
                    {/* Main Loan Info */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-900">{loan.users?.full_name}</h3>
                            {loan.is_overdue && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                ⚠️ Overdue
                              </span>
                            )}
                            {loanPendingVerifications.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium animate-pulse">
                                ✓ {loanPendingVerifications.length} Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{loan.users?.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewPaymentHistory(loan)}
                            className="btn-secondary border-2 border-[#00205B] text-[#00205B] hover:bg-[#00205B] hover:text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all"
                          >
                            📋 View History
                          </button>
                          <button
                            onClick={() => openRecordPaymentModal(loan)}
                            className="btn-primary bg-[#00205B] hover:bg-[#001a4a] text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all"
                          >
                            💵 Record Payment
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Loan Amount</p>
                          <p className="text-lg font-bold text-gray-900">¥{parseFloat(loan.amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Remaining Balance</p>
                          <p className="text-lg font-bold text-green-600">¥{parseFloat(loan.remaining_balance || '0').toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Progress</p>
                          <p className="text-lg font-bold text-blue-600">{repaymentPercentage}%</p>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              repaymentPercentage === 100 ? 'bg-green-600' :
                              repaymentPercentage >= 50 ? 'bg-blue-600' :
                              'bg-yellow-600'
                            }`}
                            style={{ width: `${repaymentPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>📅 Disbursed: {formatDate(loan.disbursed_at || loan.created_at)}</span>
                        {loan.last_payment_date && (
                          <span>• 💳 Last Payment: {formatDate(loan.last_payment_date)}</span>
                        )}
                      </div>
                    </div>

                    {/* Pending Verifications for This Loan */}
                    {loanPendingVerifications.length > 0 && (
                      <div className="border-t-2 border-gray-200 p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          ✅ Member-Submitted Payments Awaiting Verification
                        </h4>
                        <div className="space-y-3">
                          {loanPendingVerifications.map((repayment: any) => {
                            
                            return (
                            <div key={repayment.id} className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-sm">
                              <div className="flex items-start gap-3">
                                {repayment.payment_proof_url && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={repayment.payment_proof_url}
                                      alt="Payment Proof"
                                      className="w-28 h-28 object-cover rounded-lg border-2 border-gray-400 cursor-pointer hover:opacity-80 hover:scale-105 transition-transform"
                                      onClick={() => setViewImage(repayment.payment_proof_url)}
                                      onError={(e) => {
                                        console.error('❌ Failed to load payment proof thumbnail for repayment:', repayment.id)
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
                                      }}
                                    />
                                    <p className="text-xs text-center text-gray-600 mt-1 font-medium">Click to enlarge</p>
                                  </div>
                                )}

                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="text-lg font-bold text-green-600">¥{parseFloat(repayment.amount).toFixed(2)}</p>
                                      <p className="text-xs text-gray-600">{formatDateTime(repayment.payment_date)}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs text-gray-600">Payment Method</p>
                                      <p className="text-sm font-medium capitalize">{repayment.payment_method?.replace('_', ' ') || 'Not specified'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs text-gray-600">New Balance After Verification</p>
                                      <p className="text-sm font-bold text-green-600">
                                        {(() => {
                                          const newBalance = parseFloat(loan.remaining_balance || '0') - parseFloat(repayment.amount)
                                          if (newBalance <= 0) {
                                            return '✓ Fully Paid'
                                          }
                                          return `¥${newBalance.toFixed(2)}`
                                        })()}
                                      </p>
                                    </div>
                                  </div>

                                  {repayment.notes && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                                      <p className="text-xs text-gray-600 mb-1 font-medium">💬 Member Notes:</p>
                                      <p className="text-sm text-gray-800">{repayment.notes}</p>
                                    </div>
                                  )}

                                  {rejectingPaymentId === repayment.id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter rejection reason (required)..."
                                        className="w-full px-3 py-2 border-2 border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleRejectPayment(repayment.id)}
                                          disabled={!rejectionReason.trim() || verifyingPaymentId === repayment.id}
                                          className="btn-primary bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
                                        >
                                          {verifyingPaymentId === repayment.id ? '⏳ Rejecting...' : '✓ Confirm Reject'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRejectingPaymentId(null)
                                            setRejectionReason('')
                                          }}
                                          className="btn-secondary px-4 py-2 text-sm flex-1 border-2 border-gray-300 rounded-lg font-medium"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleVerifyPayment(repayment.id)}
                                        disabled={verifyingPaymentId === repayment.id}
                                        className="btn-primary bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm flex-1 disabled:opacity-50 rounded-lg font-medium shadow-sm"
                                      >
                                        {verifyingPaymentId === repayment.id ? '⏳ Verifying...' : '✅ Verify & Approve'}
                                      </button>
                                      <button
                                        onClick={() => setRejectingPaymentId(repayment.id)}
                                        className="btn-primary bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm flex-1 rounded-lg font-medium shadow-sm"
                                      >
                                        ❌ Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Overdue Loans Alert Widget */}
        {overdueSummary && overdueSummary.totalOverdue > 0 && (
          <div className={`card p-4 border-2 ${getSeverityColor(overdueSummary.criticalOverdue > 0 ? 31 : 7)}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                  ⚠️ Overdue Loan Payments ({overdueSummary.totalOverdue})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Total overdue amount: ¥{overdueSummary.totalOverdueAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <button
                onClick={() => setShowOverdueSection(!showOverdueSection)}
                className="text-sm text-[#00205B] hover:underline font-medium"
              >
                {showOverdueSection ? 'Hide Details' : 'View Details'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                <p className="text-xs text-red-600 font-medium">Critical (30+ days)</p>
                <p className="text-xl font-bold text-red-700">{overdueSummary.criticalOverdue || 0}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium">Warning (7-30 days)</p>
                <p className="text-xl font-bold text-orange-700">{overdueSummary.warningOverdue || 0}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium">Recent (&lt;7 days)</p>
                <p className="text-xl font-bold text-yellow-700">{overdueSummary.recentOverdue || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Loans Detailed List */}
        {showOverdueSection && overdueLoans.length > 0 && (
          <div className="card p-4">
            <h2 className="text-lg font-bold mb-3 text-red-700">
              📋 Overdue Loans Details
            </h2>
            <div className="space-y-3">
              {overdueLoans.map((loan: any) => {
                const severity = getSeverityBadge(loan.days_overdue)
                return (
                  <div
                    key={loan.loan_id}
                    className={`border-2 rounded-lg p-3 ${getSeverityColor(loan.days_overdue)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm">{loan.member_name}</h3>
                          <span className={`text-xs text-white px-2 py-0.5 rounded ${severity.color}`}>
                            {severity.text}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{loan.member_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Days Overdue</p>
                        <p className="text-2xl font-bold text-red-700">{loan.days_overdue}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <p className="text-xs text-gray-600">Loan Amount</p>
                        <p className="text-sm font-bold">¥{parseFloat(loan.loan_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Remaining</p>
                        <p className="text-sm font-bold text-red-600">¥{parseFloat(loan.remaining_balance).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Due Date</p>
                        <p className="text-sm font-medium">{formatDate(loan.final_repayment_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      {loan.last_payment_date && (
                        <span>Last Payment: {formatDate(loan.last_payment_date)}</span>
                      )}
                      {loan.last_contact_date && (
                        <span>• Last Contact: {formatDate(loan.last_contact_date)}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`mailto:${loan.member_email}?subject=Overdue Loan Payment Reminder&body=Dear ${loan.member_name},%0A%0AThis is a reminder that your loan payment is ${loan.days_overdue} days overdue.`}
                        className="btn-primary bg-[#00205B] hover:bg-[#001a4a] text-white px-3 py-1.5 text-xs flex-1"
                      >
                        📧 Send Reminder
                      </a>
                      <button
                        onClick={() => {
                          const loanToRecord = loans.find(l => l.id === loan.loan_id)
                          if (loanToRecord) openRecordPaymentModal(loanToRecord)
                        }}
                        className="btn-primary bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs flex-1"
                      >
                        💵 Record Payment
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Student Upload Verification Queue */}
        {activeTab === 'payments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#D62828]">
                📥 Student Payment Verification ({pendingPayments.length})
              </h2>
              <p className="text-sm text-gray-600">Students uploaded digital payment proofs • Showing newest first</p>
            </div>
            
            {/* Pagination info */}
            {pendingPaymentsGrouped.length > itemsPerPage && (
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} • {pendingPaymentsGrouped.length} total
              </div>
            )}
          </div>

          {pendingPayments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No pending student uploads</p>
              <p className="text-gray-500">Student payment proofs will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Submitted</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Proof</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPendingPayments.map(payment => {
                    const profile = payment.users?.members_profile?.[0] || payment.users?.members_profile
                    const contactInfo = profile?.wechat_id || profile?.chinese_phone_number || profile?.phone || payment.users?.email || 'N/A'
                    
                    return (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-gray-900">{payment.users?.full_name}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                              {profile?.wechat_id ? (
                                <>
                                  <span className="mr-1">💬</span>
                                  WeChat: {profile.wechat_id}
                                </>
                              ) : profile?.chinese_phone_number ? (
                                <>
                                  <span className="mr-1">📱</span>
                                  {profile.chinese_phone_number}
                                </>
                              ) : profile?.phone ? (
                                <>
                                  <span className="mr-1">📞</span>
                                  {profile.phone}
                                </>
                              ) : (
                                <>
                                  <span className="mr-1">✉️</span>
                                  {payment.users?.email}
                                </>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-[#003366]">
                            {payment.batch_id 
                              ? formatCurrency(parseFloat(payment.amount) * payment.batch_size) 
                              : formatCurrency(payment.amount)}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          {(() => {
                            const periodInfo = formatPeriod(payment)
                            return (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="text-sm text-gray-700 cursor-help flex items-center gap-1.5"
                                  title={periodInfo.tooltip}
                                >
                                  <span>{periodInfo.display}</span>
                                  {periodInfo.badge && (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      {periodInfo.badge}
                                    </span>
                                  )}
                                </div>
                                {payment.batch_id && payment.batch_size > 1 && (
                                  <button
                                    onClick={() => toggleBatchExpansion(payment.batch_id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    title={expandedBatches.has(payment.batch_id) ? "Hide details" : "Show all months"}
                                  >
                                    {expandedBatches.has(payment.batch_id) ? (
                                      <>▲ Hide</>
                                    ) : (
                                      <>▼ Details</>
                                    )}
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 capitalize cursor-help"
                            title={`Digital payment via ${payment.payment_method}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {payment.payment_method}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {new Date(payment.created_at).toLocaleDateString('en-US', { 
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.created_at).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-mono text-gray-600">{payment.reference_code}</p>
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
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              No proof
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => markAsCollected(payment.id)}
                            disabled={processing === payment.id}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing === payment.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Collect
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pendingPaymentsGrouped.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-1 text-sm font-medium rounded ${
                        currentPage === index + 1
                          ? 'bg-[#D62828] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
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

        {/* Collected Payments - Sent to Finance */}
        {activeTab === 'payments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-blue-600">
                ✓ Collected Payments (Sent to Finance: {collectedPayments.length})
              </h2>
              <p className="text-sm text-gray-600">These payments have been verified and sent to Finance for final approval</p>
            </div>
            
            {/* Pagination info */}
            {collectedPaymentsGrouped.length > itemsPerPage && (
              <div className="text-sm text-gray-600">
                Page {collectedPage} of {collectedTotalPages} • {collectedPaymentsGrouped.length} total
              </div>
            )}
          </div>
          
          {collectedPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No collected payments pending finance approval</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">By</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Proof</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCollectedPayments.flatMap(payment => {
                      // Main payment row
                      const rows = [
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-semibold text-gray-900">{payment.users?.full_name}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-green-600">
                              {payment.batch_id 
                                ? formatCurrency(parseFloat(payment.amount) * payment.batch_size) 
                                : formatCurrency(payment.amount)}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            {(() => {
                              const periodInfo = formatPeriod(payment)
                              return (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="text-sm text-gray-700 cursor-help flex items-center gap-1.5"
                                    title={periodInfo.tooltip}
                                  >
                                    <span>{periodInfo.display}</span>
                                    {periodInfo.badge && (
                                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {periodInfo.badge}
                                      </span>
                                    )}
                                  </div>
                                  {payment.batch_id && payment.batch_size > 1 && (
                                    <button
                                      onClick={() => toggleBatchExpansion(payment.batch_id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                      title={expandedBatches.has(payment.batch_id) ? "Hide details" : "Show all months"}
                                    >
                                      {expandedBatches.has(payment.batch_id) ? (
                                        <>▲ Hide</>
                                      ) : (
                                        <>▼ Details</>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-700">{payment.collector?.full_name || 'N/A'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-700">
                          {new Date(payment.collected_at || payment.created_at).toLocaleDateString('en-US', { 
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.collected_at ? new Date(payment.collected_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          }) : ''}
                        </p>
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
                        {payment.payment_source === 'cash' ? (
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 cursor-help"
                            title="Cash payment recorded by treasurer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Treasurer
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 cursor-help"
                            title="Digital payment submitted by member via app"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Member
                          </span>
                        )}
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
                        <button
                          onClick={() => undoCollection(payment.id)}
                          disabled={processing === payment.id}
                          className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move back to pending for rechecking"
                        >
                          {processing === payment.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              Recheck
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                      ]
                      
                      // If batch is expanded, add detail rows
                      if (payment.batch_id && expandedBatches.has(payment.batch_id)) {
                        const batchPayments = collectedPayments.filter(p => p.batch_id === payment.batch_id)
                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                        
                        batchPayments.sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month)).forEach((batchPayment, idx) => {
                          rows.push(
                            <tr key={`${payment.id}-detail-${idx}`} className="bg-blue-50 border-b border-blue-100">
                              <td className="py-2 px-4 pl-12 text-sm text-gray-600">
                                • {batchPayment.month}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-700">
                                {formatCurrency(batchPayment.amount)}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {String(months.indexOf(batchPayment.month) + 1).padStart(2, '0')}-{batchPayment.year}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600" colSpan={6}>
                                Payment {batchPayment.batch_sequence} of {batchPayment.batch_size}
                              </td>
                            </tr>
                          )
                        })
                      }
                      
                      return rows
                    })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {collectedPaymentsGrouped.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-200">
                <button
                  onClick={() => setCollectedPage(prev => Math.max(prev - 1, 1))}
                  disabled={collectedPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-2">
                  {[...Array(collectedTotalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCollectedPage(index + 1)}
                      className={`px-3 py-1 text-sm font-medium rounded ${
                        collectedPage === index + 1
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCollectedPage(prev => Math.min(prev + 1, collectedTotalPages))}
                  disabled={collectedPage === collectedTotalPages}
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

      {/* Approved by Finance Section */}
      {activeTab === 'payments' && (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-green-600">
              ✅ Approved by Finance ({approvedPayments.length})
            </h2>
            <p className="text-sm text-gray-600">These payments have been approved and recorded by Finance team</p>
          </div>
          {approvedPayments.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by receipt # or student name..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-80"
                onChange={(e) => {
                  const query = e.target.value.toLowerCase()
                  // This will filter the display in real-time
                  const table = e.target.closest('.card')?.querySelector('tbody')
                  const rows = table?.querySelectorAll('tr')
                  rows?.forEach(row => {
                    const text = row.textContent?.toLowerCase() || ''
                    row.style.display = text.includes(query) ? '' : 'none'
                  })
                }}
              />
            </div>
          )}
        </div>

        {approvedPayments.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No approved payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Receipt #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Approved By</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Approved Date</th>
                </tr>
              </thead>
              <tbody>
                {approvedPayments.slice(0, 10).map(payment => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-green-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{payment.users?.full_name}</p>
                        <p className="text-sm text-gray-500">{payment.users?.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{payment.month} {payment.year}</span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          setSelectedReceipt(payment)
                          setShowReceiptModal(true)
                        }}
                        className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold"
                        title="Click to view full receipt"
                      >
                        {payment.receipt_number}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">Finance Team</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{formatDateTime(payment.reviewed_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {approvedPayments.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Showing first 10 of {approvedPayments.length} approved payments
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}
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
              onError={(e) => {
                console.error('❌ Failed to load payment proof image')
                console.error('Image URL length:', viewImage?.length || 0)
                console.error('Is base64?', viewImage?.startsWith('data:image/'))
              }}
            />
            <button
              onClick={() => setViewImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-800 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cash Payment Recording Modal */}
      {showCashPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center">
                <Banknote className="w-6 h-6 mr-2 text-green-600" />
                Record Cash Payment
              </h2>
              <button
                onClick={() => {
                  setShowCashPaymentForm(false)
                  setRecordedReferences([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              Record cash payments received in person from students
            </p>

            <form onSubmit={recordCashPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student *
                </label>
                <select
                  value={cashPaymentData.studentId}
                  onChange={(e) => setCashPaymentData(prev => ({ ...prev, studentId: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                >
                  <option value="">Choose student...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (¥) Per Month *
                  </label>
                  <input
                    type="number"
                    value={cashPaymentData.amount}
                    onChange={(e) => setCashPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    min="1"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Per month (auto-calculated from profile)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    value={cashPaymentData.year}
                    onChange={(e) => setCashPaymentData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                  >
                    <option value={currentYear}>{currentYear}</option>
                    <option value={currentYear - 1}>{currentYear - 1}</option>
                  </select>
                </div>
              </div>
              
              {/* Show total calculation - clean minimalist style */}
              {cashPaymentData.months.length > 0 && (
                <div className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payment Calculation</p>
                      <p className="text-xl font-bold text-gray-900">
                        ¥{cashPaymentData.amount} × {cashPaymentData.months.length} month{cashPaymentData.months.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                      <p className="text-3xl font-extrabold text-green-600">
                        ¥{calculateTotalAmount().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Payment Period * <span className="text-xs text-gray-500">(Choose start and end month)</span>
                </label>
                
                {loadingUnpaidMonths && (
                  <div className="mb-2 text-sm text-gray-600 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading payment history...
                  </div>
                )}

                {unpaidMonthsData && (
                  <div className="mb-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        📊 Payment Summary for {unpaidMonthsData.studentName}
                      </span>
                      <span className="text-xs text-gray-500">
                        Joined: {new Date(unpaidMonthsData.joinDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="text-red-600 font-semibold">
                          🔴 {unpaidMonthsData.unpaidMonths.filter((m: any) => m.status === 'overdue').length} Overdue
                        </div>
                      </div>
                      <div>
                        <div className="text-yellow-600 font-semibold">
                          🟡 {unpaidMonthsData.unpaidMonths.filter((m: any) => m.status === 'current').length} Current
                        </div>
                      </div>
                      <div>
                        <div className="text-green-600 font-semibold">
                          ✅ {unpaidMonthsData.totalPaid} Paid
                        </div>
                      </div>
                    </div>

                    {unpaidMonthsData.totalUnpaid === 0 && (
                      <div className="text-center py-2 text-green-600 font-medium text-sm">
                        ✅ All dues paid! No outstanding payments.
                      </div>
                    )}

                    {unpaidMonthsData.totalUnpaid > 0 && (
                      <div className="text-xs text-gray-600">
                        <strong>Unpaid months:</strong> {unpaidMonthsData.unpaidMonths.map((m: any) => 
                          `${m.month} ${m.year}${m.status === 'overdue' ? ' 🔴' : m.status === 'current' ? ' 🟡' : ''}`
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Flight-style range selector */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From Month</label>
                    <select
                      value={cashPaymentData.startMonth}
                      onChange={(e) => handleRangeChange('startMonth', e.target.value)}
                      disabled={loadingUnpaidMonths}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-medium"
                    >
                      <option value="">Select start...</option>
                      {months.map(m => {
                        const isUnpaid = unpaidMonthsData?.unpaidMonths?.find(
                          (um: any) => um.month === m && um.year === cashPaymentData.year
                        )
                        const isPaid = unpaidMonthsData?.paidMonths?.find(
                          (pm: any) => pm.month === m && pm.year === cashPaymentData.year
                        )
                        
                        return (
                          <option 
                            key={m} 
                            value={m}
                            disabled={!!isPaid}
                            style={{
                              color: isPaid ? '#9CA3AF' : isUnpaid?.status === 'overdue' ? '#DC2626' : isUnpaid?.status === 'current' ? '#D97706' : '#000'
                            }}
                          >
                            {m} {isPaid ? '✓' : isUnpaid?.status === 'overdue' ? '🔴' : isUnpaid?.status === 'current' ? '🟡' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To Month</label>
                    <select
                      value={cashPaymentData.endMonth}
                      onChange={(e) => handleRangeChange('endMonth', e.target.value)}
                      disabled={loadingUnpaidMonths || !cashPaymentData.startMonth}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 font-medium"
                    >
                      <option value="">Select end...</option>
                      {months.map((m, idx) => {
                        const startIdx = months.indexOf(cashPaymentData.startMonth)
                        const isBeforeStart = idx < startIdx
                        const isUnpaid = unpaidMonthsData?.unpaidMonths?.find(
                          (um: any) => um.month === m && um.year === cashPaymentData.year
                        )
                        const isPaid = unpaidMonthsData?.paidMonths?.find(
                          (pm: any) => pm.month === m && pm.year === cashPaymentData.year
                        )
                        
                        return (
                          <option 
                            key={m} 
                            value={m}
                            disabled={isBeforeStart || !!isPaid}
                            style={{
                              color: isBeforeStart || isPaid ? '#9CA3AF' : isUnpaid?.status === 'overdue' ? '#DC2626' : isUnpaid?.status === 'current' ? '#D97706' : '#000'
                            }}
                          >
                            {m} {isPaid ? '✓' : isUnpaid?.status === 'overdue' ? '🔴' : isUnpaid?.status === 'current' ? '🟡' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* Visual range indicator - clean minimalist style */}
                {cashPaymentData.months.length > 0 && (
                  <div className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Selected Range</p>
                        <p className="text-sm font-bold text-gray-900">
                          {cashPaymentData.months[0]} to {cashPaymentData.months[cashPaymentData.months.length - 1]} {cashPaymentData.year}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Months</p>
                        <p className="text-2xl font-bold text-gray-900">{cashPaymentData.months.length}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Months:</strong> {cashPaymentData.months.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={cashPaymentData.paymentMethod}
                  onChange={(e) => setCashPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                >
                  <option value="bank">Bank Transfer / Cash</option>
                  <option value="wechat">WeChat</option>
                  <option value="alipay">Alipay</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How the student paid in person</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Proof (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCashProofUpload}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                  />
                  {cashPaymentData.proof_url && (
                    <button
                      type="button"
                      onClick={() => setCashPaymentData(prev => ({ ...prev, proof_url: '' }))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {cashPaymentData.proof_url && (
                  <div className="mt-2">
                    <img
                      src={cashPaymentData.proof_url}
                      alt="Payment proof"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={cashPaymentData.notes}
                  onChange={(e) => setCashPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This payment will be recorded as "collected" and sent directly to Finance for processing.
                </p>
              </div>

              {/* Show reference codes after successful recording */}
              {recordedReferences.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Payment Recorded Successfully!</h3>
                  <div className="space-y-1">
                    {recordedReferences.map((ref, index) => (
                      <p key={index} className="text-sm text-green-700 font-mono">
                        {ref}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordedReferences([])
                      setShowCashPaymentForm(false)
                    }}
                    className="mt-3 text-sm text-green-700 underline hover:text-green-800"
                  >
                    Close and record another
                  </button>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submittingCash}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {submittingCash ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Record Payment{cashPaymentData.months.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCashPaymentForm(false)
                    setRecordedReferences([])
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
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
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Generate comprehensive financial reports with SPSS-style analytics. Export to Excel or PDF format.
            </p>

            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setReportType('summary')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      reportType === 'summary'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-semibold text-gray-900">Summary Report</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Overview & key metrics
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setReportType('detailed')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      reportType === 'detailed'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">📋</div>
                      <div className="font-semibold text-gray-900">Detailed Report</div>
                      <div className="text-xs text-gray-600 mt-1">
                        All transactions listed
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setReportType('analytics')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      reportType === 'analytics'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">📈</div>
                      <div className="font-semibold text-gray-900">Analytics Report</div>
                      <div className="text-xs text-gray-600 mt-1">
                        SPSS-style analysis
                      </div>
                    </div>
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
                    value={reportDateRange.startDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportDateRange.endDate}
                    onChange={(e) => setReportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Report Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {reportType === 'summary' && '📊 Summary Report Includes:'}
                  {reportType === 'detailed' && '📋 Detailed Report Includes:'}
                  {reportType === 'analytics' && '📈 Analytics Report Includes:'}
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {reportType === 'summary' && (
                    <>
                      <li>✓ Executive overview with key metrics</li>
                      <li>• Total revenue and payment counts with KPIs</li>
                      <li>• Payment status breakdown with percentages</li>
                      <li>• Payment method distribution & trends</li>
                      <li>• Top 5 collectors performance ranking</li>
                      <li>• Monthly collection breakdown</li>
                    </>
                  )}
                  {reportType === 'detailed' && (
                    <>
                      <li>✓ Comprehensive data with full transaction records</li>
                      <li>• Complete transaction list with ALL payment records</li>
                      <li>• Student full names, emails, universities</li>
                      <li>• Payment reference codes and timestamps</li>
                      <li>• Batch payment identification</li>
                      <li>• Collector names and collection dates</li>
                    </>
                  )}
                  {reportType === 'analytics' && (
                    <>
                      <li>✓ Advanced insights with statistical analysis</li>
                      <li>• Statistical analysis (mean, median, range)</li>
                      <li>• Payment frequency distribution tables</li>
                      <li>• Correlation analysis by payment method</li>
                      <li>• Performance benchmarking & assessments</li>
                      <li>• Time-series trend analysis</li>
                      <li>• Data-driven recommendations & key findings</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Export Options */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      generateReport('excel', e)
                    }}
                    disabled={generatingReport}
                    className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                          <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                        <span className="font-semibold">Export to Excel</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      generateReport('pdf', e)
                    }}
                    disabled={generatingReport}
                    className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Export to PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Member Payment Search Modal */}
      {showMemberSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => handleMemberSearchInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchMemberPayments(memberSearchQuery)}
                    onFocus={() => memberSearchQuery.length >= 2 && setShowSuggestions(true)}
                    placeholder="Search by member name or email... (e.g., THEO MEAYEYAN)"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                  />
                  
                  {/* Autocomplete Suggestions Dropdown */}
                  {showSuggestions && memberSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                      {memberSuggestions.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => selectMemberFromSuggestion(user)}
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{user.full_name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => searchMemberPayments(memberSearchQuery)}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {selectedMemberInfo && selectedMemberPayments.length > 0 ? (
                <>
                  {/* Member Info & Stats */}
                  <div className="mb-6">
                    {/* Member Header - No Background */}
                    <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-gray-200">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-900">{selectedMemberInfo.full_name}</h3>
                        <p className="text-gray-600 mt-2 text-lg">{selectedMemberInfo.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Member ID</p>
                        <p className="text-lg font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
                          {selectedMemberInfo.members_profile?.[0]?.member_id || 
                           selectedMemberInfo.members_profile?.member_id || 
                           'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards - Clean Without Borders */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-600 mb-2 whitespace-nowrap">Total Payments</p>
                        <p className="text-3xl font-bold text-indigo-600">{selectedMemberPayments.length}</p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-600 mb-2 whitespace-nowrap">Total Amount</p>
                        <p className="text-3xl font-bold text-green-600">
                          ¥{selectedMemberPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-600 mb-2 whitespace-nowrap">Average Payment</p>
                        <p className="text-3xl font-bold text-blue-600">
                          ¥{(selectedMemberPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / selectedMemberPayments.length).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6">
                        <p className="text-xs text-gray-600 mb-2 whitespace-nowrap">Months Covered</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {new Set(selectedMemberPayments.map(p => `${p.month}-${p.year}`)).size}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment History Table */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Period</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Proof</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const indexOfLastPayment = memberSearchPage * memberSearchPerPage
                            const indexOfFirstPayment = indexOfLastPayment - memberSearchPerPage
                            const currentPayments = selectedMemberPayments.slice(indexOfFirstPayment, indexOfLastPayment)
                            
                            return currentPayments.map((payment) => (
                              <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm">
                                  {new Date(payment.created_at).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium">
                                  {payment.batch_id ? (
                                    <div>
                                      <span>{payment.month.substring(0, 3)} to</span>
                                      <span className="ml-1 text-xs text-gray-500">({payment.batch_sequence}/{payment.batch_size})</span>
                                    </div>
                                  ) : (
                                    `${payment.month} ${payment.year}`
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-green-600">¥{payment.amount}</span>
                                </td>
                                <td className="py-3 px-4 text-sm capitalize">{payment.payment_method}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'collected' ? 'bg-blue-100 text-blue-800' :
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs font-mono text-gray-600">
                                  {payment.reference_code}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {payment.payment_source === 'cash' ? (
                                    <span className="text-orange-600 flex items-center gap-1">
                                      <Banknote className="w-4 h-4" />
                                      Treasurer
                                    </span>
                                  ) : (
                                    <span className="text-purple-600 flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      Student
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {payment.proof_url ? (
                                    <button
                                      onClick={() => setViewImage(payment.proof_url)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-sm">No proof</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {selectedMemberPayments.length > memberSearchPerPage && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-600">
                          Showing {((memberSearchPage - 1) * memberSearchPerPage) + 1} to{' '}
                          {Math.min(memberSearchPage * memberSearchPerPage, selectedMemberPayments.length)} of{' '}
                          {selectedMemberPayments.length} payments
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMemberSearchPage(prev => Math.max(1, prev - 1))}
                            disabled={memberSearchPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const totalPages = Math.ceil(selectedMemberPayments.length / memberSearchPerPage)
                              return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => setMemberSearchPage(page)}
                                  className={`w-10 h-10 rounded-lg transition-colors ${
                                    memberSearchPage === page
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-gray-300 hover:bg-white'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))
                            })()}
                          </div>
                          <button
                            onClick={() => setMemberSearchPage(prev => Math.min(Math.ceil(selectedMemberPayments.length / memberSearchPerPage), prev + 1))}
                            disabled={memberSearchPage >= Math.ceil(selectedMemberPayments.length / memberSearchPerPage)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : memberSearchQuery && selectedMemberPayments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">No Payments Found</p>
                  <p className="text-sm text-gray-500">Try searching with a different name or email</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">Search for a Member</p>
                  <p className="text-sm text-gray-500">Enter a student name or email to view their complete payment history</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowMemberSearchModal(false)
                  setMemberSearchQuery('')
                  setSelectedMemberPayments([])
                  setSelectedMemberInfo(null)
                }}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Budget Proposals Modals */}
      {showProposalModal && selectedProposalForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-gray-600 mb-4">Proposal: <span className="font-medium">{selectedProposalForPayment.title}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (¥)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
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
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Transaction ID, check number, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid To (Name)</label>
                <input
                  type="text"
                  value={paymentForm.paid_to_name}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paid_to_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Committee name or contact person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Additional payment notes"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowProposalModal(false)
                  setSelectedProposalForPayment(null)
                  setPaymentForm({
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

      {/* Monthly Records Overview Modal */}
      {showMonthPaymentsModal && !selectedMonthData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Monthly Payment Records</h2>
                    <p className="text-sm text-gray-600 mt-1">Click on any month to view detailed payment records</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMonthPaymentsModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {(() => {
                  // Calculate monthly payment counts and amounts
                  const monthlyData: Record<string, { count: number; amount: number; month: string; year: number }> = {}
                  
                  payments.forEach(payment => {
                    const key = `${payment.month}-${payment.year}`
                    if (!monthlyData[key]) {
                      monthlyData[key] = { count: 0, amount: 0, month: payment.month, year: payment.year }
                    }
                    monthlyData[key].count++
                    monthlyData[key].amount += parseFloat(payment.amount)
                  })

                  // Convert to array and sort by date (most recent first)
                  const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                  const sortedMonths = Object.values(monthlyData).sort((a, b) => {
                    if (b.year !== a.year) return b.year - a.year
                    return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month)
                  })

                  return sortedMonths.length > 0 ? sortedMonths.map((data) => (
                    <button
                      key={`${data.month}-${data.year}`}
                      onClick={() => viewMonthPayments(data.month, data.year)}
                      className="group relative bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-500 hover:shadow-xl transition-all duration-200 text-left overflow-hidden"
                    >
                      {/* Hover gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      
                      <div className="relative">
                        {/* Year badge */}
                        <div className="inline-block px-2 py-0.5 bg-gray-100 group-hover:bg-indigo-100 rounded text-xs font-medium text-gray-600 group-hover:text-indigo-700 mb-2 transition-colors">
                          {data.year}
                        </div>
                        
                        {/* Month name */}
                        <div className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 mb-3 transition-colors">
                          {data.month}
                        </div>
                        
                        {/* Amount */}
                        <div className="text-2xl font-extrabold text-green-600 mb-2">
                          ¥{data.amount.toFixed(2)}
                        </div>
                        
                        {/* Payment count */}
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{data.count} payment{data.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      {/* Click indicator */}
                      <div className="absolute bottom-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )) : (
                    <div className="col-span-full text-center py-16">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No Payment Records Yet</p>
                      <p className="text-sm text-gray-500">Payment records will appear here once students make payments</p>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowMonthPaymentsModal(false)}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Month Payments Viewer Modal */}
      {showMonthPaymentsModal && selectedMonthData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-7 h-7 text-blue-600" />
                {selectedMonthData.month} {selectedMonthData.year} Payment Records
              </h2>
              <button
                onClick={() => {
                  setShowMonthPaymentsModal(false)
                  setSelectedMonthData(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-[#003366]">{selectedMonthData.payments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{selectedMonthData.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Payment</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{selectedMonthData.payments.length > 0 
                      ? (selectedMonthData.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / selectedMonthData.payments.length).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {loadingMonthPayments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : selectedMonthData.payments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No payments found for this month</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const indexOfLastPayment = monthPaymentsPage * monthPaymentsPerPage
                        const indexOfFirstPayment = indexOfLastPayment - monthPaymentsPerPage
                        const currentPayments = selectedMonthData.payments.slice(indexOfFirstPayment, indexOfLastPayment)
                        
                        return currentPayments.map((payment, index) => (
                          <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900">{payment.users?.full_name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{payment.users?.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-[#003366]">¥{payment.amount}</span>
                              {payment.batch_id && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({payment.batch_sequence}/{payment.batch_size})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm capitalize">{payment.payment_method}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                payment.status === 'collected' ? 'bg-blue-100 text-blue-800' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-gray-600">
                              {payment.reference_code}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {payment.collector?.full_name || 
                               (payment.payment_source === 'cash' ? 'Treasurer' : 'Student')}
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Month Payments */}
                {selectedMonthData.payments.length > monthPaymentsPerPage && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {((monthPaymentsPage - 1) * monthPaymentsPerPage) + 1} to{' '}
                      {Math.min(monthPaymentsPage * monthPaymentsPerPage, selectedMonthData.payments.length)} of{' '}
                      {selectedMonthData.payments.length} payments
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMonthPaymentsPage(prev => Math.max(1, prev - 1))}
                        disabled={monthPaymentsPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const totalPages = Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage)
                          return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setMonthPaymentsPage(page)}
                              className={`w-10 h-10 rounded-lg transition-colors ${
                                monthPaymentsPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))
                        })()}
                      </div>
                      <button
                        onClick={() => setMonthPaymentsPage(prev => Math.min(Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage), prev + 1))}
                        disabled={monthPaymentsPage >= Math.ceil(selectedMonthData.payments.length / monthPaymentsPerPage)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <button
                onClick={() => {
                  setShowMonthPaymentsModal(false)
                  setSelectedMonthData(null)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

      {/* Loan Disbursement Modal */}
      {showDisbursementModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#00205B]">Disburse Loan</h2>
                <button
                  onClick={() => {
                    setShowDisbursementModal(false)
                    setSelectedLoan(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">Upload proof and complete disbursement</p>
            </div>

            {/* Loan Details */}
            <div className="p-6 bg-gray-50">
              <h3 className="font-semibold text-lg mb-4 text-[#00205B]">Loan Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Applicant</p>
                  <p className="font-semibold">{selectedLoan.users?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-green-600">¥{parseFloat(selectedLoan.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Purpose</p>
                  <p className="font-medium text-sm">{selectedLoan.reason}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Repayment Date</p>
                  <p className="font-medium text-sm">
                    {selectedLoan.expected_repayment_date 
                      ? new Date(selectedLoan.expected_repayment_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Disbursement Form */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-lg mb-4 text-[#00205B]">Disbursement Details</h3>
              
              {/* Disbursement Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disbursement Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={disbursementData.method}
                  onChange={(e) => setDisbursementData(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00205B]"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="wechat">WeChat Pay</option>
                  <option value="alipay">Alipay</option>
                </select>
              </div>

              {/* Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof of Disbursement <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload receipt, bank transfer screenshot, or payment confirmation (Max 5MB, Image only)
                </p>
                
                {!disbursementData.proof_url ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofUpload}
                      className="hidden"
                      id="proof-upload"
                      disabled={uploadingProof}
                    />
                    <label
                      htmlFor="proof-upload"
                      className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#00205B] text-white rounded-lg hover:bg-opacity-90 transition-colors ${uploadingProof ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingProof ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload Proof
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={disbursementData.proof_url} 
                      alt="Disbursement proof" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => setDisbursementData(prev => ({ ...prev, proof_url: '' }))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewImage(disbursementData.proof_url)}
                      className="absolute top-2 left-2 bg-[#00205B] text-white px-3 py-1 rounded-full hover:bg-opacity-90 transition-colors flex items-center gap-1 text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      View Full
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disbursement Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={disbursementData.notes}
                  onChange={(e) => setDisbursementData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add details about the disbursement (e.g., transaction ID, recipient confirmation, etc.)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00205B]"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDisbursementModal(false)
                  setSelectedLoan(null)
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={processing === selectedLoan.id}
              >
                Cancel
              </button>
              <button
                onClick={disburseLoan}
                disabled={processing === selectedLoan.id || !disbursementData.proof_url || !disbursementData.notes.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing === selectedLoan.id ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Disbursing...
                  </>
                ) : (
                  <>
                    <Banknote className="h-5 w-5" />
                    Complete Disbursement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Offline Loan Payment Modal */}
      {showRecordPaymentModal && selectedLoanForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">💵 Record Offline Loan Payment</h2>
                <button
                  onClick={() => {
                    setShowRecordPaymentModal(false)
                    setSelectedLoanForPayment(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-sm mb-2">Loan Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Member</p>
                    <p className="font-medium">{selectedLoanForPayment.users?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="text-sm">{selectedLoanForPayment.users?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Original Loan Amount</p>
                    <p className="font-bold text-lg">¥{parseFloat(selectedLoanForPayment.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Remaining Balance</p>
                    <p className="font-bold text-lg text-green-600">¥{parseFloat(selectedLoanForPayment.remaining_balance || '0').toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (¥) *
                  </label>
                  <input
                    type="number"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter payment amount"
                    step="0.01"
                    min="0"
                    max={parseFloat(selectedLoanForPayment.remaining_balance || '0')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                  />
                  {parseFloat(paymentFormData.amount) > parseFloat(selectedLoanForPayment.remaining_balance) && (
                    <p className="text-sm text-red-600 mt-1">⚠️ Amount exceeds remaining balance</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="wechat">WeChat Pay</option>
                    <option value="alipay">Alipay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Proof (Optional)</label>
                  {paymentFormData.paymentProofUrl ? (
                    <div className="relative">
                      <img
                        src={paymentFormData.paymentProofUrl}
                        alt="Payment Proof"
                        className="w-full h-48 object-cover rounded-lg border-2 border-green-300"
                      />
                      <button
                        onClick={() => setPaymentFormData(prev => ({ ...prev, paymentProofUrl: '' }))}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadPaymentProof}
                        className="hidden"
                        id="payment-proof-upload"
                        disabled={uploadingPaymentProof}
                      />
                      <label htmlFor="payment-proof-upload" className="cursor-pointer">
                        {uploadingPaymentProof ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[#00205B] mb-2" />
                            <p className="text-sm text-gray-600">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Click to upload receipt or proof</p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes about this payment..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRecordPayment}
                  disabled={
                    recordingPayment ||
                    !paymentFormData.amount ||
                    parseFloat(paymentFormData.amount) <= 0 ||
                    parseFloat(paymentFormData.amount) > parseFloat(selectedLoanForPayment.remaining_balance)
                  }
                  className="flex-1 btn-primary bg-[#00205B] hover:bg-[#001a4a] text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recordingPayment ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Recording Payment...
                    </span>
                  ) : (
                    '💵 Record Payment'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRecordPaymentModal(false)
                    setSelectedLoanForPayment(null)
                  }}
                  disabled={recordingPayment}
                  className="flex-1 btn-secondary py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment History Modal */}
      {showPaymentHistory && selectedLoanHistory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4" 
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            console.log('🟦 BACKDROP CLICKED', e.target)
            if (e.target === e.currentTarget) {
              setShowPaymentHistory(false)
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#00205B]">Payment History</h2>
                <button
                  onClick={() => {
                    console.log('🔴 CLOSE BUTTON CLICKED')
                    setShowPaymentHistory(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600">Complete payment records for this loan</p>
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-sm text-blue-800">
                  <strong>{selectedLoanHistory.users?.full_name}</strong> • {selectedLoanHistory.users?.email}
                </p>
              </div>
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
                  <Banknote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">No payments recorded yet</p>
                  <p className="text-sm text-gray-400 mt-1">Payment history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 mb-3">Payment Records ({paymentHistory.length})</h3>
                  {paymentHistory.map((payment, index) => (
                    <div key={payment.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            payment.verification_status === 'verified' ? 'bg-green-100' :
                            payment.verification_status === 'rejected' ? 'bg-red-100' :
                            'bg-yellow-100'
                          }`}>
                            <span className={`font-bold ${
                              payment.verification_status === 'verified' ? 'text-green-700' :
                              payment.verification_status === 'rejected' ? 'text-red-700' :
                              'text-yellow-700'
                            }`}>#{paymentHistory.length - index}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">¥{payment.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{formatDate(payment.payment_date)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payment.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                            payment.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.verification_status === 'verified' && '✓ Verified'}
                            {payment.verification_status === 'rejected' && '✗ Rejected'}
                            {payment.verification_status === 'pending' && '⏳ Pending'}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            {payment.payment_method === 'bank_transfer' && '🏦 Bank Transfer'}
                            {payment.payment_method === 'wechat' && '💬 WeChat'}
                            {payment.payment_method === 'alipay' && '💳 Alipay'}
                            {payment.payment_method === 'cash' && '💵 Cash'}
                          </span>
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mb-2 bg-gray-50 border border-gray-200 rounded p-2">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{payment.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {payment.payment_type === 'member' 
                            ? (payment.recorded_by === selectedLoanHistory?.user_id 
                                ? 'Recorded by self' 
                                : `Recorded by ${payment.recorded_by_user?.full_name || 'Unknown member'}`)
                            : payment.payment_type === 'treasurer_recorded'
                              ? `Recorded by ${payment.recorded_by_user?.full_name || 'Treasurer'}`
                              : `Recorded by ${payment.recorded_by_user?.full_name || 'System'}`}
                          {payment.verified_at && 
                            ` • Verified on ${formatDate(payment.verified_at)}`
                          }
                        </p>
                        {payment.payment_proof_url && (
                          <div className="flex items-center gap-2">
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
                              <Eye className="w-4 h-4" />
                              View Proof
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Revoke Button for Verified Payments */}
                      {payment.verification_status === 'verified' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleRevokeVerification(payment.id)}
                            disabled={revokingPaymentId === payment.id}
                            className="btn-secondary bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {revokingPaymentId === payment.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Revoking...</>
                            ) : (
                              <>🔄 Revoke Verification</>
                            )}
                          </button>
                          <p className="text-xs text-gray-500 mt-1">
                            This will set the payment back to pending status
                          </p>
                        </div>
                      )}
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
      
      {/* Payment Proof Image Viewer */}
      {viewProofImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-6xl w-full">
            <button
              onClick={() => setViewProofImage(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
            <img
              src={viewProofImage}
              alt="Payment Proof"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
