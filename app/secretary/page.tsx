'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import BudgetProposalsPanel from '@/components/BudgetProposalsPanel'
import { Loader2, Users, FileText, UserCheck, UserX, GraduationCap, Calendar, Video, MapPin, Plus, Megaphone, Cake, Upload, Eye, Edit, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { isNonMemberApproved, passesVerifiedAttendeeFilter } from '@/lib/event-attendance'
import { formatTshirtPaymentStatus } from '@/lib/event-tshirts'

type SecretaryTab =
  | 'members'
  | 'meetings'
  | 'events'
  | 'announcements'
  | 'birthdays'
  | 'loans'
  | 'committees'
  | 'budget_proposals'
  | 'non_member_registrations'

const SECRETARY_TABS: SecretaryTab[] = [
  'members',
  'meetings',
  'events',
  'announcements', // nested under Meetings (URL compat)
  'birthdays',
  'loans',
  'committees',
  'budget_proposals',
  'non_member_registrations', // nested under Events (URL compat)
]

type EventsSubTab = 'manage' | 'non_members'
type MeetingsSubTab = 'manage' | 'announcements'

export default function SecretaryPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<SecretaryTab>('members')
  const [eventsSubTab, setEventsSubTab] = useState<EventsSubTab>('manage')
  const [meetingsSubTab, setMeetingsSubTab] = useState<MeetingsSubTab>('manage')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') as SecretaryTab | null
    if (tab && SECRETARY_TABS.includes(tab)) {
      if (tab === 'non_member_registrations') {
        setActiveTab('events')
        setEventsSubTab('non_members')
      } else if (tab === 'announcements') {
        setActiveTab('meetings')
        setMeetingsSubTab('announcements')
      } else {
        setActiveTab(tab)
        if (tab === 'events') setEventsSubTab('manage')
        if (tab === 'meetings') setMeetingsSubTab('manage')
      }
    }
  }, [])

  const openEventsTab = (sub: EventsSubTab = 'manage') => {
    setActiveTab('events')
    setEventsSubTab(sub)
  }

  const openMeetingsTab = (sub: MeetingsSubTab = 'manage') => {
    setActiveTab(sub === 'announcements' ? 'announcements' : 'meetings')
    setMeetingsSubTab(sub)
  }
  
  // Meetings state
  const [meetings, setMeetings] = useState<any[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingsPage, setMeetingsPage] = useState(1)
  const meetingsPerPage = 10
  const [editingMeeting, setEditingMeeting] = useState<any>(null)
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    meeting_date: '',
    meeting_type: 'in_person',
    zoom_link: '',
    zoom_meeting_id: '',
    zoom_password: '',
    location: '',
    is_public: true
  })
  
  // Meeting attendance state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<any>(null)
  const [meetingAttendees, setMeetingAttendees] = useState<any[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [attendeeToRemove, setAttendeeToRemove] = useState<string | null>(null)
  
  // Event attendance state
  const [showEventAttendanceModal, setShowEventAttendanceModal] = useState(false)
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<any>(null)
  const [eventAttendees, setEventAttendees] = useState<any[]>([])
  const [loadingEventAttendance, setLoadingEventAttendance] = useState(false)
  const [showRemoveEventAttendeeConfirm, setShowRemoveEventAttendeeConfirm] = useState(false)
  const [eventAttendeeToRemove, setEventAttendeeToRemove] = useState<string | null>(null)
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' })
  
  // Events state
  const [events, setEvents] = useState<any[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [viewingEvent, setViewingEvent] = useState<any>(null)
  const [showViewEvent, setShowViewEvent] = useState(false)
  const [eventsPage, setEventsPage] = useState(1)
  const eventsPerPage = 10
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  const [uploadingFile, setUploadingFile] = useState(false)
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [registrationsPage, setRegistrationsPage] = useState(1)
  const registrationsPerPage = 10
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    event_type: 'free',
    event_format: 'in_person' as 'in_person' | 'online' | 'hybrid',
    online_link: '',
    online_meeting_id: '',
    online_password: '',
    requires_registration: false,
    registration_deadline: '',
    event_file_url: '',
    capacity: '',
    waitlist_enabled: false,
    cover_image_url: '',
    allow_public_registration: false,
    require_guest_approval: true,
    payment_qr_code_url: '',
    tshirt_enabled: false,
    tshirt_pricing: 'free' as 'free' | 'paid',
    tshirt_price: '',
    tshirt_sizes: ['S', 'M', 'L', 'XL', 'XXL'] as string[],
    tshirt_required: false,
    tshirt_image_url: ''
  })
  
  // New feature states
  const [eventCategories, setEventCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInEvent, setCheckInEvent] = useState<any>(null)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState({
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    exceptions: [] as string[]
  })
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [viewingAnnouncement, setViewingAnnouncement] = useState<any>(null)
  const [showViewAnnouncement, setShowViewAnnouncement] = useState(false)
  const [announcementsPage, setAnnouncementsPage] = useState(1)
  const announcementsPerPage = 5
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    expires_at: ''
  })
  
  // Birthdays state
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([])
  const [birthdayPhotos, setBirthdayPhotos] = useState<any[]>([])
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<{id: string, url: string} | null>(null)
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<any>(null)
  
  // Ticket Management state
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [selectedEventForTickets, setSelectedEventForTickets] = useState<any>(null)
  const [eventTickets, setEventTickets] = useState<any[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<any>(null)
  const [deletingTicket, setDeletingTicket] = useState<any>(null)
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [updatingTicket, setUpdatingTicket] = useState(false)
  const [deletingTicketInProgress, setDeletingTicketInProgress] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity_available: '',
    sale_start_date: '',
    sale_end_date: '',
    ticket_image_url: '',
    payment_methods: '',
    payment_instructions: ''
  })
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  
  // Loans state
  const [loans, setLoans] = useState<any[]>([])
  const [showLoanDetails, setShowLoanDetails] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [loanRejectionReason, setLoanRejectionReason] = useState('')
  const [loanRequiresDuesClear, setLoanRequiresDuesClear] = useState(true)
  const [loanMinimumMonths, setLoanMinimumMonths] = useState(3)
  const [showLoanSettings, setShowLoanSettings] = useState(false)
  const [savingLoanSettings, setSavingLoanSettings] = useState(false)
  const [selectedDuesYear, setSelectedDuesYear] = useState(new Date().getFullYear())
  const [loadingDuesData, setLoadingDuesData] = useState(false)
  
  // Loan Statistics state
  const [loanStatistics, setLoanStatistics] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [showLoanStats, setShowLoanStats] = useState(true)
  
  // Payment Settings state
  const [showPaymentSettings, setShowPaymentSettings] = useState(false)
  const [paymentAmounts, setPaymentAmounts] = useState({
    csc: 0,
    mofcom: 0,
    bilateral: 0,
    self: 0,
    partial: 0,
    other: 0
  })
  const [rankAmounts, setRankAmounts] = useState({
    president: 0,
    vice_president: 0,
    general_secretary: 0,
    treasurer: 0,
    finance_secretary: 0,
    member: 0
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Reload committees when payment settings modal opens
  useEffect(() => {
    if (showPaymentSettings) {
      loadCommittees()
      loadPaymentAmounts()
      loadAvailableRanks()
    }
  }, [showPaymentSettings])

  // Load committees and members when budget_proposals tab is active
  useEffect(() => {
    if (activeTab === 'budget_proposals') {
      loadCommittees()
      fetchBudgetProposals()
    }
  }, [activeTab])

  // Fetch committees separately for payment settings
  const loadCommittees = async () => {
    try {
      const committeesResponse = await fetch('/api/committees')
      const committeesData = await committeesResponse.json()
      console.log('Committees API response:', committeesData)
      
      if (committeesData.committees) {
        setCommittees(committeesData.committees)

        // Never call createAdminClient from the browser — use the API route
        console.log('Fetching active users...')
        const usersResponse = await fetch('/api/users/active')
        console.log('Users response status:', usersResponse.status, usersResponse.ok)
        
        if (!usersResponse.ok) {
          const errBody = await usersResponse.json().catch(() => ({}))
          console.error('Error fetching users:', errBody.error || usersResponse.statusText)
          const fallbackMembers = committeesData.committees.flatMap((c: any) => {
            if (c.members && Array.isArray(c.members)) {
              return c.members.map((m: any) => m.user).filter(Boolean)
            }
            return []
          })
          console.log('Using fallback members:', fallbackMembers.length)
          setAllMembers(fallbackMembers)
          return
        }

        const usersData = await usersResponse.json()
        console.log('Active users loaded:', usersData.users?.length || 0, 'users')
        setAllMembers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error loading committees:', error)
    }
  }

  // Rank Assignment state
  const [showRankAssignModal, setShowRankAssignModal] = useState(false)
  const [selectedMemberForRank, setSelectedMemberForRank] = useState<any>(null)
  const [availableRanks, setAvailableRanks] = useState<any[]>([])
  const [selectedRankId, setSelectedRankId] = useState<string>('')
  const [assigningRank, setAssigningRank] = useState(false)
  
  // Committees state
  const [committees, setCommittees] = useState<any[]>([])
  const [showCommitteeModal, setShowCommitteeModal] = useState(false)
  const [committeeForm, setCommitteeForm] = useState({
    committee_name: '',
    description: '',
    monthly_due: 0
  })
  const [editingCommittee, setEditingCommittee] = useState<any>(null)
  const [committeeMembers, setCommitteeMembers] = useState<any[]>([])
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null)
  const [committeePage, setCommitteePage] = useState(1)
  const committeesPerPage = 5
  
  // Budget Proposals state
  const [proposals, setProposals] = useState<any[]>([])
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showViewProposalModal, setShowViewProposalModal] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)
  const [editingProposal, setEditingProposal] = useState<any>(null)
  const [budgetProposalCommitteeMembers, setBudgetProposalCommitteeMembers] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([]) // All members across all committees
  const [proposalForm, setProposalForm] = useState({
    committee_id: '',
    budget_head_id: '',
    title: '',
    description: '',
    items: [] as any[]
  })
  const [proposalPage, setProposalPage] = useState(1)
  const proposalsPerPage = 10
  const [showPaymentModal, setShowPaymentModal] = useState(false)
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

  // Member CRUD state
  const [showEditMember, setShowEditMember] = useState(false)
  const [showViewMember, setShowViewMember] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const [viewingMember, setViewingMember] = useState<any>(null)
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    email: '',
    role: 'member',
    status: 'active',
    member_id: '',
    university: '',
    phone: '',
    age: '',
    address: '',
    date_of_birth: ''
  })

  // Optimized fetch functions - only reload what's needed
  const fetchEventsOnly = async () => {
    try {
      console.log('Fetching events...')
      const eventsResponse = await fetch('/api/events')
      console.log('Events response status:', eventsResponse.status)
      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json()
        console.log('Events result:', eventsResult)
        setEvents(eventsResult.events || [])
      } else {
        const errorText = await eventsResponse.text()
        console.error('Failed to fetch events:', eventsResponse.status, errorText)
        toast.error('Failed to load events')
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to load events')
    }
  }

  const fetchMeetingsOnly = async () => {
    try {
      const meetingsResponse = await fetch('/api/meetings')
      if (meetingsResponse.ok) {
        const meetingsResult = await meetingsResponse.json()
        setMeetings(meetingsResult.meetings || [])
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    }
  }

  // Fetch event categories
  const fetchEventCategories = async () => {
    try {
      const response = await fetch('/api/event-categories')
      if (response.ok) {
        const result = await response.json()
        setEventCategories(result.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Update event status
  const updateEventStatus = async (eventId: number, status: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast.success(`Event marked as ${status}`)
      fetchEventsOnly()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update event status')
    }
  }

  // Assign categories to event
  const assignCategories = async (eventId: number, categoryIds: number[]) => {
    try {
      const response = await fetch(`/api/events/${eventId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_ids: categoryIds })
      })

      if (!response.ok) {
        throw new Error('Failed to assign categories')
      }

      toast.success('Categories updated')
      fetchEventsOnly()
    } catch (error) {
      console.error('Error assigning categories:', error)
      toast.error('Failed to update categories')
    }
  }

  // Schedule reminders for event
  const scheduleReminders = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/reminders`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule reminders')
      }

      const result = await response.json()
      toast.success(result.message)
    } catch (error: any) {
      console.error('Error scheduling reminders:', error)
      toast.error(error.message || 'Failed to schedule reminders')
    }
  }

  // Generate certificates for event
  const handleGenerateCertificates = async (event: any) => {
    if (!confirm(`Generate certificates for all attendees of "${event.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/events/${event.id}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk_generate: true,
          certificate_type: 'attendance',
          hours_credited: 2
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate certificates')
      }

      const result = await response.json()
      toast.success(result.message)
    } catch (error: any) {
      console.error('Error generating certificates:', error)
      toast.error(error.message || 'Failed to generate certificates')
    }
  }

  // View waitlist
  const handleViewWaitlist = async (event: any) => {
    try {
      console.log('[Waitlist] Fetching waitlist for event:', event.id)
      const response = await fetch(`/api/events/${event.id}/waitlist`)
      
      console.log('[Waitlist] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Waitlist] Error response:', errorData)
        throw new Error(errorData.error || `Failed to fetch waitlist (${response.status})`)
      }

      const result = await response.json()
      console.log('[Waitlist] Success, data:', result)
      
      if (result.waitlist.length === 0) {
        toast.error('No one on waitlist')
        return
      }

      const availableSpots = result.stats?.available_spots || 0
      const promote = confirm(`${result.waitlist.length} people on waitlist. Promote first ${availableSpots} to registered status?`)
      
      if (promote) {
        await promoteFromWaitlist(event.id, availableSpots)
      }
    } catch (error: any) {
      console.error('[Waitlist] Error viewing waitlist:', error)
      toast.error(error.message || 'Failed to view waitlist')
    }
  }

  // Promote from waitlist
  const promoteFromWaitlist = async (eventId: number, count: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/waitlist/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promote_count: count })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to promote from waitlist')
      }

      const result = await response.json()
      toast.success(result.message)
      fetchEventsOnly()
    } catch (error: any) {
      console.error('Error promoting from waitlist:', error)
      toast.error(error.message || 'Failed to promote from waitlist')
    }
  }

  useEffect(() => {
    if (userId) {
      // Only auth + members on mount — other tabs load on demand (big speed win)
      fetchData()
    }
  }, [userId])

  // Lazy-load tab data so opening secretary doesn't wait on every API
  useEffect(() => {
    console.log('[Secretary] Tab changed to:', activeTab, 'user:', !!user, 'loading:', loading)
    if (!user || loading) {
      console.log('[Secretary] Skipping tab load - user:', !!user, 'loading:', loading)
      return
    }
    console.log('[Secretary] Calling loadSecretaryTab for:', activeTab)
    void loadSecretaryTab(activeTab)
  }, [activeTab, user, loading])

  const savePaymentAmounts = async () => {
    setSavingSettings(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      console.log('Saving payment amounts:', paymentAmounts)
      console.log('Saving rank amounts:', rankAmounts)

      // Save scholarship status amounts to dues_structure
      const scholarshipUpdates = [
        { category_type: 'scholarship', category_value: 'CSC', amount: paymentAmounts.csc },
        { category_type: 'scholarship', category_value: 'MOFCOM', amount: paymentAmounts.mofcom },
        { category_type: 'scholarship', category_value: 'BILATERAL', amount: paymentAmounts.bilateral },
        { category_type: 'scholarship', category_value: 'SELF', amount: paymentAmounts.self },
        { category_type: 'scholarship', category_value: 'PARTIAL', amount: paymentAmounts.partial },
        { category_type: 'scholarship', category_value: 'OTHER', amount: paymentAmounts.other }
      ]

      for (const update of scholarshipUpdates) {
        const { error } = await supabase
          .from('dues_structure')
          .upsert(update, { onConflict: 'category_type,category_value' })
        if (error) {
          console.error('Error saving scholarship amount:', error)
          throw error
        }
      }

      // Save rank amounts to dues_structure
      const rankUpdates = [
        { category_type: 'rank', category_value: 'President', amount: rankAmounts.president },
        { category_type: 'rank', category_value: 'Vice President', amount: rankAmounts.vice_president },
        { category_type: 'rank', category_value: 'General Secretary', amount: rankAmounts.general_secretary },
        { category_type: 'rank', category_value: 'Treasurer', amount: rankAmounts.treasurer },
        { category_type: 'rank', category_value: 'Finance Secretary', amount: rankAmounts.finance_secretary },
        { category_type: 'rank', category_value: 'Member', amount: rankAmounts.member }
      ]

      for (const update of rankUpdates) {
        const { error } = await supabase
          .from('dues_structure')
          .upsert(update, { onConflict: 'category_type,category_value' })
        if (error) {
          console.error('Error saving rank amount:', error)
          throw error
        }
      }

      // Save committee dues to committees table
      for (const committee of committees) {
        const { error } = await supabase
          .from('committees')
          .update({ monthly_due: committee.monthly_due })
          .eq('id', committee.id)
        if (error) {
          console.error('Error saving committee due:', error)
          throw error
        }
      }

      toast.success('Payment amounts saved successfully')
      setShowPaymentSettings(false)
    } catch (error) {
      console.error('Failed to save payment amounts:', error)
      toast.error('Failed to save payment amounts: ' + (error as any).message)
    } finally {
      setSavingSettings(false)
    }
  }

  const loadPaymentAmounts = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Load scholarship status amounts from dues_structure
      const { data: scholarshipData, error: scholarshipError } = await supabase
        .from('dues_structure')
        .select('category_value, amount')
        .eq('category_type', 'scholarship')

      if (!scholarshipError && scholarshipData) {
        const amounts: any = {
          csc: 0,
          mofcom: 0,
          bilateral: 0,
          self: 100,
          partial: 50,
          other: 100
        }
        scholarshipData.forEach((item: any) => {
          const key = item.category_value.toLowerCase()
          if (key === 'csc') amounts.csc = parseFloat(item.amount) || 0
          else if (key === 'mofcom') amounts.mofcom = parseFloat(item.amount) || 0
          else if (key === 'bilateral') amounts.bilateral = parseFloat(item.amount) || 0
          else if (key === 'self') amounts.self = parseFloat(item.amount) || 0
          else if (key === 'partial') amounts.partial = parseFloat(item.amount) || 0
          else if (key === 'other') amounts.other = parseFloat(item.amount) || 0
        })
        setPaymentAmounts(amounts)
      }

      // Rank amounts removed - no longer needed
    } catch (error) {
      console.error('Error loading payment amounts:', error)
    }
  }

  // Rank assignment removed - only role-based system now

  // Payment amounts / ranks load when their modals open (not on every page mount)

  const approveUser = async (userId: string) => {
    setProcessing(userId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', userId)
      
      if (error) throw error
      
      toast.success('User approved successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to approve user')
    } finally {
      setProcessing(null)
    }
  }

  const rejectUser = async (userId: string) => {
    setProcessing(userId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('users')
        .update({ status: 'dropped' })
        .eq('id', userId)
      
      if (error) throw error
      
      toast.success('User rejected')
      fetchData()
    } catch (error) {
      toast.error('Failed to reject user')
    } finally {
      setProcessing(null)
    }
  }

  // Meeting functions
  const createMeeting = async () => {
    try {
      // Validate meeting date
      if (!meetingForm.meeting_date) {
        toast.error('Please select both date and time')
        return
      }

      // Validate title and meeting type
      if (!meetingForm.title) {
        toast.error('Please enter a meeting title')
        return
      }

      if (!meetingForm.meeting_type) {
        toast.error('Please select a meeting type')
        return
      }

      // Check if the date/time format is valid
      const meetingDate = new Date(meetingForm.meeting_date)
      if (isNaN(meetingDate.getTime())) {
        toast.error('Invalid date or time format')
        console.error('Invalid meeting_date:', meetingForm.meeting_date)
        return
      }
      
      const payload = {
        title: meetingForm.title,
        description: meetingForm.description,
        meeting_date: meetingDate.toISOString(),
        meeting_type: meetingForm.meeting_type,
        zoom_link: meetingForm.zoom_link || null,
        zoom_meeting_id: meetingForm.zoom_meeting_id || null,
        zoom_password: meetingForm.zoom_password || null,
        location: meetingForm.location || null
      }

      console.log('Creating meeting with payload:', payload)
      
      // Use API to create meeting (bypasses RLS)
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error response:', errorData)
        throw new Error(errorData.error || 'Failed to create meeting')
      }
      
      const result = await response.json()
      console.log('Meeting created:', result)
      
      toast.success('Meeting created successfully')
      setShowMeetingForm(false)
      setEditingMeeting(null)
      setMeetingForm({
        title: '',
        description: '',
        meeting_date: '',
        meeting_type: 'in_person',
        zoom_link: '',
        zoom_meeting_id: '',
        zoom_meeting_password: '',
        location: '',
        is_public: true
      })
      fetchMeetingsOnly() // Only reload meetings
    } catch (error: any) {
      console.error('Error creating meeting:', error)
      toast.error(error.message || 'Failed to create meeting')
    }
  }

  const deleteMeeting = async (id: string) => {
    try {
      // Use API to delete meeting (bypasses RLS)
      const response = await fetch(`/api/meetings?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete meeting')
      }
      
      toast.success('Meeting deleted')
      fetchMeetingsOnly() // Only reload meetings
    } catch (error: any) {
      console.error('Error deleting meeting:', error)
      toast.error(error.message || 'Failed to delete meeting')
    }
  }

  const updateMeeting = async () => {
    try {
      if (!meetingForm.meeting_date || !meetingForm.title || !meetingForm.meeting_type) {
        toast.error('Please fill in all required fields')
        return
      }

      const meetingDate = new Date(meetingForm.meeting_date)
      if (isNaN(meetingDate.getTime())) {
        toast.error('Invalid date or time format')
        return
      }

      const payload = {
        id: editingMeeting.id,
        title: meetingForm.title,
        description: meetingForm.description,
        meeting_date: meetingDate.toISOString(),
        meeting_type: meetingForm.meeting_type,
        zoom_link: meetingForm.zoom_link || null,
        zoom_meeting_id: meetingForm.zoom_meeting_id || null,
        zoom_password: meetingForm.zoom_password || null,
        location: meetingForm.location || null,
        is_public: meetingForm.is_public
      }

      const response = await fetch('/api/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update meeting')
      }

      toast.success('Meeting updated successfully')
      setShowMeetingForm(false)
      setEditingMeeting(null)
      setMeetingForm({
        title: '',
        description: '',
        meeting_date: '',
        meeting_type: 'in_person',
        zoom_link: '',
        zoom_meeting_id: '',
        zoom_password: '',
        location: '',
        is_public: true
      })
      fetchMeetingsOnly() // Only reload meetings
    } catch (error: any) {
      console.error('Error updating meeting:', error)
      toast.error(error.message || 'Failed to update meeting')
    }
  }

  const handleEditMeeting = (meeting: any) => {
    setEditingMeeting(meeting)
    setMeetingForm({
      title: meeting.title,
      description: meeting.description || '',
      meeting_date: meeting.meeting_date?.split('.')[0] || '', // Remove milliseconds
      meeting_type: meeting.meeting_type,
      zoom_link: meeting.zoom_link || '',
      zoom_meeting_id: meeting.zoom_meeting_id || '',
      zoom_password: meeting.zoom_password || '',
      location: meeting.location || '',
      is_public: meeting.is_public !== false // Default to true if not set
    })
    setShowMeetingForm(true)
  }

  const toggleMeetingPublic = async (meeting: any) => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: meeting.id,
          is_public: !meeting.is_public
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update meeting')
      }

      toast.success(meeting.is_public ? 'Meeting is now private' : 'Meeting is now public')
      fetchData()
    } catch (error: any) {
      console.error('Error toggling meeting visibility:', error)
      toast.error(error.message || 'Failed to update meeting')
    }
  }

  // Meeting Attendance Functions
  const openAttendanceModal = async (meeting: any) => {
    setSelectedMeetingForAttendance(meeting)
    setShowAttendanceModal(true)
    await fetchMeetingAttendance(meeting.id)
  }

  const fetchMeetingAttendance = async (meetingId: string) => {
    setLoadingAttendance(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data, error } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          users!meeting_attendance_user_id_fkey (
            id,
            full_name,
            email,
            members_profile (
              member_id,
              phone,
              photo_url
            )
          )
        `)
        .eq('meeting_id', meetingId)
        .order('registered_at', { ascending: false })
      
      if (error) throw error
      
      setMeetingAttendees(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Failed to load attendance')
    } finally {
      setLoadingAttendance(false)
    }
  }

  const toggleAttendance = async (attendanceId: string, currentStatus: boolean) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()
      
      const { error } = await supabase
        .from('meeting_attendance')
        .update({
          attended: !currentStatus,
          marked_attended_at: !currentStatus ? new Date().toISOString() : null,
          marked_by: !currentStatus ? currentUserData?.id : null
        })
        .eq('id', attendanceId)
      
      if (error) throw error
      
      toast.success(currentStatus ? 'Marked as not attended' : 'Marked as attended')
      
      // Refresh attendance list
      if (selectedMeetingForAttendance) {
        await fetchMeetingAttendance(selectedMeetingForAttendance.id)
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('Failed to update attendance')
    }
  }

  const addAttendeeManually = async (selectedUserId: string) => {
    if (!selectedMeetingForAttendance) return
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Get current logged-in secretary's database ID from Clerk userId
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      
      const { data, error } = await supabase
        .from('meeting_attendance')
        .insert({
          meeting_id: selectedMeetingForAttendance.id,
          user_id: selectedUserId,
          attended: true,
          marked_attended_at: new Date().toISOString(),
          marked_by: currentUserData?.id
        })
        .select()
      
      if (error) {
        console.error('Supabase error details:', error)
        if (error.code === '23505') { // Unique constraint violation
          toast.error('This member is already in the attendance list')
        } else {
          toast.error(`Failed to add attendee: ${error.message || 'Unknown error'}`)
        }
        return
      }
      
      toast.success('Attendee added successfully')
      await fetchMeetingAttendance(selectedMeetingForAttendance.id)
    } catch (error: any) {
      console.error('Error adding attendee:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      toast.error(error?.message || 'Failed to add attendee')
    }
  }

  const removeAttendee = async (attendanceId: string) => {
    setAttendeeToRemove(attendanceId)
    setShowRemoveConfirm(true)
  }

  const confirmRemoveAttendee = async () => {
    if (!attendeeToRemove) return
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('id', attendeeToRemove)
      
      if (error) throw error
      
      toast.success('Attendee removed')
      
      if (selectedMeetingForAttendance) {
        await fetchMeetingAttendance(selectedMeetingForAttendance.id)
      }
    } catch (error) {
      console.error('Error removing attendee:', error)
      toast.error('Failed to remove attendee')
    } finally {
      setShowRemoveConfirm(false)
      setAttendeeToRemove(null)
    }
  }

  const exportToExcel = () => {
    if (!selectedMeetingForAttendance || meetingAttendees.length === 0) {
      toast.error('No attendance data to export')
      return
    }

    try {
      // Prepare data for export
      const exportData = meetingAttendees.map((attendee, index) => ({
        'No.': index + 1,
        'Full Name': attendee.users?.full_name || 'N/A',
        'Member ID': attendee.users?.members_profile?.[0]?.member_id || 'N/A',
        'Role': attendee.users?.role === 'admin' 
          ? 'Member' 
          : (attendee.users?.role ? attendee.users.role.charAt(0).toUpperCase() + attendee.users.role.slice(1) : 'Member'),
        'Email': attendee.users?.email || 'N/A',
        'Phone': attendee.users?.members_profile?.[0]?.phone ? `="${attendee.users.members_profile[0].phone}"` : 'N/A',
        'Registered Date': new Date(attendee.registered_at).toLocaleDateString(),
        'Attended': attendee.attended ? 'Yes' : 'No',
        'Marked Date': attendee.marked_attended_at 
          ? new Date(attendee.marked_attended_at).toLocaleDateString() 
          : 'N/A'
      }))

      // Helper function to properly escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      // Create CSV content
      const headers = Object.keys(exportData[0])
      const csvContent = [
        // Meeting info header
        escapeCSV(`Meeting: ${selectedMeetingForAttendance.title}`),
        escapeCSV(`Date: ${new Date(selectedMeetingForAttendance.meeting_date).toLocaleString()}`),
        escapeCSV(`Total Registered: ${meetingAttendees.length}`),
        escapeCSV(`Total Attended: ${meetingAttendees.filter(a => a.attended).length}`),
        '', // Empty row
        // Column headers
        headers.map(h => escapeCSV(h)).join(','),
        // Data rows
        ...exportData.map(row => 
          headers.map(header => escapeCSV(row[header as keyof typeof row])).join(',')
        )
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `${selectedMeetingForAttendance.title.replace(/[^a-z0-9]/gi, '_')}_Attendance_${new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Attendance list exported successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Failed to export attendance list')
    }
  }

  // Event Attendance Functions
  const openEventAttendanceModal = async (event: any) => {
    setSelectedEventForAttendance(event)
    setShowEventAttendanceModal(true)
    console.log('[Open Attendance Modal] Opening modal for event:', event.id, event.title)
    await fetchEventAttendance(event.id)
  }

  const fetchEventAttendance = async (eventId: number) => {
    setLoadingEventAttendance(true)
    try {
      console.log('Fetching attendance for event:', eventId)

      // Fetch check-ins first
      const checkinsResponse = await fetch(`/api/events/${eventId}/checkins`)
      const checkinsData = checkinsResponse.ok ? await checkinsResponse.json() : { checkins: [] }
      const checkins = checkinsData.checkins || []
      console.log('Check-ins:', checkins)
      
      // Free vs paid-like (ticket_only, hybrid, registration_required)
      const event = events.find(e => e.id === eventId)
      const isFreeEvent = event?.event_type === 'free'
      console.log('Event type:', event?.event_type, 'Is free event:', isFreeEvent)
      
      const attendees: any[] = []
      
      // All event types use the unified registrations API (free + tickets + guests + non-members)
      {
        console.log('Fetching event registrations for attendance, event:', eventId)
        const regResponse = await fetch(`/api/event-registrations?eventId=${eventId}`)
        
        if (!regResponse.ok) {
          const errorData = await regResponse.json().catch(() => ({}))
          console.error('Failed to fetch registrations:', regResponse.status, errorData)
          toast.error(`Failed to load attendance data: ${errorData.error || regResponse.statusText}`)
          setLoadingEventAttendance(false)
          return
        }
        
        const regData = await regResponse.json()
        const registrations = regData.registrations || regData.attendees || []
        console.log('Event registrations for attendance:', registrations.length)
        
        // Same verified rules as check-in (shared helper). Include refunded rows for reporting.
        const filteredRegistrations = registrations.filter((reg: any) =>
          passesVerifiedAttendeeFilter(reg, {
            isFreeEvent,
            includeRefundedForReport: !isFreeEvent,
          })
        )
        
        console.log(`Filtered ${registrations.length} registrations to ${filteredRegistrations.length} verified for ${isFreeEvent ? 'free' : 'ticket-only'} event`)
        filteredRegistrations.forEach((reg: any, idx: number) => {
          console.log(`[Attendance] Filtered reg[${idx}]: type=${reg.type}, full_name=${reg.full_name}, email=${reg.email}, status=${reg.status}, payment_status=${reg.payment_status}, amount_paid=${reg.amount_paid}`)
        })
        
        // Convert registrations to attendance format
        filteredRegistrations.forEach((reg: any) => {
          // For ticket_only events, check check-ins by user_id OR registration_id (for non-members)
          let memberCheckin = null
          
          if (reg.user_id) {
            // Member registration - check by user_id
            memberCheckin = checkins.find((c: any) => c.user_id === reg.user_id)
          } else if (reg.id && reg.type === 'non_member') {
            // Non-member registration - check by registration_id
            memberCheckin = checkins.find((c: any) => 
              c.registration_id === reg.id && c.registration_type === 'non_member'
            )
          }
          
          console.log('Processing registration:', {
            reg_id: reg.id,
            reg_type: reg.type,
            user_id: reg.user_id,
            full_name: reg.full_name || reg.user?.full_name,
            email: reg.email || reg.user?.email,
            phone: reg.phone_number || reg.user?.phone_number,
            memberCheckin,
            reg
          })
          
          // Tickets: prefer catalog_price from API. Guests: their own amount_paid.
          let amountPaid = 0
          if (reg.type === 'ticket') {
            amountPaid =
              parseFloat(String(reg.catalog_price ?? reg.unit_price ?? reg.amount_paid ?? 0)) || 0
          } else if (reg.type === 'guest') {
            amountPaid =
              reg.payment_status === 'refunded'
                ? 0
                : (parseFloat(String(reg.amount_paid ?? 0)) || 0)
          } else {
            amountPaid = parseFloat(String(reg.amount_paid ?? 0)) || 0
          }

          // Never coerce guest/ticket refunded → paid via status === 'confirmed'
          let paymentStatus: string | null = reg.payment_status || null
          if (reg.type === 'non_member') {
            paymentStatus = isNonMemberApproved(reg.status)
              ? 'paid'
              : (reg.status || 'pending')
          } else if (!paymentStatus && reg.status === 'confirmed') {
            paymentStatus = 'paid'
          } else if (!paymentStatus) {
            paymentStatus = reg.status || null
          }

          attendees.push({
            id: `registration-${reg.id}`,
            event_id: eventId,
            user_id: reg.user_id,
            full_name: reg.full_name || reg.user?.full_name || 'Unknown',
            email: reg.email || reg.user?.email || 'No Email',
            member_id: reg.user?.members_profile?.[0]?.member_id || null,
            phone: reg.phone_number || reg.user?.phone_number || null,
            guest_name: reg.type === 'guest' ? (reg.full_name || null) : null,
            guest_email: reg.type === 'guest' ? (reg.email || null) : null,
            guest_phone: reg.type === 'guest' ? (reg.phone_number || null) : null,
            attended: !!memberCheckin || !!reg.checked_in,
            marked_attended_at: memberCheckin?.checked_in_at || reg.checked_in_at || null,
            created_at: reg.registered_at || reg.created_at,
            payment_status: paymentStatus,
            amount_paid: amountPaid,
            refund_amount: reg.refund_amount || null,
            refund_reason: reg.refund_reason || null,
            status: reg.status,
            type: reg.type, // Keep the original type (non_member, free, ticket) for display
            isGuest: reg.type === 'guest',
            isTicketHolder: reg.type === 'ticket',
            registration_id: reg.id,
            role: reg.user?.role || 'member',
            purchased_by_name: reg.guest_of || null,
            notes: reg.type === 'guest' && reg.guest_of ? `Brought by ${reg.guest_of}` : (reg.notes || null),
            tshirt_wanted: reg.tshirt_wanted || false,
            tshirt_size: reg.tshirt_size || null,
            tshirt_payment_status: reg.tshirt_payment_status || null,
            tshirt_picked_up: reg.tshirt_picked_up || false
          })
        })
      }
      
      console.log('Final attendees:', attendees)
      attendees.forEach((a: any, idx: number) => {
        console.log(`[Attendance] Final attendee[${idx}]: full_name=${a.full_name}, email=${a.email}, amount_paid=${a.amount_paid}, payment_status=${a.payment_status}, user_id=${a.user_id}`)
      })
      setEventAttendees(attendees)
      
      const registeredCount = attendees.length
      const checkedInCount = attendees.filter(a => a.attended).length
      const pendingApproval = attendees.filter(a => (a as any).needsApproval).length
      const refundedCount = attendees.filter(a => a.payment_status === 'refunded').length
      
      if (pendingApproval > 0) {
        toast.success(`${registeredCount} registered (${checkedInCount} checked in, ${pendingApproval} guests need approval, ${refundedCount} refunded)`)
      } else if (registeredCount > 0) {
        toast.success(`${registeredCount} registered, ${checkedInCount} checked in${refundedCount > 0 ? `, ${refundedCount} refunded` : ''}`)
      } else {
        toast('No attendees found for this event')
      }
    } catch (error) {
      console.error('Error fetching event attendance:', error)
      toast.error('Failed to load event attendance')
    } finally {
      setLoadingEventAttendance(false)
    }
  }

  const toggleEventAttendance = async (attendanceId: number, currentStatus: boolean) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      
      const { error } = await supabase
        .from('event_attendance')
        .update({
          attended: !currentStatus,
          marked_attended_at: !currentStatus ? new Date().toISOString() : null,
          marked_by: !currentStatus ? currentUserData?.id : null
        })
        .eq('id', attendanceId)
      
      if (error) throw error
      
      toast.success(currentStatus ? 'Marked as not attended' : 'Marked as attended')
      
      if (selectedEventForAttendance) {
        await fetchEventAttendance(selectedEventForAttendance.id)
      }
    } catch (error) {
      console.error('Error updating event attendance:', error)
      toast.error('Failed to update attendance')
    }
  }

  const addEventAttendeeManually = async (selectedUserId: string) => {
    if (!selectedEventForAttendance) return
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      
      const { data, error } = await supabase
        .from('event_attendance')
        .insert({
          event_id: selectedEventForAttendance.id,
          user_id: selectedUserId,
          attended: true,
          marked_attended_at: new Date().toISOString(),
          marked_by: currentUserData?.id
        })
        .select()
      
      if (error) {
        console.error('Supabase error details:', error)
        if (error.code === '23505') {
          toast.error('This member is already in the attendance list')
        } else {
          toast.error(`Failed to add attendee: ${error.message || 'Unknown error'}`)
        }
        return
      }
      
      toast.success('Attendee added successfully')
      await fetchEventAttendance(selectedEventForAttendance.id)
    } catch (error: any) {
      console.error('Error adding event attendee:', error)
      toast.error(error?.message || 'Failed to add attendee')
    }
  }

  const addEventGuestManually = async () => {
    if (!selectedEventForAttendance) return
    if (!guestForm.name || !guestForm.email) {
      toast.error('Please provide guest name and email')
      return
    }
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      
      const { data, error } = await supabase
        .from('event_attendance')
        .insert({
          event_id: selectedEventForAttendance.id,
          user_id: null,
          guest_name: guestForm.name,
          guest_email: guestForm.email,
          guest_phone: guestForm.phone || null,
          attended: true,
          marked_attended_at: new Date().toISOString(),
          marked_by: currentUserData?.id
        })
        .select()
      
      if (error) {
        console.error('Supabase error details:', error)
        toast.error(`Failed to add guest: ${error.message || 'Unknown error'}`)
        return
      }
      
      toast.success('Guest added successfully')
      setGuestForm({ name: '', email: '', phone: '' })
      await fetchEventAttendance(selectedEventForAttendance.id)
    } catch (error: any) {
      console.error('Error adding guest:', error)
      toast.error(error?.message || 'Failed to add guest')
    }
  }

  const addEventGuestFromTicket = async (guestAttendee: any) => {
    if (!selectedEventForAttendance) return
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single()
      
      const { data, error } = await supabase
        .from('event_attendance')
        .insert({
          event_id: selectedEventForAttendance.id,
          user_id: null,
          guest_name: guestAttendee.guest_name,
          guest_email: guestAttendee.guest_email,
          guest_phone: guestAttendee.guest_phone,
          attended: true,
          marked_attended_at: new Date().toISOString(),
          marked_by: currentUserData?.id,
          notes: guestAttendee.notes
        })
        .select()
      
      if (error) {
        console.error('Supabase error details:', error)
        if (error.code === '23505') {
          toast.error('This guest is already in the attendance list')
        } else {
          toast.error(`Failed to add guest: ${error.message || 'Unknown error'}`)
        }
        return
      }
      
      toast.success('Guest marked as attended')
      await fetchEventAttendance(selectedEventForAttendance.id)
    } catch (error: any) {
      console.error('Error adding guest:', error)
      toast.error(error?.message || 'Failed to add guest')
    }
  }

  const removeEventAttendee = async (attendanceId: number) => {
    setEventAttendeeToRemove(String(attendanceId))
    setShowRemoveEventAttendeeConfirm(true)
  }

  const confirmRemoveEventAttendee = async () => {
    if (!eventAttendeeToRemove) return
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('event_attendance')
        .delete()
        .eq('id', parseInt(eventAttendeeToRemove))
      
      if (error) throw error
      
      toast.success('Attendee removed')
      
      if (selectedEventForAttendance) {
        await fetchEventAttendance(selectedEventForAttendance.id)
      }
    } catch (error) {
      console.error('Error removing event attendee:', error)
      toast.error('Failed to remove attendee')
    } finally {
      setShowRemoveEventAttendeeConfirm(false)
      setEventAttendeeToRemove(null)
    }
  }

  const exportEventToExcel = () => {
    if (!selectedEventForAttendance || eventAttendees.length === 0) {
      toast.error('No attendance data to export')
      return
    }

    try {
      // Prepare data for export
      const exportData = eventAttendees.map((attendee, index) => {
        const isGuest = attendee.isGuest
        
        // Determine how ticket was obtained (for members only)
        let ticketSource = '-'
        if (!isGuest) {
          if (attendee.purchased_by_name) {
            ticketSource = `Purchased by Treasurer: ${attendee.purchased_by_name}`
          } else {
            ticketSource = 'Self Purchase'
          }
        }
        
        return {
          'No.': index + 1,
          'Full Name': isGuest ? (attendee.guest_name || '-') : (attendee.full_name || '-'),
          'Type': isGuest ? 'Guest' : 'Member',
          'Member ID': isGuest ? '-' : (attendee.member_id || 'No Member ID'),
          'Role': isGuest ? 'Guest' : (attendee.role === 'admin' ? 'Member' : (attendee.role ? attendee.role.charAt(0).toUpperCase() + attendee.role.slice(1) : 'Member')),
          'Email': isGuest ? (attendee.guest_email || '-') : (attendee.email || '-'),
          'Phone': isGuest ? (attendee.guest_phone ? `="${attendee.guest_phone}"` : '-') : (attendee.phone ? `="${attendee.phone}"` : '-'),
          'Ticket Source': isGuest ? (attendee.notes || '-') : ticketSource,
          'T-shirt': attendee.tshirt_wanted
            ? `${attendee.tshirt_size || '?'} (${formatTshirtPaymentStatus(attendee.tshirt_payment_status)})`
            : '-',
          'T-shirt Picked Up': attendee.tshirt_picked_up ? 'Yes' : (attendee.tshirt_wanted ? 'No' : '-'),
          'Registered Date': attendee.created_at ? new Date(attendee.created_at).toLocaleDateString() : '-',
          'Attended': attendee.attended ? 'Yes' : 'No',
          'Marked Date': attendee.marked_attended_at 
            ? new Date(attendee.marked_attended_at).toLocaleDateString() + ' ' + new Date(attendee.marked_attended_at).toLocaleTimeString()
            : 'Not Yet'
        }
      })

      // Helper function to properly escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      // Create CSV content
      const headers = Object.keys(exportData[0])
      const csvContent = [
        escapeCSV(`Event: ${selectedEventForAttendance.title}`),
        escapeCSV(`Date: ${new Date(selectedEventForAttendance.event_date).toLocaleString()}`),
        escapeCSV(`Type: ${selectedEventForAttendance.event_type === 'free' ? 'Free Event' : 'Paid Event'}`),
        escapeCSV(`Total Attendees: ${eventAttendees.length}`),
        escapeCSV(`Total Attended: ${eventAttendees.filter(a => a.attended).length}`),
        escapeCSV(`Members: ${eventAttendees.filter(a => a.user_id).length}`),
        escapeCSV(`Guests: ${eventAttendees.filter(a => !a.user_id).length}`),
        '',
        headers.map(h => escapeCSV(h)).join(','),
        ...exportData.map(row => 
          headers.map(header => escapeCSV(row[header as keyof typeof row])).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `${selectedEventForAttendance.title.replace(/[^a-z0-9]/gi, '_')}_Attendance_${new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Event attendance exported successfully')
    } catch (error) {
      console.error('Error exporting event attendance:', error)
      toast.error('Failed to export attendance list')
    }
  }

  // Event functions
  const createEvent = async () => {
    if (editingEvent) {
      await updateEvent()
      return
    }

    try {
      // Validate event date
      if (!eventForm.event_date || !eventForm.title) {
        toast.error('Please fill in all required fields')
        return
      }

      const eventDate = new Date(eventForm.event_date)
      if (isNaN(eventDate.getTime())) {
        toast.error('Invalid date or time format')
        return
      }

      // Validate registration deadline
      if (eventForm.registration_deadline) {
        const regDeadline = new Date(eventForm.registration_deadline)
        if (isNaN(regDeadline.getTime())) {
          toast.error('Invalid registration deadline format')
          return
        }
        
        // Registration deadline must be before or equal to event date
        if (regDeadline > eventDate) {
          toast.error('Registration deadline cannot be after the event date')
          return
        }
      }

      // Validate capacity
      if (eventForm.capacity && parseInt(eventForm.capacity) < 1) {
        toast.error('Capacity must be at least 1')
        return
      }

      if (eventForm.tshirt_enabled) {
        if (!eventForm.tshirt_sizes?.length) {
          toast.error('Select at least one T-shirt size')
          return
        }
        if (eventForm.tshirt_pricing === 'paid') {
          const price = parseFloat(eventForm.tshirt_price)
          if (Number.isNaN(price) || price < 0) {
            toast.error('Enter a valid T-shirt price')
            return
          }
        }
      }

      if (
        (eventForm.event_format === 'online' || eventForm.event_format === 'hybrid') &&
        !eventForm.online_link?.trim()
      ) {
        toast.error('Please add an online meeting link (Zoom, Teams, etc.)')
        return
      }

      const payload: any = {
        title: eventForm.title,
        description: eventForm.description,
        event_date: eventDate.toISOString(),
        location: eventForm.location || null,
        event_type: eventForm.event_type,
        event_format: eventForm.event_format || 'in_person',
        online_link: eventForm.online_link || null,
        online_meeting_id: eventForm.online_meeting_id || null,
        online_password: eventForm.online_password || null,
        requires_registration: eventForm.requires_registration,
        registration_deadline: eventForm.registration_deadline ? new Date(eventForm.registration_deadline).toISOString() : null,
        event_file_url: eventForm.event_file_url || null,
        capacity: eventForm.capacity ? parseInt(eventForm.capacity) : null,
        waitlist_enabled: eventForm.waitlist_enabled,
        cover_image_url: eventForm.cover_image_url || null,
        allow_public_registration: eventForm.allow_public_registration || false,
        require_guest_approval: eventForm.require_guest_approval !== false,
        payment_qr_code_url: eventForm.payment_qr_code_url || null,
        tshirt_enabled: eventForm.tshirt_enabled || false,
        tshirt_pricing: eventForm.tshirt_pricing || 'free',
        tshirt_price:
          eventForm.tshirt_enabled && eventForm.tshirt_pricing === 'paid'
            ? parseFloat(eventForm.tshirt_price)
            : null,
        tshirt_sizes: eventForm.tshirt_sizes?.length
          ? eventForm.tshirt_sizes
          : ['S', 'M', 'L', 'XL', 'XXL'],
        tshirt_required: eventForm.tshirt_enabled ? !!eventForm.tshirt_required : false,
        tshirt_image_url: eventForm.tshirt_enabled
          ? eventForm.tshirt_image_url || null
          : null
      }

      // Use API to create event (bypasses RLS)
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create event')
      }
      
      const result = await response.json()
      
      // Assign categories if any selected
      if (selectedCategories.length > 0) {
        await assignCategories(result.event.id, selectedCategories)
      }
      
      toast.success('Event created successfully')
      setShowEventForm(false)
      setSelectedCategories([])
      setEventForm({
        title: '',
        description: '',
        event_date: '',
        location: '',
        event_type: 'free',
        event_format: 'in_person',
        online_link: '',
        online_meeting_id: '',
        online_password: '',
        requires_registration: false,
        registration_deadline: '',
        event_file_url: '',
        capacity: '',
        waitlist_enabled: false,
        cover_image_url: '',
        allow_public_registration: false,
        require_guest_approval: true,
        payment_qr_code_url: '',
        tshirt_enabled: false,
        tshirt_pricing: 'free',
        tshirt_price: '',
        tshirt_sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        tshirt_required: false,
        tshirt_image_url: ''
      })
      fetchEventsOnly() // Only reload events, not everything
    } catch (error: any) {
      console.error('Error creating event:', error)
      toast.error(error.message || 'Failed to create event')
    }
  }

  const deleteEvent = async (id: string) => {
    try {
      // Use API to delete event (bypasses RLS)
      const response = await fetch(`/api/events?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }
      
      toast.success('Event deleted')
      fetchEventsOnly() // Only reload events
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error(error.message || 'Failed to delete event')
    }
  }

  const handleEditEvent = (event: any) => {
    setEditingEvent(event)
    
    // Load event categories if available
    if (event.categories && Array.isArray(event.categories)) {
      setSelectedCategories(event.categories.map((cat: any) => cat.id))
    } else {
      setSelectedCategories([])
    }
    
    // Format event_date properly for datetime-local input
    let formattedEventDate = ''
    if (event.event_date) {
      // Parse the UTC date and convert to local time
      const date = new Date(event.event_date)
      // Format as YYYY-MM-DDTHH:MM in local timezone
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      formattedEventDate = `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    // Format registration_deadline properly
    let formattedDeadline = ''
    if (event.registration_deadline) {
      const date = new Date(event.registration_deadline)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    console.log('🔧 Editing event:', event.title)
    console.log('📅 Event date from DB:', event.event_date)
    console.log('📅 Formatted for input:', formattedEventDate)
    console.log('⏰ Registration deadline from DB:', event.registration_deadline)
    console.log('⏰ Formatted deadline:', formattedDeadline)
    
    setEventForm({
      title: event.title,
      description: event.description || '',
      event_date: formattedEventDate,
      location: event.location || '',
      event_type: event.event_type || 'free',
      event_format:
        event.event_format === 'online' || event.event_format === 'hybrid'
          ? event.event_format
          : 'in_person',
      online_link: event.online_link || '',
      online_meeting_id: event.online_meeting_id || '',
      online_password: event.online_password || '',
      requires_registration: event.requires_registration || false,
      registration_deadline: formattedDeadline,
      event_file_url: event.event_file_url || '',
      capacity: event.capacity?.toString() || '',
      waitlist_enabled: event.waitlist_enabled || false,
      cover_image_url: event.cover_image_url || '',
      allow_public_registration: event.allow_public_registration || false,
      require_guest_approval: event.require_guest_approval !== false,
      payment_qr_code_url: event.payment_qr_code_url || '',
      tshirt_enabled: event.tshirt_enabled || false,
      tshirt_pricing: event.tshirt_pricing === 'paid' ? 'paid' : 'free',
      tshirt_price: event.tshirt_price != null ? String(event.tshirt_price) : '',
      tshirt_sizes: Array.isArray(event.tshirt_sizes) && event.tshirt_sizes.length
        ? event.tshirt_sizes
        : ['S', 'M', 'L', 'XL', 'XXL'],
      tshirt_required: event.tshirt_required || false,
      tshirt_image_url: event.tshirt_image_url || ''
    })
    setShowEventForm(true)
    
    // Scroll to the top smoothly after a short delay to allow form to render
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return null

    setUploadingFile(true)
    try {
      // Convert file to base64 for storage
      const reader = new FileReader()
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleViewEvent = (event: any) => {
    console.log('🔍 Viewing event:', event)
    console.log('📋 Event has registration:', event.requires_registration)
    console.log('📁 Event has file:', event.event_file_url)
    setViewingEvent(event)
    setShowViewEvent(true)
    setRegistrationsPage(1) // Reset to first page
    // Fetch registrations if event requires registration
    if (event.requires_registration) {
      console.log('📥 Fetching registrations for event:', event.id)
      fetchEventRegistrations(event.id)
    }
  }

  // Ticket Management Functions
  const fetchEventTickets = async (eventId: number) => {
    setLoadingTickets(true)
    try {
      const response = await fetch(`/api/tickets?event_id=${eventId}`)
      if (response.ok) {
        const result = await response.json()
        setEventTickets(result.tickets || [])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Failed to load tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  const createTicket = async () => {
    if (!selectedEventForTickets) return
    
    setCreatingTicket(true)
    try {
      if (!ticketForm.name || !ticketForm.price) {
        toast.error('Please fill in ticket name and price')
        return
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEventForTickets.id,
          name: ticketForm.name,
          description: ticketForm.description || null,
          price: parseFloat(ticketForm.price),
          quantity_available: ticketForm.quantity_available ? parseInt(ticketForm.quantity_available) : null,
          sale_start_date: ticketForm.sale_start_date ? new Date(ticketForm.sale_start_date).toISOString() : null,
          sale_end_date: ticketForm.sale_end_date ? new Date(ticketForm.sale_end_date).toISOString() : null,
          ticket_image_url: ticketForm.ticket_image_url || null,
          payment_methods: ticketForm.payment_methods || null,
          payment_instructions: ticketForm.payment_instructions || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create ticket')
      }

      toast.success('✅ Ticket created successfully! You can now create another one.')
      
      // Reset form
      setTicketForm({
        name: '',
        description: '',
        price: '',
        quantity_available: '',
        sale_start_date: '',
        sale_end_date: '',
        ticket_image_url: '',
        payment_methods: '',
        payment_instructions: ''
      })
      
      // Refresh ticket list
      await fetchEventTickets(selectedEventForTickets.id)
      
      // Keep form open but show it's ready for next ticket
      setShowTicketForm(true)
    } catch (error: any) {
      console.error('Error creating ticket:', error)
      toast.error(error.message || 'Failed to create ticket')
    } finally {
      setCreatingTicket(false)
    }
  }

  const updateTicket = async () => {
    if (!editingTicket) return

    setUpdatingTicket(true)
    try {
      const response = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTicket.id,
          name: ticketForm.name,
          description: ticketForm.description || null,
          price: parseFloat(ticketForm.price),
          quantity_available: ticketForm.quantity_available ? parseInt(ticketForm.quantity_available) : null,
          sale_start_date: ticketForm.sale_start_date ? new Date(ticketForm.sale_start_date).toISOString() : null,
          sale_end_date: ticketForm.sale_end_date ? new Date(ticketForm.sale_end_date).toISOString() : null,
          ticket_image_url: ticketForm.ticket_image_url || null,
          payment_methods: ticketForm.payment_methods || null,
          payment_instructions: ticketForm.payment_instructions || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update ticket')
      }

      toast.success('Ticket updated successfully')
      setShowTicketForm(false)
      setEditingTicket(null)
      setTicketForm({
        name: '',
        description: '',
        price: '',
        quantity_available: '',
        sale_start_date: '',
        sale_end_date: '',
        ticket_image_url: '',
        payment_methods: '',
        payment_instructions: ''
      })
      fetchEventTickets(selectedEventForTickets.id)
    } catch (error: any) {
      console.error('Error updating ticket:', error)
      toast.error(error.message || 'Failed to update ticket')
    } finally {
      setUpdatingTicket(false)
    }
  }

  const deleteTicket = async (ticketId: string) => {
    setDeletingTicketInProgress(true)
    try {
      const response = await fetch(`/api/tickets?id=${ticketId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete ticket')
      }

      toast.success('Ticket deleted successfully')
      setDeletingTicket(null)
      fetchEventTickets(selectedEventForTickets.id)
    } catch (error: any) {
      console.error('Error deleting ticket:', error)
      toast.error(error.message || 'Failed to delete ticket')
    } finally {
      setDeletingTicketInProgress(false)
    }
  }

  const handleEditTicket = (ticket: any) => {
    console.log('🎫 Editing ticket:', ticket)
    setEditingTicket(ticket)
    
    // Format dates for datetime-local input
    let formattedStartDate = ''
    if (ticket.sale_start_date) {
      const date = new Date(ticket.sale_start_date)
      formattedStartDate = date.toISOString().slice(0, 16)
    }
    
    let formattedEndDate = ''
    if (ticket.sale_end_date) {
      const date = new Date(ticket.sale_end_date)
      formattedEndDate = date.toISOString().slice(0, 16)
    }

    const formData = {
      name: ticket.name,
      description: ticket.description || '',
      price: ticket.price.toString(),
      quantity_available: ticket.quantity_available?.toString() || '',
      sale_start_date: formattedStartDate,
      sale_end_date: formattedEndDate,
      ticket_image_url: ticket.ticket_image_url || '',
      payment_methods: ticket.payment_methods || '',
      payment_instructions: ticket.payment_instructions || ''
    }
    console.log('📝 Setting form data:', formData)
    setTicketForm(formData)
    setShowTicketForm(true)
  }

  const fetchEventRegistrations = async (eventId: number) => {
    setLoadingRegistrations(true)
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Fetch registrations timeout after 10 seconds')
      setEventRegistrations([])
      setLoadingRegistrations(false)
    }, 10000)
    
    try {
      console.log('📡 Fetching registrations from API for event:', eventId)
      
      const response = await fetch(`/api/event-registrations?eventId=${eventId}`)
      clearTimeout(timeoutId) // Clear timeout if request completes
      
      if (response.status === 401) {
        console.error('❌ Auth error (401) - User needs to sign in')
        toast.error('Please sign in to view registrations')
        setEventRegistrations([])
        return
      }
      
      if (response.status === 403) {
        console.error('❌ Permission error (403) - User needs secretary/admin role')
        toast.error('Secretary or admin role required to view registrations')
        setEventRegistrations([])
        return
      }
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Registrations fetched:', result.registrations)
        console.log('📊 Registration stats:', result.stats)
        console.log('🔍 First registration (if any):', result.registrations?.[0])
        // Log each registration type for debugging
        if (result.registrations && result.registrations.length > 0) {
          result.registrations.forEach((reg: any, idx: number) => {
            console.log(`  [${idx}] type: ${reg.type}, name: ${reg.full_name || reg.user?.full_name}, email: ${reg.email || reg.user?.email}`)
          })
        }
        setEventRegistrations(result.registrations || [])
      } else {
        console.error('❌ Failed to fetch registrations:', response.status, response.statusText)
        // Try to read error response
        try {
          const errorText = await response.text()
          console.error('📝 Error response:', errorText)
        } catch (e) {
          console.error('Could not read error response')
        }
        setEventRegistrations([])
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
      toast.error('Failed to load registrations')
      setEventRegistrations([])
    } finally {
      clearTimeout(timeoutId) // Ensure timeout is cleared
      setLoadingRegistrations(false)
    }
  }

  const updateEvent = async () => {
    try {
      if (!eventForm.event_date || !eventForm.title) {
        toast.error('Please fill in all required fields')
        return
      }

      const eventDate = new Date(eventForm.event_date)
      if (isNaN(eventDate.getTime())) {
        toast.error('Invalid date or time format')
        return
      }

      // Validate registration deadline
      if (eventForm.registration_deadline) {
        const regDeadline = new Date(eventForm.registration_deadline)
        if (isNaN(regDeadline.getTime())) {
          toast.error('Invalid registration deadline format')
          return
        }
        
        // Registration deadline must be before or equal to event date
        if (regDeadline > eventDate) {
          toast.error('Registration deadline cannot be after the event date')
          return
        }
      }

      // Validate capacity
      if (eventForm.capacity && parseInt(eventForm.capacity) < 1) {
        toast.error('Capacity must be at least 1')
        return
      }

      if (eventForm.tshirt_enabled) {
        if (!eventForm.tshirt_sizes?.length) {
          toast.error('Select at least one T-shirt size')
          return
        }
        if (eventForm.tshirt_pricing === 'paid') {
          const price = parseFloat(eventForm.tshirt_price)
          if (Number.isNaN(price) || price < 0) {
            toast.error('Enter a valid T-shirt price')
            return
          }
        }
      }

      if (
        (eventForm.event_format === 'online' || eventForm.event_format === 'hybrid') &&
        !eventForm.online_link?.trim()
      ) {
        toast.error('Please add an online meeting link (Zoom, Teams, etc.)')
        return
      }

      const payload: any = {
        id: editingEvent.id,
        title: eventForm.title,
        description: eventForm.description,
        event_date: eventDate.toISOString(),
        location: eventForm.location || null,
        event_type: eventForm.event_type,
        event_format: eventForm.event_format || 'in_person',
        online_link: eventForm.online_link || null,
        online_meeting_id: eventForm.online_meeting_id || null,
        online_password: eventForm.online_password || null,
        requires_registration: eventForm.requires_registration,
        registration_deadline: eventForm.registration_deadline ? new Date(eventForm.registration_deadline).toISOString() : null,
        event_file_url: eventForm.event_file_url || null,
        capacity: eventForm.capacity ? parseInt(eventForm.capacity) : null,
        waitlist_enabled: eventForm.waitlist_enabled,
        cover_image_url: eventForm.cover_image_url || null,
        allow_public_registration: eventForm.allow_public_registration || false,
        require_guest_approval: eventForm.require_guest_approval !== false,
        tshirt_enabled: eventForm.tshirt_enabled || false,
        tshirt_pricing: eventForm.tshirt_pricing || 'free',
        tshirt_price:
          eventForm.tshirt_enabled && eventForm.tshirt_pricing === 'paid'
            ? parseFloat(eventForm.tshirt_price)
            : null,
        tshirt_sizes: eventForm.tshirt_sizes?.length
          ? eventForm.tshirt_sizes
          : ['S', 'M', 'L', 'XL', 'XXL'],
        tshirt_required: eventForm.tshirt_enabled ? !!eventForm.tshirt_required : false,
        tshirt_image_url: eventForm.tshirt_enabled
          ? eventForm.tshirt_image_url || null
          : null
      }

      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Update event failed:', response.status, errorData)
        throw new Error(errorData.error || errorData.details || `Failed to update event (${response.status})`)
      }

      toast.success('Event updated successfully')
      setShowEventForm(false)
      setEditingEvent(null)
      setEventForm({
        title: '',
        description: '',
        event_date: '',
        location: '',
        event_type: 'free',
        event_format: 'in_person',
        online_link: '',
        online_meeting_id: '',
        online_password: '',
        requires_registration: false,
        registration_deadline: '',
        event_file_url: '',
        capacity: '',
        waitlist_enabled: false,
        cover_image_url: '',
        allow_public_registration: false,
        require_guest_approval: true,
        payment_qr_code_url: '',
        tshirt_enabled: false,
        tshirt_pricing: 'free',
        tshirt_price: '',
        tshirt_sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        tshirt_required: false,
        tshirt_image_url: ''
      })
      fetchEventsOnly() // Only reload events
    } catch (error: any) {
      console.error('Error updating event:', error)
      toast.error(error.message || 'Failed to update event')
    }
  }

  // Announcement functions
  const createAnnouncement = async () => {
    try {
      if (!announcementForm.title || !announcementForm.content) {
        toast.error('Please fill in all required fields')
        return
      }

      const url = editingAnnouncement ? '/api/announcements' : '/api/announcements'
      const method = editingAnnouncement ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingAnnouncement && { id: editingAnnouncement.id }),
          title: announcementForm.title,
          content: announcementForm.content,
          priority: announcementForm.priority,
          expires_at: announcementForm.expires_at || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save announcement')
      }
      
      toast.success(editingAnnouncement ? 'Announcement updated successfully' : 'Announcement created successfully')
      setShowAnnouncementForm(false)
      setEditingAnnouncement(null)
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        expires_at: ''
      })
      fetchData()
    } catch (error: any) {
      console.error('Error saving announcement:', error)
      toast.error(error.message || 'Failed to save announcement')
    }
  }

  const handleEditAnnouncement = (announcement: any) => {
    setEditingAnnouncement(announcement)
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
    })
    setShowAnnouncementForm(true)
  }

  const handleViewAnnouncement = (announcement: any) => {
    setViewingAnnouncement(announcement)
    setShowViewAnnouncement(true)
  }

  const handleCancelEdit = () => {
    setShowAnnouncementForm(false)
    setEditingAnnouncement(null)
    setAnnouncementForm({
      title: '',
      content: '',
      priority: 'normal',
      expires_at: ''
    })
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete announcement')
      }
      
      toast.success('Announcement deleted')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error(error.message || 'Failed to delete announcement')
    }
  }

  // Birthday photo upload
  const handlePhotoUpload = async () => {
    if (!selectedPhoto) {
      toast.error('Please select a photo')
      return
    }

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const { supabase } = await import('@/lib/supabase/client-browser')
        
        const { error } = await supabase
          .from('birthday_photos')
          .insert({
            user_id: user.id,
            photo_url: reader.result as string,
            caption: photoCaption
          })
        
        if (error) throw error
        
        toast.success('Birthday photo submitted for approval')
        setShowPhotoUpload(false)
        setSelectedPhoto(null)
        setPhotoCaption('')
        fetchData()
      }
      reader.readAsDataURL(selectedPhoto)
    } catch (error) {
      toast.error('Failed to upload photo')
    }
  }

  const approvePhoto = async (id: string) => {
    setProcessing(id)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('birthday_photos')
        .update({ 
          status: 'approved',
          approved_by: user.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Birthday photo approved')
      fetchData()
    } catch (error) {
      console.error('Error approving photo:', error)
      toast.error('Failed to approve photo')
    } finally {
      setProcessing(null)
    }
  }

  const rejectBirthdayPhoto = async (id: string, reason: string) => {
    setProcessing(id)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('birthday_photos')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Birthday photo rejected')
      fetchData()
    } catch (error) {
      console.error('Error rejecting photo:', error)
      toast.error('Failed to reject photo')
    } finally {
      setProcessing(null)
    }
  }

  const repostBirthdayPhoto = async (photoId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Update the photo to mark it as reposted
      const { error } = await supabase
        .from('birthday_photos')
        .update({ 
          is_reposted: true,
          reposted_by: user.id,
          reposted_at: new Date().toISOString()
        })
        .eq('id', photoId)
      
      if (error) throw error
      
      toast.success('Birthday photo reposted! All members can now see it.')
      fetchData()
    } catch (error) {
      console.error('Error reposting birthday photo:', error)
      toast.error('Failed to repost birthday photo')
    }
  }

  const deleteBirthdayPhoto = async (photoId: string, photoUrl: string) => {
    // Show custom confirmation modal instead of browser alert
    setPhotoToDelete({id: photoId, url: photoUrl})
    setShowDeleteConfirm(true)
  }

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Delete from storage first
      const fileName = photoToDelete.url.split('/').pop()
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('birthday-photos')
          .remove([`birthday-photos/${fileName}`])
        
        if (storageError) {
          console.error('Error deleting from storage:', storageError)
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('birthday_photos')
        .delete()
        .eq('id', photoToDelete.id)
      
      if (dbError) throw dbError
      
      toast.success('Birthday photo deleted successfully')
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting birthday photo:', error)
      toast.error('Failed to delete birthday photo')
    }
  }

  const cancelDeletePhoto = () => {
    setShowDeleteConfirm(false)
    setPhotoToDelete(null)
  }

  const handleViewPhoto = (photo: any) => {
    setViewingPhoto(photo)
    setShowPhotoLightbox(true)
  }

  const closeLightbox = () => {
    setShowPhotoLightbox(false)
    setViewingPhoto(null)
  }

  // Loan settings functions
  const loadLoanSettings = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Load dues clearance requirement
      const { data: duesData, error: duesError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'loan_requires_dues_clear')
        .single()
      
      if (duesData) {
        setLoanRequiresDuesClear(duesData.setting_value === 'true')
      }

      // Load minimum months requirement
      const { data: monthsData, error: monthsError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'loan_minimum_months')
        .single()
      
      if (monthsData) {
        setLoanMinimumMonths(parseInt(monthsData.setting_value) || 3)
      }
    } catch (error) {
      console.error('Error loading loan settings:', error)
    }
  }

  const saveLoanSettings = async () => {
    setSavingLoanSettings(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Save dues clearance requirement
      const { error: duesError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'loan_requires_dues_clear',
          setting_value: loanRequiresDuesClear ? 'true' : 'false',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' })
      
      if (duesError) throw duesError

      // Save minimum months requirement
      const { error: monthsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'loan_minimum_months',
          setting_value: loanMinimumMonths.toString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' })
      
      if (monthsError) throw monthsError
      
      toast.success('Loan settings saved successfully')
      setShowLoanSettings(false)
    } catch (error) {
      console.error('Error saving loan settings:', error)
      toast.error('Failed to save loan settings')
    } finally {
      setSavingLoanSettings(false)
    }
  }

  // Loan approval functions
  const approveLoan = async (loanId: string) => {
    setProcessing(loanId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'secretary_approved',
          secretary_approved_by: user.id,
          secretary_approved_at: new Date().toISOString()
        })
        .eq('id', loanId)
      
      if (error) throw error
      
      toast.success('Loan approved and sent to Finance')
      fetchData()
    } catch (error) {
      toast.error('Failed to approve loan')
    } finally {
      setProcessing(null)
    }
  }

  const rejectLoan = async (loanId: string) => {
    setProcessing(loanId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'rejected',
          rejection_reason: loanRejectionReason,
          rejected_by: user.id,
          rejected_at: new Date().toISOString()
        })
        .eq('id', loanId)
      
      if (error) throw error
      
      toast.success('Loan rejected')
      setShowLoanDetails(false)
      setSelectedLoan(null)
      setLoanRejectionReason('')
      fetchData()
    } catch (error) {
      toast.error('Failed to reject loan')
    } finally {
      setProcessing(null)
    }
  }

  // Committee functions
  const saveCommittee = async () => {
    try {
      const method = editingCommittee ? 'PUT' : 'POST'
      const url = '/api/committees'
      
      // Optimistic update - update UI immediately
      if (editingCommittee) {
        setCommittees(prev => prev.map(c => c.id === editingCommittee.id ? { ...c, ...committeeForm } : c))
      } else {
        const tempCommittee = { ...committeeForm, id: crypto.randomUUID() }
        setCommittees(prev => [...prev, tempCommittee])
      }
      
      toast.success(editingCommittee ? 'Committee updated successfully' : 'Committee created successfully')
      setShowCommitteeModal(false)
      setEditingCommittee(null)
      setCommitteeForm({ committee_name: '', description: '', monthly_due: 0 })
      
      // Then sync with server in background
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCommittee ? { ...committeeForm, id: editingCommittee.id } : committeeForm)
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Committee save error:', error)
        toast.error('Failed to save committee to server. Please refresh.')
        // Revert optimistic update on error
        fetchData()
      }
    } catch (error) {
      console.error('Error saving committee:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to save committee: ' + errorMsg)
      // Revert optimistic update on error
      fetchData()
    }
  }

  const deleteCommittee = async (committeeId: string) => {
    // Optimistic update - remove from UI immediately
    setCommittees(prev => prev.filter(c => c.id !== committeeId))
    toast.success('Committee deleted successfully')
    
    try {
      const response = await fetch(`/api/committees?id=${committeeId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Committee delete error:', error)
        toast.error('Failed to delete committee from server. Please refresh.')
        // Revert optimistic update on error
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting committee:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to delete committee: ' + errorMsg)
      // Revert optimistic update on error
      fetchData()
    }
  }

  const editCommittee = (committee: any) => {
    setEditingCommittee(committee)
    setCommitteeForm({
      committee_name: committee.committee_name,
      description: committee.description,
      monthly_due: committee.monthly_due
    })
    setShowCommitteeModal(true)
  }

  // Fetch committee members
  const fetchCommitteeMembers = async (committeeId: string) => {
    try {
      const response = await fetch(`/api/committees/members?committee_id=${committeeId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch members')
      setCommitteeMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching committee members:', error)
      toast.error('Failed to fetch committee members')
    }
  }

  // Add member to committee (role: member | head)
  const addMemberToCommittee = async (userId: string, role: string = 'member') => {
    if (!selectedCommittee) return

    try {
      const response = await fetch('/api/committees/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          committee_id: selectedCommittee.id,
          user_id: userId,
          role,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to add member')

      toast.success(role === 'head' ? 'Committee head added' : 'Member added to committee')
      await fetchCommitteeMembers(selectedCommittee.id)
    } catch (error: any) {
      console.error('Error adding member to committee:', error)
      toast.error(error.message || 'Failed to add member to committee')
    }
  }

  const updateCommitteeMemberRole = async (memberId: string, role: string) => {
    if (!selectedCommittee) return
    try {
      const response = await fetch('/api/committees/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: memberId,
          role,
          committee_id: selectedCommittee.id,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update role')
      toast.success(role === 'head' ? 'Set as committee head' : 'Role updated')
      await fetchCommitteeMembers(selectedCommittee.id)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  // Budget Proposal functions
  const fetchBudgetProposals = async () => {
    console.log('Fetching budget proposals...')
    try {
      const response = await fetch('/api/budget-proposals')
      console.log('Budget proposals response:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Budget proposals data:', data.proposals?.length || 0, 'proposals')
        if (data.proposals) {
          setProposals(data.proposals)
        }
      } else {
        console.error('Failed to fetch budget proposals:', response.status)
      }
    } catch (error) {
      console.error('Error fetching budget proposals:', error)
    }
  }

  const viewBudgetProposal = (proposal: any) => {
    console.log('Opening view modal for proposal:', proposal.id)
    setSelectedProposal(proposal)
    setShowViewProposalModal(true)
  }

  const editBudgetProposalAssignment = (proposal: any) => {
    console.log('Opening edit modal for proposal:', proposal.id)
    setEditingProposal(proposal)
    setProposalForm({
      committee_id: proposal.committee_id,
      budget_head_id: proposal.budget_head_id || '',
      title: '',
      description: '',
      items: []
    })
    setShowProposalModal(true)
  }

  const submitProposal = async (proposalId: string) => {
    try {
      const response = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, status: 'pending_review' })
      })

      if (response.ok) {
        toast.success('Proposal submitted for review')
        fetchBudgetProposals()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit proposal')
      }
    } catch (error) {
      console.error('Error submitting proposal:', error)
      toast.error('Failed to submit proposal')
    }
  }

  // Load committee members when committee is selected in budget proposal modal
  const loadBudgetProposalCommitteeMembers = async (committeeId: string) => {
    if (!committeeId) {
      setBudgetProposalCommitteeMembers([])
      return
    }
    
    try {
      const response = await fetch('/api/committees')
      if (response.ok) {
        const data = await response.json()
        const committee = data.committees?.find((c: any) => c.id === committeeId)
        if (committee) {
          setBudgetProposalCommitteeMembers(committee.members || [])
        }
      }
    } catch (error) {
      console.error('Error loading committee members:', error)
    }
  }

  // Effect to load committee members when modal opens or committee changes
  useEffect(() => {
    if (showProposalModal && proposalForm.committee_id) {
      loadBudgetProposalCommitteeMembers(proposalForm.committee_id)
    }
  }, [showProposalModal, proposalForm.committee_id])

  const saveBudgetProposal = async () => {
    // Validate required fields
    if (!proposalForm.committee_id || !proposalForm.budget_head_id) {
      toast.error('Please select both committee and budget proposal head')
      console.error('Validation failed:', { 
        committee_id: proposalForm.committee_id, 
        budget_head_id: proposalForm.budget_head_id 
      })
      return
    }

    try {
      const url = '/api/budget-proposals'
      
      // Secretary only assigns/updates committee and budget head
      const payload: any = {
        committee_id: proposalForm.committee_id,
        budget_head_id: proposalForm.budget_head_id
      }

      // If editing, include the proposal ID
      if (editingProposal) {
        payload.id = editingProposal.id
      }

      console.log('Sending budget proposal assignment:', payload)

      const response = await fetch(url, {
        method: editingProposal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API error:', error)
        toast.error(error.error || 'Failed to assign budget proposal')
      } else {
        toast.success(editingProposal ? 'Assignment updated successfully' : 'Budget proposal assigned successfully')
        setShowProposalModal(false)
        setEditingProposal(null)
        setProposalForm({ committee_id: '', budget_head_id: '', title: '', description: '', items: [] })
        fetchBudgetProposals()
      }
    } catch (error) {
      console.error('Error assigning budget proposal:', error)
      toast.error('Failed to assign budget proposal')
    }
  }

  const deleteBudgetProposal = async (proposalId: string) => {
    console.log('Delete clicked for proposal:', proposalId)
    
    if (!confirm('Are you sure you want to delete this assignment?')) {
      console.log('Delete cancelled by user')
      return
    }
    
    console.log('Deleting proposal:', proposalId)
    
    try {
      const response = await fetch(`/api/budget-proposals?id=${proposalId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Proposal deleted successfully')
        toast.success('Assignment deleted')
        fetchBudgetProposals()
      } else {
        const error = await response.json()
        console.error('Delete failed:', error)
        toast.error(error.error || 'Failed to delete assignment')
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Failed to delete assignment')
    }
  }

  const updateProposalStatus = async (proposalId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/budget-proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalId, status })
      })

      if (response.ok) {
        toast.success(`Proposal ${status}`)
        fetchBudgetProposals()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${status} proposal`)
      }
    } catch (error) {
      console.error(`Error ${status} proposal:`, error)
      toast.error(`Failed to ${status} proposal`)
    }
  }

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
    setShowPaymentModal(true)
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
        setShowPaymentModal(false)
        setPaymentForm({
          proposal_id: '',
          amount: '',
          payment_method: 'bank_transfer',
          payment_reference: '',
          paid_to_name: '',
          paid_to_account: '',
          notes: ''
        })
        fetchBudgetProposals()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    }
  }

  // Remove member from committee
  const removeMemberFromCommittee = async (memberId: string) => {
    // Optimistic update - remove from UI immediately
    setCommitteeMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success('Member removed from committee')
    
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { error } = await supabase
        .from('committee_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing member from committee:', error)
      toast.error('Failed to remove member from committee. Please refresh.')
      // Revert optimistic update on error
      if (selectedCommittee) {
        fetchCommitteeMembers(selectedCommittee.id)
      }
    }
  }

  const viewLoanDetails = async (loan: any, year?: number) => {
    if (!year) {
      year = selectedDuesYear
    }
    
    setSelectedLoan(loan)
    setShowLoanDetails(true)
    setLoadingDuesData(true)
    
    // Fetch payment history via API (bypasses RLS)
    try {
      console.log('🔍 SECRETARY - FETCHING PAYMENTS VIA API FOR LOAN:', {
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
      
      console.log('✅ SECRETARY - API RESPONSE:', data)
      
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
      
      console.log('📅 SECRETARY - PAID MONTHS:', paidMonths)
      
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
      
      console.log('✅ SECRETARY - ELIGIBILITY RESULT:', {
        hasUnpaidDues,
        paidMonthsCount: payments.length,
        requiredMonthsCount: monthsToCheck,
        unpaidMonths,
        year: selectedYear
      })
      
      setSelectedLoan((prev: any) => ({ 
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
    // Navigate to payments page - Secretary doesn't have direct access, so show message
    toast(`${month} ${year} payment - Navigate to Finance panel to view full payment history`)
  }

  const handleYearChange = (year: number) => {
    setSelectedDuesYear(year)
    if (selectedLoan) {
      viewLoanDetails(selectedLoan, year)
    }
  }

  // Member CRUD functions
  const openViewMember = async (member: any) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Use the member data from the list (already has photo in correct format)
      const memberWithRank = { ...member }
      
      console.log('Viewing member data:', member.members_profile)
      console.log('Photo URL:', member.members_profile?.[0]?.photo_url)
      
      // Union ranks removed - using role only
      
      setViewingMember(memberWithRank)
    } catch (error) {
      console.error('Error in openViewMember:', error)
      setViewingMember(member) // Fallback to original data
    }
    setShowViewMember(true)
  }

  const openEditMember = (member: any) => {
    // Navigate to registration page with member ID for editing
    router.push(`/registration?edit=${member.id}`)
  }

  // Load available roles (excluding admin + embassy — Embassy is admin-only)
  const loadAvailableRanks = async () => {
    const roles = [
      { id: 'member', name: 'Member' },
      { id: 'secretary', name: 'Secretary' },
      { id: 'treasurer', name: 'Treasurer' },
      { id: 'president', name: 'President' }
    ]
    setAvailableRanks(roles)
  }

  // Open role assignment modal
  const openRankAssignModal = async (member: any) => {
    setSelectedMemberForRank(member)
    setSelectedRankId(member.role || 'member')
    await loadAvailableRanks()
    setShowRankAssignModal(true)
  }

  // Handle role assignment
  const handleAssignRank = async () => {
    if (!selectedMemberForRank || !selectedRankId) {
      toast.error('Please select a role')
      return
    }

    // Embassy role can only be assigned by Admin
    if (selectedRankId === 'embassy' || selectedRankId === 'admin') {
      toast.error('Only Admin can assign Embassy or Admin roles')
      return
    }

    setAssigningRank(true)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Update user's role
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRankId })
        .eq('id', selectedMemberForRank.id)
      
      if (error) throw error
      
      toast.success(`Role updated to ${selectedRankId} successfully`)
      setShowRankAssignModal(false)
      setSelectedMemberForRank(null)
      setSelectedRankId('')
      
      // Refresh member list
      fetchData()
    } catch (error) {
      console.error('Error assigning role:', error)
      toast.error('Failed to assign role')
    } finally {
      setAssigningRank(false)
    }
  }

  const updateMember = async () => {
    if (!editingMember) return
    
    setProcessing(editingMember.id)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      // Embassy / admin roles are admin-only; secretary cannot set them via edit
      if (memberForm.role === 'embassy' || memberForm.role === 'admin') {
        toast.error('Only Admin can assign Embassy or Admin roles')
        setProcessing(null)
        return
      }

      // Update user
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: memberForm.full_name,
          email: memberForm.email,
          role: memberForm.role,
          status: memberForm.status
        })
        .eq('id', editingMember.id)
      
      if (userError) throw userError
      
      // Update or create profile
      const { data: existingProfile } = await supabase
        .from('members_profile')
        .select('*')
        .eq('user_id', editingMember.id)
        .single()
      
      if (existingProfile) {
        const { error: profileError } = await supabase
          .from('members_profile')
          .update({
            member_id: memberForm.member_id,
            university: memberForm.university,
            phone: memberForm.phone,
            age: memberForm?.age ? Number(memberForm.age) || null : null,
            address: memberForm.address,
            date_of_birth: memberForm.date_of_birth || null
          })
          .eq('id', existingProfile.id)
        
        if (profileError) throw profileError
      } else {
        const { error: profileError } = await supabase
          .from('members_profile')
          .insert({
            user_id: editingMember.id,
            member_id: memberForm.member_id,
            university: memberForm.university,
            phone: memberForm.phone,
            age: memberForm?.age ? Number(memberForm.age) || null : null,
            address: memberForm.address,
            date_of_birth: memberForm.date_of_birth || null
          })
        
        if (profileError) throw profileError
      }
      
      toast.success('Member updated successfully')
      setShowEditMember(false)
      setEditingMember(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to update member')
    } finally {
      setProcessing(null)
    }
  }

  const deleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return
    }
    
    setProcessing(memberId)
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error } = await supabase
        .from('users')
        .update({ status: 'dropped' })
        .eq('id', memberId)
      
      if (error) throw error
      
      toast.success('Member deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete member')
    } finally {
      setProcessing(null)
    }
  }

  const syncUserFromClerk = async (clerkId: string) => {
    try {
      console.log('Syncing user from Clerk API...')
      
      // Call API endpoint to get user data from Clerk
      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('Failed to sync user from Clerk:', result)
        toast.error('Failed to sync user data: ' + (result.details || 'Unknown error'))
        setLoading(false)
        return
      }
      
      console.log('Got user data from Clerk:', result.user)
      
      // Insert into Supabase using browser client
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          clerk_id: result.user.clerk_id,
          full_name: result.user.full_name,
          email: result.user.email,
          role: 'admin',
          status: 'active'
        })
      
      if (insertError) {
        console.error('Failed to insert user into Supabase:', insertError)
        if (insertError.code === '42501') {
          toast.error('Please run the SQL fix in fix-rls-policy.sql first')
        } else {
          toast.error('Failed to create user record: ' + insertError.message)
        }
        setLoading(false)
        return
      }
      
      console.log('User synced successfully')
      toast.success('User synced successfully')
      
      // Reload data
      await fetchData()
    } catch (error) {
      console.error('Error syncing user:', error)
      toast.error('Error syncing user')
      setLoading(false)
    }
  }

  const loadedTabsRef = useRef<Set<SecretaryTab>>(new Set())

  const fetchMembersOnly = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, clerk_id, full_name, email, role, status, created_at,
          members_profile(*)
        `)
        .not('role', 'in', '(admin,embassy)')  // Hide admin and embassy roles from secretary
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching members:', error)
        return
      }
      
      if (data) {
        console.log('Fetched members:', data.length, 'members')
        console.log('Sample member data:', data[0])
        setUsers(data)
      }
    } catch (e) {
      console.error('Failed to load members:', e)
    }
  }

  const loadSecretaryTab = async (tab: SecretaryTab) => {
    // Remove the loaded check to allow reloading
    // if (loadedTabsRef.current.has(tab)) return
    // loadedTabsRef.current.add(tab)

    try {
      if (tab === 'members') {
        await fetchMembersOnly()
        return
      }

      if (tab === 'meetings') {
        const res = await fetch('/api/meetings')
        if (res.ok) {
          const data = await res.json()
          setMeetings(data.meetings || [])
        }
        return
      }

      if (tab === 'events') {
        const [eventsRes] = await Promise.all([
          fetch('/api/events'),
          fetchEventCategories(),
        ])
        if (eventsRes.ok) {
          const data = await eventsRes.json()
          setEvents(data.events || [])
        }
        return
      }

      if (tab === 'announcements') {
        console.log('[Secretary] Loading announcements tab...')
        const res = await fetch('/api/announcements')
        if (res.ok) {
          const data = await res.json()
          console.log('[Secretary] Announcements loaded:', data.announcements)
          setAnnouncements(data.announcements || [])
        } else {
          console.error('[Secretary] Failed to load announcements:', res.statusText)
        }
        return
      }

      if (tab === 'birthdays') {
        const { supabase } = await import('@/lib/supabase/client-browser')
        const [birthdaysRes, photosResult] = await Promise.all([
          fetch('/api/birthdays'),
          supabase
            .from('birthday_photos')
            .select('*, users:user_id(full_name, email)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(100),
        ])
        if (birthdaysRes.ok) {
          const data = await birthdaysRes.json()
          setUpcomingBirthdays(data.birthdays || [])
        }
        if (!photosResult.error && photosResult.data) {
          setBirthdayPhotos(photosResult.data)
        }
        return
      }

      if (tab === 'loans') {
        const res = await fetch('/api/loans')
        if (res.ok) {
          const data = await res.json()
          setLoans(data.loans || [])
        }
        return
      }

      if (tab === 'committees') {
        const res = await fetch('/api/committees')
        if (res.ok) {
          const data = await res.json()
          setCommittees(data.committees || [])
        }
        return
      }

      if (tab === 'budget_proposals') {
        // BudgetProposalsPanel loads its own data
        return
      }
    } catch (error) {
      console.error(`Failed to load secretary tab ${tab}:`, error)
      // Allow retry on next visit
      loadedTabsRef.current.delete(tab)
    }
  }

  const fetchData = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      let userData: any = null

      for (let attempt = 1; attempt <= 3; attempt++) {
        const userResponse = await fetch('/api/user')
        if (userResponse.ok) {
          userData = await userResponse.json()
          setUser(userData)
          break
        }

        const errBody = await userResponse.json().catch(() => ({}))
        const retryable = userResponse.status >= 500
        console.error(
          `Failed to fetch user from API (attempt ${attempt}/3):`,
          userResponse.status,
          errBody.error || userResponse.statusText
        )

        if (!retryable || attempt === 3) {
          toast.error(errBody.error || 'Failed to load user data')
          setLoading(false)
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
      }

      if (!userData) {
        toast.error('Failed to load user data')
        setLoading(false)
        return
      }

      if (userData.role !== 'admin' && userData.role !== 'secretary') {
        toast.error('Access denied. Secretary panel requires secretary or admin role.')
        router.push('/dashboard')
        setLoading(false)
        return
      }

      // Members tab only on first paint — clear loading quickly
      await fetchMembersOnly()
      loadedTabsRef.current.add('members')
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load secretary data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch loan statistics
  const fetchLoanStatistics = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/secretary/loan-statistics')
      if (response.ok) {
        const data = await response.json()
        setLoanStatistics(data.statistics)
      } else {
        console.error('Failed to fetch loan statistics')
        toast.error('Failed to load loan statistics')
      }
    } catch (error) {
      console.error('Error fetching loan statistics:', error)
      toast.error('Failed to load loan statistics')
    } finally {
      setLoadingStats(false)
    }
  }

  // Load loan statistics when loans tab is active
  useEffect(() => {
    if (activeTab === 'loans' && !loanStatistics) {
      fetchLoanStatistics()
    }
  }, [activeTab])

  // Load events when events tab is active
  useEffect(() => {
    console.log('Events tab useEffect triggered. activeTab:', activeTab, 'Events count:', events.length)
    if (activeTab === 'events' && events.length === 0) {
      console.log('Loading events...')
      fetchEventsOnly()
    }
  }, [activeTab])

  // Load meetings when meetings tab is active
  useEffect(() => {
    if (activeTab === 'meetings' && meetings.length === 0) {
      fetchMeetingsOnly()
    }
  }, [activeTab])

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.members_profile?.[0]?.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Statistics
  const activeUsers = users.filter(u => u.status === 'active')
  const pendingUsers = users.filter(u => u.status === 'pending')
  const graduatedUsers = users.filter(u => u.status === 'graduated')
  const transferredUsers = users.filter(u => u.status === 'transferred')
  const droppedUsers = users.filter(u => u.status === 'dropped')

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Secretary Panel</h1>
            <p className="text-gray-600">Member records, meetings, events, and announcements</p>
          </div>
          <button
            onClick={() => setShowPaymentSettings(true)}
            className="btn-secondary"
          >
            Payment Settings
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'members'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => openMeetingsTab('manage')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'meetings' || activeTab === 'announcements'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Meetings
          </button>
          <button
            onClick={() => openEventsTab('manage')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'events' || activeTab === 'non_member_registrations'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('birthdays')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'birthdays'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Birthdays
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'loans'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Loans
          </button>
          <button
            onClick={() => setActiveTab('committees')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === 'committees'
                ? 'text-[#D62828] border-b-2 border-[#D62828]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Committees
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
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-[#003366]">{users.length}</p>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{activeUsers.length}</p>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Graduated</p>
                    <p className="text-2xl font-bold text-purple-600">{graduatedUsers.length}</p>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">{transferredUsers.length + droppedUsers.length}</p>
                  </div>
                  <div className="w-12 h-12 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="card">
              <input
                type="text"
                placeholder="Search by name, email, or member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
              />
            </div>

            {/* Members Directory */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Members Directory</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Photo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Member ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">University</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(member => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {member.members_profile?.[0]?.photo_url ? (
                              <img
                                src={member.members_profile[0].photo_url}
                                alt={member.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src="https://flagcdn.com/w320/lr.png"
                                alt="Liberia Flag"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">
                          {member.members_profile?.[0]?.member_id || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{member.email}</td>
                        <td className="py-3 px-4 text-sm">
                          {member.members_profile?.[0]?.university || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {member.members_profile?.[0]?.phone || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`badge-${member.status}`}>{member.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openViewMember(member)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditMember(member)}
                              disabled={processing === member.id}
                              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openRankAssignModal(member)}
                              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm font-medium transition-colors"
                            >
                              Assign Role
                            </button>
                            {member.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveUser(member.id)}
                                  disabled={processing === member.id}
                                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectUser(member.id)}
                                  disabled={processing === member.id}
                                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteMember(member.id)}
                              disabled={processing === member.id}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No members found matching your search.
                </div>
              )}
            </div>
          </>
        )}

        {/* Meetings Tab (includes Announcements sub-tab) */}
        {(activeTab === 'meetings' || activeTab === 'announcements') && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-0">
              <button
                type="button"
                onClick={() => openMeetingsTab('manage')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  meetingsSubTab === 'manage'
                    ? 'bg-white text-[#D62828] border border-b-white border-gray-200 -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manage Meetings
              </button>
              <button
                type="button"
                onClick={() => openMeetingsTab('announcements')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  meetingsSubTab === 'announcements'
                    ? 'bg-white text-[#D62828] border border-b-white border-gray-200 -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Announcements
              </button>
            </div>

            {meetingsSubTab === 'manage' && (
            <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Meeting Scheduling</h2>
              <button
                onClick={() => setShowMeetingForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Meeting</span>
              </button>
            </div>

            {showMeetingForm && (
              <div className="card">
                <h3 className="text-lg font-bold mb-4">{editingMeeting ? 'Edit Meeting' : 'Create New Meeting'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={meetingForm.description}
                      onChange={(e) => setMeetingForm({...meetingForm, description: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={meetingForm.meeting_date?.split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value
                          const time = meetingForm.meeting_date?.split('T')[1] || '09:00'
                          setMeetingForm({...meetingForm, meeting_date: `${date}T${time}`})
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent cursor-pointer"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                      <input
                        type="time"
                        value={meetingForm.meeting_date?.split('T')[1] || '09:00'}
                        onChange={(e) => {
                          const date = meetingForm.meeting_date?.split('T')[0] || new Date().toISOString().split('T')[0]
                          const time = e.target.value
                          setMeetingForm({...meetingForm, meeting_date: `${date}T${time}`})
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type *</label>
                    <select
                      value={meetingForm.meeting_type}
                      onChange={(e) => setMeetingForm({...meetingForm, meeting_type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="in_person">In Person</option>
                      <option value="zoom">Online (Zoom)</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  {meetingForm.meeting_type === 'zoom' || meetingForm.meeting_type === 'hybrid' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Link</label>
                        <input
                          type="url"
                          value={meetingForm.zoom_link}
                          onChange={(e) => setMeetingForm({...meetingForm, zoom_link: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="https://zoom.us/j/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Meeting ID</label>
                        <input
                          type="text"
                          value={meetingForm.zoom_meeting_id}
                          onChange={(e) => setMeetingForm({...meetingForm, zoom_meeting_id: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Password</label>
                        <input
                          type="text"
                          value={meetingForm.zoom_password}
                          onChange={(e) => setMeetingForm({...meetingForm, zoom_password: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  ) : null}
                  {meetingForm.meeting_type === 'in_person' || meetingForm.meeting_type === 'hybrid' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={meetingForm.location}
                        onChange={(e) => setMeetingForm({...meetingForm, location: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Enter physical location or type 'online'"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={meetingForm.is_public}
                      onChange={(e) => setMeetingForm({...meetingForm, is_public: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_public" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Make this meeting public (visible to all members on their dashboard)
                    </label>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={editingMeeting ? updateMeeting : createMeeting} 
                      className="btn-primary"
                    >
                      {editingMeeting ? 'Update Meeting' : 'Create Meeting'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowMeetingForm(false)
                        setEditingMeeting(null)
                        setMeetingForm({
                          title: '',
                          description: '',
                          meeting_date: '',
                          meeting_type: 'in_person',
                          zoom_link: '',
                          zoom_meeting_id: '',
                          zoom_password: '',
                          location: '',
                          is_public: true
                        })
                      }} 
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold mb-6">Scheduled Meetings</h3>
              {meetings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No meetings scheduled</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings
                          .slice((meetingsPage - 1) * meetingsPerPage, meetingsPage * meetingsPerPage)
                          .map((meeting) => (
                          <tr key={meeting.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-gray-900">{meeting.title}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{meeting.description || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {new Date(meeting.meeting_date).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {meeting.meeting_type === 'zoom' && (
                                <div className="flex items-center text-sm">
                                  <Video className="w-4 h-4 mr-1 text-blue-600" />
                                  <span className="text-blue-600 font-medium">Zoom</span>
                                </div>
                              )}
                              {meeting.meeting_type === 'hybrid' && (
                                <div className="flex items-center text-sm">
                                  <div className="flex items-center">
                                    <Video className="w-4 h-4 mr-1 text-purple-600" />
                                    <MapPin className="w-4 h-4 mr-1 text-purple-600" />
                                    <span className="text-purple-600 font-medium">Hybrid</span>
                                  </div>
                                </div>
                              )}
                              {meeting.meeting_type === 'in_person' && (
                                <div className="flex items-center text-sm">
                                  <MapPin className="w-4 h-4 mr-1 text-green-600" />
                                  <span className="text-green-600 font-medium">In Person</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {meeting.zoom_link ? (
                                <a 
                                  href={meeting.zoom_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline text-sm flex items-center"
                                >
                                  <Video className="w-4 h-4 mr-1" />
                                  Join Meeting
                                </a>
                              ) : meeting.location ? (
                                <span className="text-sm text-gray-600">{meeting.location}</span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => openAttendanceModal(meeting)}
                                  className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                  title="Manage attendance"
                                >
                                  <Users className="w-4 h-4" />
                                  <span>Attendance</span>
                                </button>
                                <button
                                  onClick={() => toggleMeetingPublic(meeting)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    meeting.is_public 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  title={meeting.is_public ? 'Public - Click to make private' : 'Private - Click to make public'}
                                >
                                  {meeting.is_public ? '👁️ Public' : '🔒 Private'}
                                </button>
                                <button
                                  onClick={() => handleEditMeeting(meeting)}
                                  className="text-blue-600 hover:text-blue-700 transition-colors"
                                  title="Edit meeting"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => deleteMeeting(meeting.id)}
                                  className="text-red-600 hover:text-red-700 transition-colors"
                                  title="Delete meeting"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {meetings.length > meetingsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Showing {((meetingsPage - 1) * meetingsPerPage) + 1} to {Math.min(meetingsPage * meetingsPerPage, meetings.length)} of {meetings.length} meetings
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setMeetingsPage(prev => Math.max(1, prev - 1))}
                          disabled={meetingsPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Previous
                        </button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: Math.ceil(meetings.length / meetingsPerPage) }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setMeetingsPage(page)}
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                meetingsPage === page
                                  ? 'bg-[#003366] text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setMeetingsPage(prev => Math.min(Math.ceil(meetings.length / meetingsPerPage), prev + 1))}
                          disabled={meetingsPage === Math.ceil(meetings.length / meetingsPerPage)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* Events Tab (includes Non-Member Registrations sub-tab) */}
        {(activeTab === 'events' || activeTab === 'non_member_registrations') && (
          <div className="space-y-6">
            {/* Events sub-navigation */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-0">
              <button
                type="button"
                onClick={() => openEventsTab('manage')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  eventsSubTab === 'manage'
                    ? 'bg-white text-[#D62828] border border-b-white border-gray-200 -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manage Events
              </button>
              <button
                type="button"
                onClick={() => openEventsTab('non_members')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  eventsSubTab === 'non_members'
                    ? 'bg-white text-[#D62828] border border-b-white border-gray-200 -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Non-Member Registrations
              </button>
            </div>

            {eventsSubTab === 'non_members' && (
              <div className="card p-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Non-Member Registrations</h2>
                  <p className="text-gray-600 mb-6">
                    View and manage non-member registrations for your events
                  </p>
                  <a
                    href="/secretary/non-member-registrations"
                    className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Open Non-Member Registrations
                  </a>
                </div>
              </div>
            )}

            {eventsSubTab === 'manage' && (
            <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Event Management</h2>
              <button
                onClick={() => setShowEventForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Event</span>
              </button>
            </div>

            {showEventForm && (
              <div className="card">
                <h3 className="text-lg font-bold mb-4">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={eventForm.title || ''}
                      onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={eventForm.description || ''}
                      onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={eventForm.event_date?.split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value
                          const time = eventForm.event_date?.split('T')[1] || '09:00'
                          setEventForm({...eventForm, event_date: `${date}T${time}`})
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent cursor-pointer"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                      <input
                        type="time"
                        value={eventForm.event_date?.split('T')[1] || '09:00'}
                        onChange={(e) => {
                          const date = eventForm.event_date?.split('T')[0] || new Date().toISOString().split('T')[0]
                          const time = e.target.value
                          setEventForm({...eventForm, event_date: `${date}T${time}`})
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Format *</label>
                    <select
                      value={eventForm.event_format || 'in_person'}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          event_format: e.target.value as 'in_person' | 'online' | 'hybrid',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="in_person">In Person</option>
                      <option value="online">Online (Zoom / Teams / Meet)</option>
                      <option value="hybrid">Hybrid (In Person + Online)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Separate from pricing (free / ticket). Use this for where the event happens.
                    </p>
                  </div>
                  {(eventForm.event_format === 'online' || eventForm.event_format === 'hybrid') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Online Link *
                        </label>
                        <input
                          type="url"
                          value={eventForm.online_link || ''}
                          onChange={(e) => setEventForm({ ...eventForm, online_link: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="https://zoom.us/j/... or Teams / Meet link"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meeting ID
                          </label>
                          <input
                            type="text"
                            value={eventForm.online_meeting_id || ''}
                            onChange={(e) =>
                              setEventForm({ ...eventForm, online_meeting_id: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meeting Password
                          </label>
                          <input
                            type="text"
                            value={eventForm.online_password || ''}
                            onChange={(e) =>
                              setEventForm({ ...eventForm, online_password: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {(eventForm.event_format === 'in_person' || eventForm.event_format === 'hybrid') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={eventForm.location || ''}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Physical venue address"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <div className="relative">
                      <select
                        value={eventForm.event_type || 'free'}
                        onChange={(e) => setEventForm({...eventForm, event_type: e.target.value})}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          eventForm.event_type === 'ticket_only' 
                            ? 'border-purple-300 bg-purple-50 text-purple-800' 
                            : 'border-gray-300'
                        }`}
                      >
                        <option value="free">Free Event</option>
                        <option value="ticket_only">🎫 Ticket Only</option>
                        <option value="registration_required">Registration Required</option>
                        <option value="hybrid">Hybrid (Free + Tickets)</option>
                      </select>
                      {eventForm.event_type === 'ticket_only' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-purple-600">💰</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categories
                      <span className="text-gray-500 font-normal ml-1">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                      {eventCategories.length === 0 ? (
                        <p className="text-sm text-gray-500">Loading categories...</p>
                      ) : (
                        eventCategories.map(category => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategories(prev => 
                                prev.includes(category.id)
                                  ? prev.filter(id => id !== category.id)
                                  : [...prev, category.id]
                              )
                            }}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedCategories.includes(category.id)
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <span className="mr-1">{category.icon}</span>
                            {category.name}
                          </button>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select one or more categories to organize your event
                    </p>
                  </div>

                  {/* Event Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Cover Image
                      <span className="text-gray-500 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        // Validate file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image must be less than 5MB')
                          e.target.value = ''
                          return
                        }
                        
                        // Validate file type
                        if (!file.type.startsWith('image/')) {
                          toast.error('Please select an image file')
                          e.target.value = ''
                          return
                        }
                        
                        setUploadingFile(true)
                        try {
                          const imageUrl = await handleFileUpload(file)
                          if (imageUrl) {
                            setEventForm({...eventForm, cover_image_url: imageUrl})
                            toast.success('Image uploaded successfully')
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error)
                          toast.error('Failed to upload image')
                        } finally {
                          setUploadingFile(false)
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={uploadingFile}
                    />
                    
                    {uploadingFile && (
                      <div className="flex items-center mt-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Uploading image...</span>
                      </div>
                    )}
                    
                    {eventForm.cover_image_url && !uploadingFile && (
                      <div className="mt-3 relative inline-block max-w-md">
                        <img 
                          src={eventForm.cover_image_url} 
                          alt="Event cover preview" 
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEventForm({...eventForm, cover_image_url: ''})
                            // Reset file input
                            const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement
                            if (fileInput) fileInput.value = ''
                          }}
                          className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 shadow-lg"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: 1920x1080px (16:9 ratio). Max 5MB. Supports JPG, PNG, WebP.
                    </p>
                  </div>

                  {/* Capacity Settings */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Capacity Management</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maximum Capacity
                          <span className="text-gray-500 font-normal ml-1">(optional)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={eventForm.capacity || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setEventForm({...eventForm, capacity: value})
                            // Auto-disable waitlist if capacity is removed
                            if (!value) {
                              setEventForm({...eventForm, capacity: '', waitlist_enabled: false})
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Unlimited"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty for unlimited registrations
                        </p>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="waitlist_enabled"
                            checked={eventForm.waitlist_enabled}
                            onChange={(e) => setEventForm({...eventForm, waitlist_enabled: e.target.checked})}
                            disabled={!eventForm.capacity}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label 
                            htmlFor="waitlist_enabled" 
                            className={`ml-2 text-sm ${eventForm.capacity ? 'text-gray-700' : 'text-gray-400'}`}
                          >
                            Enable waitlist when full
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {eventForm.capacity ? 'Members can join waitlist' : 'Set capacity first'}
                        </p>
                      </div>
                    </div>
                    
                    {eventForm.capacity && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Capacity set to {eventForm.capacity} people.</strong>
                          {eventForm.waitlist_enabled 
                            ? ' Waitlist will be available when full.' 
                            : ' Registration will close when full.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* T-shirt (event add-on) */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Event T-shirt</h4>
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        id="tshirt_enabled"
                        checked={eventForm.tshirt_enabled}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, tshirt_enabled: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="tshirt_enabled" className="text-sm font-medium text-gray-700">
                        Offer T-shirts for this event
                      </label>
                    </div>

                    {eventForm.tshirt_enabled && (
                      <div className="ml-0 space-y-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pricing
                            </label>
                            <select
                              value={eventForm.tshirt_pricing}
                              onChange={(e) =>
                                setEventForm({
                                  ...eventForm,
                                  tshirt_pricing: e.target.value as 'free' | 'paid',
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="free">Free</option>
                              <option value="paid">Paid</option>
                            </select>
                            {eventForm.tshirt_pricing === 'paid' && (
                              <p className="text-xs text-amber-700 mt-1">
                                Payment collection (v2) comes next — size choice is saved as pending.
                              </p>
                            )}
                          </div>
                          {eventForm.tshirt_pricing === 'paid' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price (CNY)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={eventForm.tshirt_price}
                                onChange={(e) =>
                                  setEventForm({ ...eventForm, tshirt_price: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g. 50"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Available sizes
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => {
                              const selected = eventForm.tshirt_sizes.includes(size)
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    const next = selected
                                      ? eventForm.tshirt_sizes.filter((s) => s !== size)
                                      : [...eventForm.tshirt_sizes, size]
                                    setEventForm({ ...eventForm, tshirt_sizes: next })
                                  }}
                                  className={`px-3 py-1.5 text-sm rounded-md border ${
                                    selected
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {size}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="tshirt_required"
                            checked={eventForm.tshirt_required}
                            onChange={(e) =>
                              setEventForm({ ...eventForm, tshirt_required: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="tshirt_required" className="text-sm text-gray-700">
                            Require size when registering
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            T-shirt design photo
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            Members, guests, and non-members will see this design when registering.
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Image must be less than 5MB')
                                e.target.value = ''
                                return
                              }
                              if (!file.type.startsWith('image/')) {
                                toast.error('Please select an image file')
                                e.target.value = ''
                                return
                              }
                              setUploadingFile(true)
                              try {
                                const imageUrl = await handleFileUpload(file)
                                if (imageUrl) {
                                  setEventForm({ ...eventForm, tshirt_image_url: imageUrl })
                                  toast.success('T-shirt photo uploaded')
                                }
                              } catch (error) {
                                console.error('Error uploading T-shirt image:', error)
                                toast.error('Failed to upload T-shirt photo')
                              } finally {
                                setUploadingFile(false)
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            disabled={uploadingFile}
                          />
                          {eventForm.tshirt_image_url && !uploadingFile && (
                            <div className="mt-3 relative inline-block max-w-xs">
                              <img
                                src={eventForm.tshirt_image_url}
                                alt="T-shirt design preview"
                                className="w-full h-40 object-contain rounded-lg bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setEventForm({ ...eventForm, tshirt_image_url: '' })
                                }
                                className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 shadow-lg"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Registration Settings */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="requires_registration"
                        checked={eventForm.requires_registration}
                        onChange={(e) => setEventForm({...eventForm, requires_registration: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="requires_registration" className="text-sm font-medium text-gray-700">
                        Requires Registration
                      </label>
                    </div>

                    {/* Public Registration Options */}
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="allow_public_registration"
                        checked={eventForm.allow_public_registration || false}
                        onChange={(e) => setEventForm({...eventForm, allow_public_registration: e.target.checked})}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="allow_public_registration" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        🌐 Allow Public Registration
                        <span className="text-xs text-gray-500">(Non-members can register from website)</span>
                      </label>
                    </div>

                    {eventForm.allow_public_registration && (
                      <div className="ml-6 mb-4 space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="require_guest_approval"
                            checked={eventForm.require_guest_approval !== false}
                            onChange={(e) => setEventForm({...eventForm, require_guest_approval: e.target.checked})}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <label htmlFor="require_guest_approval" className="text-sm font-medium text-gray-700">
                            ✓ Require Approval for Public Registrations
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 ml-6 mt-1">
                          {eventForm.require_guest_approval !== false 
                            ? "Public registrations will need secretary/admin approval" 
                            : "Public registrations will be auto-approved"}
                        </p>
                        
                        {/* Payment QR Code for Paid Events */}
                        {(eventForm.event_type === 'ticket_only' || eventForm.event_type === 'hybrid') && (
                          <div className="ml-6 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              💳 Payment QR Code 
                              <span className="text-red-500 ml-1">*</span>
                              <span className="text-gray-500 font-normal ml-1">(WeChat/Alipay)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                              Non-members will scan this QR code to pay, then upload payment proof
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('QR code image must be less than 2MB')
                                  e.target.value = ''
                                  return
                                }
                                
                                if (!file.type.startsWith('image/')) {
                                  toast.error('Please select an image file')
                                  e.target.value = ''
                                  return
                                }
                                
                                setUploadingFile(true)
                                try {
                                  const qrUrl = await handleFileUpload(file)
                                  if (qrUrl) {
                                    setEventForm({...eventForm, payment_qr_code_url: qrUrl})
                                    toast.success('QR code uploaded successfully')
                                  }
                                } catch (error) {
                                  console.error('Error uploading QR code:', error)
                                  toast.error('Failed to upload QR code')
                                } finally {
                                  setUploadingFile(false)
                                }
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                              disabled={uploadingFile}
                            />
                            
                            {eventForm.payment_qr_code_url && !uploadingFile && (
                              <div className="mt-3 relative inline-block">
                                <img 
                                  src={eventForm.payment_qr_code_url} 
                                  alt="Payment QR Code" 
                                  className="w-48 h-48 object-contain border-2 border-green-300 rounded-lg p-2 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEventForm({...eventForm, payment_qr_code_url: ''})
                                  }}
                                  className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {eventForm.requires_registration && (
                      <div className="ml-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <input
                                type="date"
                                value={eventForm.registration_deadline?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const date = e.target.value
                                  const time = eventForm.registration_deadline?.split('T')[1] || '23:59'
                                  setEventForm({...eventForm, registration_deadline: `${date}T${time}`})
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <input
                                type="time"
                                value={eventForm.registration_deadline?.split('T')[1] || '23:59'}
                                onChange={(e) => {
                                  const date = eventForm.registration_deadline?.split('T')[0] || new Date().toISOString().split('T')[0]
                                  const time = e.target.value
                                  setEventForm({...eventForm, registration_deadline: `${date}T${time}`})
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event File (Flyer/Document)</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            // Check file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('File size must be less than 5MB')
                              e.target.value = ''
                              return
                            }
                            const fileUrl = await handleFileUpload(file)
                            if (fileUrl) {
                              setEventForm({...eventForm, event_file_url: fileUrl})
                              toast.success('File uploaded successfully')
                            }
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={uploadingFile}
                      />
                      {uploadingFile && (
                        <p className="text-sm text-blue-600">Uploading file...</p>
                      )}
                      {eventForm.event_file_url && !uploadingFile && (
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-green-700">File uploaded successfully</span>
                          <button
                            type="button"
                            onClick={() => setEventForm({...eventForm, event_file_url: ''})}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)</p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button onClick={createEvent} className="btn-primary" disabled={uploadingFile}>
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </button>
                    <button 
                      onClick={() => {
                        setShowEventForm(false)
                        setEditingEvent(null)
                        setEventForm({
                          title: '',
                          description: '',
                          event_date: '',
                          location: '',
                          event_type: 'free',
                          event_format: 'in_person',
                          online_link: '',
                          online_meeting_id: '',
                          online_password: '',
                          requires_registration: false,
                          registration_deadline: '',
                          event_file_url: '',
                          capacity: '',
                          waitlist_enabled: false,
                          cover_image_url: '',
                          allow_public_registration: false,
                          require_guest_approval: true,
                          payment_qr_code_url: '',
                          tshirt_enabled: false,
                          tshirt_pricing: 'free',
                          tshirt_price: '',
                          tshirt_sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                          tshirt_required: false,
                          tshirt_image_url: ''
                        })
                      }} 
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No events scheduled</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events
                      .slice((eventsPage - 1) * eventsPerPage, eventsPage * eventsPerPage)
                      .map(event => {
                        return (
                          <div key={event.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            {/* Cover Image */}
                            {event.cover_image_url ? (
                              <div className="w-full h-48 overflow-hidden bg-gray-100">
                                <img 
                                  src={event.cover_image_url} 
                                  alt={event.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Calendar className="w-16 h-16 text-white opacity-50" />
                              </div>
                            )}
                            
                            {/* Event Content */}
                            <div className="p-4">
                              {/* Header with Title and Status */}
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">
                                  {event.title}
                                </h4>
                                <div className="ml-3 flex flex-col items-end gap-1">
                                  {/* Event Type Badge */}
                                  {event.event_type === 'ticket_only' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                      🎫 Ticket Only
                                    </span>
                                  ) : event.event_type === 'free' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                      🆓 Free Event
                                    </span>
                                  ) : event.event_type === 'registration_required' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                      📝 Registration Required
                                    </span>
                                  ) : event.event_type === 'hybrid' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                      ⚡ Hybrid Event
                                    </span>
                                  ) : null}
                                  
                                  {/* Status Badge */}
                                  {event.status === 'cancelled' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Cancelled
                                    </span>
                                  ) : event.status === 'completed' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      Completed
                                    </span>
                                  ) : event.status === 'ongoing' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Ongoing
                                    </span>
                                  ) : new Date(event.event_date) < new Date() ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      Past
                                    </span>
                                  ) : event.registration_status === 'full' ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      FULL
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Open
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Event Details */}
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                                  <span>{formatDate(event.event_date)}</span>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                                  <span className="line-clamp-1">
                                    {event.event_format === 'online'
                                      ? event.location || 'Online'
                                      : event.location || 'Location TBA'}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm">
                                  {event.event_format === 'online' || event.event_format === 'hybrid' ? (
                                    <Video className="w-4 h-4 mr-2 flex-shrink-0 text-blue-600" />
                                  ) : (
                                    <span className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden />
                                  )}
                                  <span
                                    className={
                                      event.event_format === 'online'
                                        ? 'font-medium text-blue-700'
                                        : event.event_format === 'hybrid'
                                          ? 'font-medium text-purple-700'
                                          : 'font-medium text-gray-700'
                                    }
                                  >
                                    {event.event_format === 'online'
                                      ? 'Online'
                                      : event.event_format === 'hybrid'
                                        ? 'Hybrid (In Person + Online)'
                                        : 'In Person'}
                                  </span>
                                  {event.online_link &&
                                    (event.event_format === 'online' ||
                                      event.event_format === 'hybrid') && (
                                      <a
                                        href={event.online_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-blue-600 hover:underline truncate max-w-[140px]"
                                      >
                                        Join link
                                      </a>
                                    )}
                                </div>
                                
                                {event.requires_registration && (
                                  <div className="flex items-center text-sm text-gray-900 font-medium">
                                    <Users className="w-4 h-4 mr-2 flex-shrink-0 text-blue-600" />
                                    <span>
                                      {event.registration_count || 0}
                                      {event.capacity && ` / ${event.capacity}`}
                                      {' '}registered
                                    </span>
                                    {event.capacity && event.spots_remaining > 0 && (
                                      <span className="ml-2 text-green-600">
                                        ({event.spots_remaining} spots left)
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Average Rating */}
                                {event.average_rating > 0 && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <span className="text-yellow-500 mr-1">⭐</span>
                                    <span className="font-medium">{event.average_rating.toFixed(1)}</span>
                                    <span className="ml-1">({event.rating_count} reviews)</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Quick Actions Row */}
                              <div className="flex items-center gap-2 mb-3">
                                {/* Status Dropdown */}
                                <select
                                  value={event.status || 'upcoming'}
                                  onChange={(e) => updateEventStatus(event.id, e.target.value)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="upcoming">Upcoming</option>
                                  <option value="ongoing">Ongoing</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>

                                {/* Schedule Reminders */}
                                {event.status === 'upcoming' && new Date(event.event_date) > new Date() && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      scheduleReminders(event.id)
                                    }}
                                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                    title="Schedule reminders"
                                  >
                                    🔔 Reminders
                                  </button>
                                )}
                              </div>

                              {/* Primary Actions */}
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={() => handleViewEvent(event)}
                                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                                <button
                                  onClick={() => handleEditEvent(event)}
                                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete "${event.title}"?`)) {
                                      deleteEvent(event.id)
                                    }
                                  }}
                                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Secondary Actions - Feature Buttons */}
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  onClick={() => openEventAttendanceModal(event)}
                                  className="px-2 py-1.5 bg-indigo-50 text-indigo-600 text-xs rounded hover:bg-indigo-100 flex items-center justify-center gap-1 font-medium"
                                  title="Track attendance"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  Attendance
                                </button>
                                <button
                                  onClick={() => router.push(`/secretary/events/${event.id}/checkin`)}
                                  className="px-2 py-1.5 bg-gray-50 text-gray-600 text-xs rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                                  title="Check-in attendees"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Check-In
                                </button>
                                {event.tshirt_enabled && (
                                  <button
                                    onClick={() => router.push(`/secretary/events/${event.id}/tshirts`)}
                                    className="px-2 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100 flex items-center justify-center gap-1 font-medium"
                                    title="Print T-shirt orders by size"
                                  >
                                    T-shirts
                                  </button>
                                )}
                                <button
                                  onClick={() => router.push(`/secretary/events/analytics?eventId=${event.id}`)}
                                  className="px-2 py-1.5 bg-gray-50 text-gray-600 text-xs rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                                  title="View analytics"
                                >
                                  📊 Analytics
                                </button>
                                <button
                                  onClick={() => {
                                    setViewingEvent(event)
                                    setShowViewEvent(true)
                                  }}
                                  className="px-2 py-1.5 bg-gray-50 text-gray-600 text-xs rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                                  title="View feedback"
                                >
                                  ⭐ Feedback
                                </button>
                                {event.status === 'completed' && (
                                  <button
                                    onClick={() => handleGenerateCertificates(event)}
                                    className="px-2 py-1.5 bg-gray-50 text-gray-600 text-xs rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                                    title="Generate certificates"
                                  >
                                    🎓 Certificates
                                  </button>
                                )}
                                {event.capacity && event.waitlist_enabled && (
                                  <button
                                    onClick={() => handleViewWaitlist(event)}
                                    className="px-2 py-1.5 bg-gray-50 text-gray-600 text-xs rounded hover:bg-gray-100 flex items-center justify-center gap-1"
                                    title="Manage waitlist"
                                  >
                                    📋 Waitlist ({event.waitlist_count || 0})
                                  </button>
                                )}
                              </div>

                              {/* Category Tags */}
                              {event.categories && event.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {event.categories.slice(0, 3).map((cat: any) => (
                                    <span
                                      key={cat.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                                    >
                                      {cat.icon} {cat.name}
                                    </span>
                                  ))}
                                  {event.categories.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                      +{event.categories.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* Pagination */}
                  {events.length > eventsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Showing {((eventsPage - 1) * eventsPerPage) + 1} to {Math.min(eventsPage * eventsPerPage, events.length)} of {events.length} events
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEventsPage(prev => Math.max(1, prev - 1))}
                          disabled={eventsPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Previous
                        </button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: Math.ceil(events.length / eventsPerPage) }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setEventsPage(page)}
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                eventsPage === page
                                  ? 'bg-[#003366] text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setEventsPage(prev => Math.min(Math.ceil(events.length / eventsPerPage), prev + 1))}
                          disabled={eventsPage === Math.ceil(events.length / eventsPerPage)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* Announcements (nested under Meetings) */}
        {(activeTab === 'meetings' || activeTab === 'announcements') && meetingsSubTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Announcements</h2>
              <button
                onClick={() => {
                  setEditingAnnouncement(null)
                  setAnnouncementForm({
                    title: '',
                    content: '',
                    priority: 'normal',
                    expires_at: ''
                  })
                  setShowAnnouncementForm(true)
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Announcement</span>
              </button>
            </div>

            {showAnnouncementForm && (
              <div className="card">
                <h3 className="text-lg font-bold mb-4">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                      className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                      placeholder="Enter announcement title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                    <textarea
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                      rows={5}
                      placeholder="Enter announcement content"
                      required
                    />
                  </div>
                  
                  {/* Priority and Expires At inline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={announcementForm.priority}
                        onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
                      <input
                        type="date"
                        value={announcementForm.expires_at}
                        onChange={(e) => setAnnouncementForm({...announcementForm, expires_at: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00205B] focus:border-transparent"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Leave expiration empty for permanent announcements</p>
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={createAnnouncement} 
                      className="btn-primary flex items-center space-x-2"
                    >
                      {editingAnnouncement ? (
                        <>
                          <Edit className="w-4 h-4" />
                          <span>Update Announcement</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Announcement</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleCancelEdit} 
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold mb-4">Active Announcements</h3>
              {announcements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No announcements</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {announcements
                      .slice((announcementsPage - 1) * announcementsPerPage, announcementsPage * announcementsPerPage)
                      .map(announcement => (
                      <div key={announcement.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-base text-gray-900">{announcement.title}</h4>
                              <Megaphone className={`w-4 h-4 ${
                                announcement.priority === 'urgent' ? 'text-red-600' :
                                announcement.priority === 'high' ? 'text-orange-600' :
                                announcement.priority === 'low' ? 'text-gray-500' :
                                'text-blue-600'
                              }`} />
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{announcement.content}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{new Date(announcement.created_at).toLocaleString()}</span>
                              {announcement.expires_at && (
                                <span>Expires: {new Date(announcement.expires_at).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleViewAnnouncement(announcement)}
                              className="text-green-600 hover:text-green-700"
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEditAnnouncement(announcement)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(announcement.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {announcements.length > announcementsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {((announcementsPage - 1) * announcementsPerPage) + 1} to {Math.min(announcementsPage * announcementsPerPage, announcements.length)} of {announcements.length} announcements
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setAnnouncementsPage(p => Math.max(1, p - 1))}
                          disabled={announcementsPage === 1}
                          className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {announcementsPage} of {Math.ceil(announcements.length / announcementsPerPage)}
                        </span>
                        <button
                          onClick={() => setAnnouncementsPage(p => Math.min(Math.ceil(announcements.length / announcementsPerPage), p + 1))}
                          disabled={announcementsPage >= Math.ceil(announcements.length / announcementsPerPage)}
                          className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* View Announcement Modal */}
        {showViewAnnouncement && viewingAnnouncement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{viewingAnnouncement.title}</h2>
                      <Megaphone className={`w-6 h-6 ${
                        viewingAnnouncement.priority === 'urgent' ? 'text-red-600' :
                        viewingAnnouncement.priority === 'high' ? 'text-orange-600' :
                        viewingAnnouncement.priority === 'low' ? 'text-gray-500' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      viewingAnnouncement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      viewingAnnouncement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      viewingAnnouncement.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {viewingAnnouncement.priority.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewAnnouncement(false)
                      setViewingAnnouncement(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Content</h3>
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{viewingAnnouncement.content}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
                      <p className="text-gray-900">{new Date(viewingAnnouncement.created_at).toLocaleString()}</p>
                    </div>
                    {viewingAnnouncement.expires_at && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Expires</h3>
                        <p className="text-gray-900">{new Date(viewingAnnouncement.expires_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {viewingAnnouncement.updated_at && (
                    <div className="pt-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h3>
                      <p className="text-gray-700 text-sm">{new Date(viewingAnnouncement.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowViewAnnouncement(false)
                      handleEditAnnouncement(viewingAnnouncement)
                    }}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this announcement?')) {
                        deleteAnnouncement(viewingAnnouncement.id)
                        setShowViewAnnouncement(false)
                        setViewingAnnouncement(null)
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-1 flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowViewAnnouncement(false)
                      setViewingAnnouncement(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Birthdays Tab */}
        {activeTab === 'birthdays' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Birthdays & Celebrations</h2>
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Birthday Photo</span>
              </button>
            </div>

            {showPhotoUpload && (
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Upload Birthday Photo</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                    <textarea
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Add a birthday message..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={handlePhotoUpload} className="btn-primary">Submit Photo</button>
                    <button onClick={() => setShowPhotoUpload(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Cake className="w-5 h-5 mr-2 text-pink-500" />
                  Upcoming Birthdays (Next 14 Days)
                </h3>
                {upcomingBirthdays.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming birthdays</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBirthdays.map(birthday => (
                      <div key={birthday.id} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                        <div>
                          <p className="font-medium">{birthday.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {birthday.members_profile?.date_of_birth && new Date(birthday.members_profile.date_of_birth).toLocaleDateString()}
                          </p>
                        </div>
                        <Cake className="w-5 h-5 text-pink-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-bold mb-4">Birthday Photo Gallery</h3>
                {birthdayPhotos.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No birthday photos yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {birthdayPhotos.map(photo => (
                      <div key={photo.id} className="birthday-photo-card group">
                        <div 
                          className="relative overflow-hidden"
                          onClick={() => handleViewPhoto(photo)}
                          style={{cursor: 'pointer'}}
                        >
                          <img
                            src={photo.photo_url}
                            alt={photo.caption || 'Birthday photo'}
                          />
                          <div className="birthday-photo-overlay" />
                          {/* View icon hint on hover */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            pointerEvents: 'none'
                          }} className="group-hover:opacity-100">
                            <Eye style={{width: '48px', height: '48px', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
                          </div>
                        </div>
                        <div style={{padding: '12px'}}>
                          <p style={{fontWeight: 600, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {photo.users?.full_name}
                          </p>
                          {photo.caption && (
                            <p className="line-clamp-2" style={{fontSize: '0.75rem', color: '#4B5563', marginTop: '4px'}}>
                              {photo.caption}
                            </p>
                          )}
                          <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6'}}>
                            <p style={{fontSize: '0.75rem', color: '#6B7280', marginBottom: '8px'}}>
                              {new Date(photo.created_at).toLocaleDateString()}
                            </p>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px', width: '100%'}}>
                              {photo.is_reposted ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px 12px',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  backgroundColor: '#F0FDF4',
                                  color: '#15803D',
                                  border: '1px solid #BBF7D0',
                                  width: '100%'
                                }}>
                                  <Megaphone style={{width: '12px', height: '12px', marginRight: '4px'}} />
                                  Reposted
                                </div>
                              ) : (
                                <button
                                  onClick={() => repostBirthdayPhoto(photo.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    backgroundColor: '#00205B',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                    transition: 'background-color 0.2s',
                                    width: '100%'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003380'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00205B'}
                                  title="Repost so all members can see"
                                >
                                  <Megaphone style={{width: '12px', height: '12px', marginRight: '6px'}} />
                                  Repost to All Members
                                </button>
                              )}
                              <button
                                onClick={() => deleteBirthdayPhoto(photo.id, photo.photo_url)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '8px 12px',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FEE2E2',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  width: '100%'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                                  e.currentTarget.style.color = '#B91C1C';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                                  e.currentTarget.style.color = '#DC2626';
                                }}
                                title="Delete photo"
                              >
                                <Trash2 style={{width: '14px', height: '14px', marginRight: '6px'}} />
                                Delete Photo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Loan Applications</h2>
                <p className="text-sm text-gray-600">Review loan applications and check payment history</p>
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
                <button
                  onClick={() => setShowLoanSettings(true)}
                  className="btn-outline flex items-center space-x-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m-6-6h6m6 0h6"></path>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Loan Settings</span>
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

                      {/* Pending Review */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-yellow-300">Pending Secretary</p>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-white">{loanStatistics.pending_secretary}</p>
                        <p className="text-xs text-yellow-300 mt-1">Awaiting your review</p>
                      </div>

                      {/* Approved */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-300">Approved</p>
                          <UserCheck className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{loanStatistics.approved_loans}</p>
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
                        <p className="text-3xl font-bold text-white">{loanStatistics.pending_finance}</p>
                        <p className="text-xs text-orange-300 mt-1">Awaiting finance review</p>
                      </div>

                      {/* Rejected */}
                      <div className="bg-[#00205B] border border-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-300">Rejected</p>
                          <UserX className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{loanStatistics.rejected_loans}</p>
                        <p className="text-xs text-gray-300 mt-1">Did not meet criteria</p>
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
                          <p className="text-sm text-gray-600 mb-1">Total Disbursed</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.total_amount_disbursed || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Total Repaid</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.total_amount_repaid || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.total_outstanding || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Average Loan Size</p>
                          <p className="text-2xl font-bold text-[#00205B]">¥{parseFloat(loanStatistics.average_loan_amount || 0).toFixed(2)}</p>
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

            {/* Loan Requirement Alert */}
            {(loanRequiresDuesClear || loanMinimumMonths > 0) && (
              <div style={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'start',
                gap: '12px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0, marginTop: '2px'}}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '0.875rem', fontWeight: 600, color: '#92400E', marginBottom: '4px'}}>
                    Loan Application Requirements
                  </p>
                  <ul style={{fontSize: '0.75rem', color: '#B45309', marginTop: '4px', paddingLeft: '16px', listStyle: 'disc'}}>
                    {loanRequiresDuesClear && (
                      <li style={{marginBottom: '2px'}}>Members must clear all outstanding monthly dues</li>
                    )}
                    {loanMinimumMonths > 0 && (
                      <li>Members must have paid dues for at least {loanMinimumMonths} {loanMinimumMonths === 1 ? 'month' : 'months'}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {loans.length === 0 ? (
              <div className="card text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No loan applications</p>
                <p className="text-gray-500">Pending loan applications will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map(loan => (
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
                            <p className="text-sm text-gray-500">Reason</p>
                            <p className="font-medium">{loan.reason}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">University</p>
                            <p className="font-medium">{loan.university || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Scholarship Status</p>
                            <p className="font-medium capitalize">{loan.users?.members_profile?.[0]?.scholarship_status || 'N/A'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Applied: {new Date(loan.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewLoanDetails(loan)}
                          className="px-4 py-2 bg-[#00205B] hover:bg-[#003d82] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                        {loan.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveLoan(loan.id)}
                              disabled={processing === loan.id}
                              className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Committees Tab */}
        {activeTab === 'committees' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Committees</h2>
              <button
                onClick={() => {
                  setCommitteeForm({ committee_name: '', description: '', monthly_due: 0 })
                  setEditingCommittee(null)
                  setShowCommitteeModal(true)
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Committee</span>
              </button>
            </div>
            
            {/* Pagination info */}
            <div className="text-sm text-gray-600">
              Showing {((committeePage - 1) * committeesPerPage) + 1} to {Math.min(committeePage * committeesPerPage, committees.length)} of {committees.length} committees
            </div>

            <div className="space-y-4">
              {committees
                .slice((committeePage - 1) * committeesPerPage, committeePage * committeesPerPage)
                .map(committee => (
                <div key={committee.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{committee.committee_name}</h3>
                      <p className="text-sm text-gray-600">{committee.description || 'No description'}</p>
                      <p className="text-sm font-medium text-[#003366] mt-2">Monthly Due: ¥{committee.monthly_due}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCommittee(committee)
                          fetchCommitteeMembers(committee.id)
                          setShowMemberModal(true)
                        }}
                        className="btn-outline text-sm"
                      >
                        Manage Members
                      </button>
                      <button
                        onClick={() => editCommittee(committee)}
                        className="btn-outline text-sm"
                      >
   Edit
                      </button>
                      <button
                        onClick={() => deleteCommittee(committee.id)}
                        className="btn-outline text-sm text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {committees.length === 0 && (
                <p className="text-gray-500 text-center py-8">No committees found. Click "Add Committee" to create one.</p>
              )}
            </div>

            {/* Pagination controls */}
            {committees.length > committeesPerPage && (
              <div className="flex items-center justify-between border-t pt-4">
                <button
                  onClick={() => setCommitteePage(prev => Math.max(1, prev - 1))}
                  disabled={committeePage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <div className="flex space-x-2">
                  {Array.from({ length: Math.ceil(committees.length / committeesPerPage) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCommitteePage(page)}
                      className={`px-4 py-2 rounded-lg ${
                        committeePage === page
                          ? 'bg-[#003366] text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCommitteePage(prev => Math.min(Math.ceil(committees.length / committeesPerPage), prev + 1))}
                  disabled={committeePage === Math.ceil(committees.length / committeesPerPage)}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Budget Proposals Tab */}
        {activeTab === 'budget_proposals' && (
          <div className="card">
            <BudgetProposalsPanel
              mode="staff"
              canManage
              canPay={false}
              title="Budget Proposals"
              subtitle="Assign proposals to committee heads, then approve or reject submissions"
            />
          </div>
        )}

        {/* Committee Members Modal */}
        {showMemberModal && selectedCommittee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
              <div className="bg-gradient-to-r from-[#00205B] to-[#003366] text-white px-8 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Manage Members - {selectedCommittee.committee_name}</h2>
                  <button
                    onClick={() => {
                      setShowMemberModal(false)
                      setSelectedCommittee(null)
                      setCommitteeMembers([])
                    }}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-8">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Member</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#003366] focus:border-transparent"
                    onChange={(e) => {
                      if (e.target.value) {
                        addMemberToCommittee(e.target.value)
                      }
                    }}
                    value=""
                  >
                    <option value="">Select a member to add...</option>
                    {users.filter(u => !committeeMembers.find(cm => cm.user_id === u.id)).map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Current Members ({committeeMembers.length})</h3>
                  {committeeMembers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No members in this committee yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {committeeMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                          <div>
                            <p className="font-medium">{member.users?.full_name}</p>
                            <p className="text-sm text-gray-600">{member.users?.email}</p>
                          </div>
                          <button
                            onClick={() => removeMemberFromCommittee(member.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Member Modal */}
        {showViewMember && viewingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#00205B] to-[#003366] text-white px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {viewingMember.members_profile?.[0]?.photo_url ? (
                      <img
                        src={viewingMember.members_profile[0].photo_url}
                        alt={viewingMember.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white"
                        onError={(e) => {
                          console.error('Failed to load photo:', viewingMember.members_profile[0].photo_url)
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-white">
                      <img
                        src="https://flagcdn.com/w320/lr.png"
                        alt="Liberia Flag"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{viewingMember.full_name}</h2>
                      <p className="text-blue-200 text-sm">{viewingMember.members_profile?.[0]?.member_id || 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewMember(false)
                      setViewingMember(null)
                    }}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Information Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-lg text-[#003366]">User Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Full Name</span>
                        <span className="font-medium text-gray-900">{viewingMember.full_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="font-medium text-gray-900">{viewingMember.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Role</span>
                        <span className="font-medium capitalize text-gray-900">{viewingMember.role}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-500">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          viewingMember.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>{viewingMember.status}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">Photo</span>
                        <div className="w-[120px] h-[120px] rounded overflow-hidden border-2 border-gray-300 bg-gray-100">
                          {viewingMember.members_profile?.[0]?.photo_url ? (
                            <img
                              src={viewingMember.members_profile[0].photo_url}
                              alt={viewingMember.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src="https://flagcdn.com/w320/lr.png"
                              alt="Liberia Flag"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Profile Information */}
                {viewingMember.members_profile?.[0] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-[#003366]">Profile Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Member ID</p>
                        <p className="font-medium font-mono">{viewingMember.members_profile[0].member_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">University</p>
                        <p className="font-medium">{viewingMember.members_profile[0].university || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Campus</p>
                        <p className="font-medium">{viewingMember.members_profile[0].university_campus || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Degree Level</p>
                        <p className="font-medium">{viewingMember.members_profile[0].current_degree_level || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Major Program</p>
                        <p className="font-medium">{viewingMember.members_profile[0].major_program || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Year of Study</p>
                        <p className="font-medium">{viewingMember.members_profile[0].year_of_study || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Expected Graduation</p>
                        <p className="font-medium">{viewingMember.members_profile[0].expected_graduation_year || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Scholarship Status</p>
                        <p className="font-medium capitalize">{viewingMember.members_profile[0].scholarship_status || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{viewingMember.members_profile[0].phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">WhatsApp</p>
                        <p className="font-medium">{viewingMember.members_profile[0].whatsapp_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">WeChat ID</p>
                        <p className="font-medium">{viewingMember.members_profile[0].wechat_id || 'N/A'}</p>
                      </div>
                      {/* Birthday (Month & Day only - Year hidden for privacy) */}
                      <div>
                        <p className="text-sm text-gray-500">Birthday</p>
                        <p className="font-medium">
                          {viewingMember.members_profile[0].date_of_birth 
                            ? new Date(viewingMember.members_profile[0].date_of_birth).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="font-medium capitalize">{viewingMember.members_profile[0].gender || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">County of Origin</p>
                        <p className="font-medium">{viewingMember.members_profile[0].county_of_origin || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Beijing Address</p>
                        <p className="font-medium">{viewingMember.members_profile[0].beijing_address || viewingMember.members_profile[0].address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passport Information */}
                {viewingMember.members_profile?.[0] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-[#003366]">Passport Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Issue Date</p>
                        <p className="font-medium">
                          {viewingMember.members_profile[0].passport_issue_date 
                            ? new Date(viewingMember.members_profile[0].passport_issue_date).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Expiration Date</p>
                        <p className="font-medium">
                          {viewingMember.members_profile[0].passport_expiration_date 
                            ? new Date(viewingMember.members_profile[0].passport_expiration_date).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Chinese Visa Expiration</p>
                        <p className="font-medium">
                          {viewingMember.members_profile[0].chinese_visa_expiration_date 
                            ? new Date(viewingMember.members_profile[0].chinese_visa_expiration_date).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {viewingMember.members_profile?.[0] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-[#003366]">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Contact Name</p>
                        <p className="font-medium">{viewingMember.members_profile[0].emergency_contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Relationship</p>
                        <p className="font-medium">{viewingMember.members_profile[0].relationship_to_student || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{viewingMember.members_profile[0].emergency_contact_phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Social Media</p>
                        <p className="font-medium">{viewingMember.members_profile[0].emergency_contact_social || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Country</p>
                        <p className="font-medium">{viewingMember.members_profile[0].emergency_contact_country || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* BULS Membership */}
                {viewingMember.members_profile?.[0] && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-[#003366]">BULS Membership</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Current BULS Member</p>
                        <p className="font-medium">{viewingMember.members_profile[0].current_buls_member || 'N/A'}</p>
                      </div>
                      {viewingMember.members_profile[0].buls_support_areas && viewingMember.members_profile[0].buls_support_areas.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Support Areas</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Array.isArray(viewingMember.members_profile[0].buls_support_areas) 
                              ? viewingMember.members_profile[0].buls_support_areas.map((area: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{area}</span>
                                ))
                              : null}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Participate in Activities</p>
                        <p className="font-medium">{viewingMember.members_profile[0].participate_in_activities || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Skills & Talents</p>
                        <p className="font-medium">{viewingMember.members_profile[0].skills_talents || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Timestamps */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3 text-[#003366]">Account Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Created At</p>
                      <p className="font-medium">{new Date(viewingMember.created_at).toLocaleString()}</p>
                    </div>
                    {viewingMember.updated_at && (
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="font-medium">{new Date(viewingMember.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowViewMember(false)
                    setViewingMember(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewMember(false)
                    setViewingMember(null)
                    window.open(`/registration?edit=${viewingMember.id}`, '_blank')
                  }}
                  className="px-6 py-2 bg-[#00205B] text-white rounded-lg hover:bg-[#001640] transition-colors"
                >
                  Edit Member
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Member Modal - Removed since we now navigate to registration page */}

        {/* Loan Details Modal */}
        {showLoanDetails && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Loan Application Review</h2>
                <button
                  onClick={() => {
                    setShowLoanDetails(false)
                    setSelectedLoan(null)
                    setLoanRejectionReason('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Loan Details */}
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-5 text-[#00205B] border-b-2 border-[#00205B] pb-2">
                    Loan Information
                  </h3>
                  
                  {/* Applicant Summary Card */}
                  <div className="mb-6 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-[#00205B] text-white flex items-center justify-center text-xl font-bold">
                            {selectedLoan.users?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Applicant</p>
                            <p className="text-lg font-bold text-gray-900">{selectedLoan.users?.full_name}</p>
                            <p className="text-sm text-gray-600">{selectedLoan.users?.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Applied</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(selectedLoan.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(selectedLoan.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Amount Requested</p>
                      <p className="text-2xl font-bold text-[#00205B]">
                        ¥{parseFloat(selectedLoan.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Expected Repayment</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedLoan.expected_repayment_date ? new Date(selectedLoan.expected_repayment_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedLoan.expected_repayment_date ? 
                          `${Math.ceil((new Date(selectedLoan.expected_repayment_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days from now` 
                          : ''}
                      </p>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">University</p>
                      <p className="text-base font-semibold text-gray-900">{selectedLoan.university || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Scholarship Status</p>
                      <p className="text-base font-semibold text-gray-900 capitalize">
                        {selectedLoan.users?.members_profile?.[0]?.scholarship_status || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Purpose Section */}
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Purpose of Loan</p>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm leading-relaxed text-gray-700">{selectedLoan.reason}</p>
                    </div>
                  </div>
                </div>

                {/* Dues Eligibility Check */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
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
                  ) : selectedLoan.hasUnpaidDues ? (
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-bold text-red-800 mb-2">
                            ⚠️ LOAN REQUIREMENT NOT MET
                          </h4>
                          <p className="text-sm text-red-700 mb-4">
                            This member has <span className="font-bold">{selectedLoan.unpaidMonths?.length} unpaid month(s)</span> for {selectedLoan.selectedYear || selectedDuesYear}.
                            Members must pay all monthly dues up to the current month before being eligible for loans.
                          </p>
                          
                          {/* Paid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✓ Paid Months ({selectedLoan.paidMonthsCount || 0}) - Click for info:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoan.paidMonths?.map((month: string) => (
                                <button
                                  key={month}
                                  onClick={() => handleMonthClick(month, selectedLoan.selectedYear || selectedDuesYear)}
                                  className="px-3 py-1.5 border-2 border-green-500 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 transition-all cursor-pointer"
                                  title={`${month} ${selectedLoan.selectedYear || selectedDuesYear} - Click for info`}
                                >
                                  {month}
                                </button>
                              ))}
                              {selectedLoan.paidMonths?.length === 0 && (
                                <span className="text-sm text-gray-500 italic">No payments recorded</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Unpaid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✗ Unpaid Months ({selectedLoan.unpaidMonths?.length || 0}):</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoan.unpaidMonths?.map((month: string) => (
                                <span key={month} className="px-3 py-1.5 border-2 border-red-500 text-red-700 rounded-md text-sm font-medium">
                                  {month}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {/* Required Total */}
                          <div>
                            <p className="text-sm text-gray-700 font-medium mb-1">Required Total: <span className="text-lg font-bold text-gray-900">{selectedLoan.requiredMonthsCount || 0}</span> months</p>
                            <p className="text-xs text-gray-600">
                              Member must pay all months from January to {
                                selectedLoan.selectedYear === new Date().getFullYear() 
                                  ? new Date().toLocaleString('default', { month: 'long' })
                                  : 'December'
                              } for {selectedLoan.selectedYear || selectedDuesYear}
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
                            ✓ LOAN REQUIREMENT MET
                          </h4>
                          <p className="text-sm text-green-700 mb-4">
                            This member has paid all required monthly dues for {selectedLoan.selectedYear || selectedDuesYear}.
                            They are eligible to receive a loan.
                          </p>
                          
                          {/* Paid Months */}
                          <div className="mb-4 pb-4 border-b">
                            <p className="text-sm font-semibold text-gray-700 mb-3">✓ Paid Months ({selectedLoan.paidMonthsCount || 0}) - Click for info:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedLoan.paidMonths?.map((month: string) => (
                                <button
                                  key={month}
                                  onClick={() => handleMonthClick(month, selectedLoan.selectedYear || selectedDuesYear)}
                                  className="px-3 py-1.5 border-2 border-green-500 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 transition-all cursor-pointer"
                                  title={`${month} ${selectedLoan.selectedYear || selectedDuesYear} - Click for info`}
                                >
                                  {month}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Required Total */}
                          <div>
                            <p className="text-sm text-gray-700 font-medium mb-1">Required Total: <span className="text-lg font-bold text-gray-900">{selectedLoan.requiredMonthsCount || 0}</span> months</p>
                            <p className="text-xs text-gray-600">
                              Member must pay all months from January to {
                                selectedLoan.selectedYear === new Date().getFullYear() 
                                  ? new Date().toLocaleString('default', { month: 'long' })
                                  : 'December'
                              } for {selectedLoan.selectedYear || selectedDuesYear}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guarantor Information */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-3 text-[#003366]">Guarantor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Guarantor Name</p>
                      <p className="font-medium">{selectedLoan.guarantor_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Guarantor Phone</p>
                      <p className="font-medium">{selectedLoan.guarantor_phone || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Relationship to Guarantor</p>
                      <p className="font-medium">{selectedLoan.guarantor_relationship || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Application Document */}
                {selectedLoan.application_document_url && (
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-3 text-[#003366]">Written Application Document</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Document</p>
                        <p className="font-medium">{selectedLoan.application_document_name || 'Application Document'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {selectedLoan.application_document_uploaded_at ? new Date(selectedLoan.application_document_uploaded_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <a
                        href={selectedLoan.application_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#00205B] text-white px-4 py-2 rounded-lg hover:bg-[#003d82] transition-all font-medium text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-3 text-[#003366]">Payment History (Last 12 Months)</h3>
                  {selectedLoan.paymentHistory && selectedLoan.paymentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-sm font-medium">Month</th>
                            <th className="text-left py-2 px-3 text-sm font-medium">Year</th>
                            <th className="text-left py-2 px-3 text-sm font-medium">Amount</th>
                            <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLoan.paymentHistory.map((payment: any) => (
                            <tr key={payment.id} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-sm">{payment.month}</td>
                              <td className="py-2 px-3 text-sm">{payment.year}</td>
                              <td className="py-2 px-3 text-sm">¥{parseFloat(payment.amount).toFixed(2)}</td>
                              <td className="py-2 px-3">
                                <span className={`badge-${payment.status}`}>{payment.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No payment history available</p>
                  )}
                </div>

                {/* Disbursement Information - Secretary View (No Proof Access) */}
                {selectedLoan.status === 'disbursed' && (
                  <div className="p-4 border-t border-gray-200">
                    <h3 className="font-bold text-lg mb-3 text-[#003366] flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Disbursement Information
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Disbursement Method</p>
                          <p className="font-semibold text-gray-900">
                            {selectedLoan.disbursement_method === 'bank_transfer' && 'Bank Transfer'}
                            {selectedLoan.disbursement_method === 'cash' && 'Cash'}
                            {selectedLoan.disbursement_method === 'wechat' && 'WeChat Pay'}
                            {selectedLoan.disbursement_method === 'alipay' && 'Alipay'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Disbursement Date</p>
                          <p className="font-semibold text-gray-900">
                            {selectedLoan.disbursed_at ? new Date(selectedLoan.disbursed_at).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {selectedLoan.disbursement_notes && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Disbursement Notes</p>
                          <p className="text-sm text-gray-800">
                            {selectedLoan.disbursement_notes}
                          </p>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-green-700 italic">
                          ✓ This loan has been successfully disbursed by the Treasurer
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedLoan.status === 'pending' && (
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-3 text-red-700">Rejection Reason</h3>
                    <textarea
                      value={loanRejectionReason}
                      onChange={(e) => setLoanRejectionReason(e.target.value)}
                      placeholder="Provide a reason for rejecting this loan application..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                {selectedLoan.status === 'pending' && (
                  <>
                    <button
                      onClick={() => approveLoan(selectedLoan.id)}
                      disabled={processing === selectedLoan.id}
                      className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing === selectedLoan.id ? 'Processing...' : 'Approve & Send to Finance'}
                    </button>
                    <button
                      onClick={() => rejectLoan(selectedLoan.id)}
                      disabled={processing === selectedLoan.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg flex-1 hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {selectedLoan.status === 'secretary_approved' && (
                  <button
                    disabled
                    className="btn-primary flex-1 bg-[#00205B] opacity-70 cursor-not-allowed"
                  >
                    ✓ Approved - Sent to Finance
                  </button>
                )}
                
                {selectedLoan.status === 'finance_approved' && (
                  <button
                    disabled
                    className="btn-primary flex-1 bg-[#00205B] opacity-70 cursor-not-allowed"
                  >
                    ✓ Finance Approved - With Treasurer
                  </button>
                )}
                
                {selectedLoan.status === 'disbursed' && (
                  <button
                    disabled
                    className="btn-primary flex-1 bg-[#00205B] opacity-70 cursor-not-allowed"
                  >
                    ✓ Loan Disbursed
                  </button>
                )}
                
                {selectedLoan.status === 'rejected' && (
                  <button
                    disabled
                    className="px-4 py-2 bg-red-600 text-white rounded-lg flex-1 opacity-70 cursor-not-allowed"
                  >
                    ✗ Rejected
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowLoanDetails(false)
                    setSelectedLoan(null)
                    setLoanRejectionReason('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Settings Modal */}
      {showPaymentSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Due Payment Settings</h2>
            <p className="text-gray-600 mb-4">Set payment amounts based on scholarship status and rank</p>

            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Scholarship Status</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSC Scholarship (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.csc || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, csc: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MOFCOM Scholarship (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.mofcom || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, mofcom: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bilateral Scholarship (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.bilateral || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, bilateral: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self-Sponsored (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.self || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, self: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partial Scholarship (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.partial || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, partial: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other (¥)
                  </label>
                  <input
                    type="number"
                    value={paymentAmounts.other || ''}
                    onChange={(e) => setPaymentAmounts(prev => ({ ...prev, other: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2">Union Rank</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    President (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.president || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, president: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vice President (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.vice_president || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, vice_president: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    General Secretary (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.general_secretary || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, general_secretary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Treasurer (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.treasurer || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, treasurer: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Finance Secretary (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.finance_secretary || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, finance_secretary: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member (¥)
                  </label>
                  <input
                    type="number"
                    value={rankAmounts.member || ''}
                    onChange={(e) => setRankAmounts(prev => ({ ...prev, member: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 border-b pb-2">Committee Dues</h3>

              <div className="space-y-3">
                {committees.map(committee => (
                  <div key={committee.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {committee.committee_name} (¥)
                    </label>
                    <input
                      type="number"
                      value={committee.monthly_due || 0}
                      onChange={(e) => {
                        const updatedCommittees = committees.map(c => 
                          c.id === committee.id 
                            ? { ...c, monthly_due: parseFloat(e.target.value) || 0 }
                            : c
                        )
                        setCommittees(updatedCommittees)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ))}
                {committees.length === 0 && (
                  <p className="text-gray-500 text-sm">No committees found. Add committees first to set their dues.</p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={savePaymentAmounts}
                disabled={savingSettings}
                className="btn-primary flex-1"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={() => setShowPaymentSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Committee Modal */}
      {showCommitteeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingCommittee ? 'Edit Committee' : 'Add Committee'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Committee Name</label>
                <input
                  type="text"
                  value={committeeForm.committee_name}
                  onChange={(e) => setCommitteeForm(prev => ({ ...prev, committee_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={committeeForm.description}
                  onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Due (¥)</label>
                <input
                  type="number"
                  value={committeeForm.monthly_due}
                  onChange={(e) => setCommitteeForm(prev => ({ ...prev, monthly_due: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCommitteeModal(false)
                  setEditingCommittee(null)
                  setCommitteeForm({ committee_name: '', description: '', monthly_due: 0 })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveCommittee}
                className="btn-primary"
              >
                {editingCommittee ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Proposal Assignment Modal - Secretary only assigns committee and budget head */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingProposal ? 'Edit Budget Proposal Assignment' : 'Assign Budget Proposal'}
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You are assigning a committee member to create a budget proposal. 
                The assigned member will fill in the proposal details (title, description, and line items) after logging into their account.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Committee *</label>
                <select
                  value={proposalForm.committee_id}
                  onChange={(e) => {
                    setProposalForm(prev => ({ ...prev, committee_id: e.target.value, budget_head_id: '' }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Committee</option>
                  {committees.map((committee: any) => (
                    <option key={committee.id} value={committee.id}>
                      {committee.committee_name}
                    </option>
                  ))}
                </select>
              </div>

              {proposalForm.committee_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Proposal Head *</label>
                  <select
                    value={proposalForm.budget_head_id}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, budget_head_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select Budget Proposal Head</option>
                    {allMembers.length > 0 ? (
                      allMembers.map((member: any) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No members found</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This member will be responsible for creating and managing the budget proposal
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowProposalModal(false)
                  setEditingProposal(null)
                  setProposalForm({ committee_id: '', budget_head_id: '', title: '', description: '', items: [] })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveBudgetProposal}
                className="btn-primary"
                disabled={!proposalForm.committee_id || !proposalForm.budget_head_id}
              >
                Assign Budget Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Budget Proposal Modal - Read-only view */}
      {showViewProposalModal && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Budget Proposal Details</h2>
              <button
                onClick={() => {
                  setShowViewProposalModal(false)
                  setSelectedProposal(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedProposal.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  selectedProposal.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                  selectedProposal.status === 'approved' ? 'bg-green-100 text-green-800' :
                  selectedProposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedProposal.status === 'draft' ? 'Draft' :
                   selectedProposal.status === 'pending_review' ? 'Pending Review' :
                   selectedProposal.status === 'approved' ? 'Approved' :
                   selectedProposal.status === 'rejected' ? 'Rejected' : 'Paid'}
                </span>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{selectedProposal.title || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
                  <p className="text-gray-900">{selectedProposal.committees?.committee_name || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Budget Head)</label>
                <p className="text-gray-900">{selectedProposal.budget_head?.full_name || selectedProposal.budget_head?.email || 'N/A'}</p>
              </div>

              {selectedProposal.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-600">{selectedProposal.description}</p>
                </div>
              )}

              {/* Budget Items */}
              {selectedProposal.budget_proposal_items && selectedProposal.budget_proposal_items.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Items</label>
                  <div className="space-y-2">
                    {selectedProposal.budget_proposal_items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                          <span className="text-lg font-bold text-[#003366]">¥{item.total_cost?.toFixed(2)}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Qty: {item.quantity}</span>
                          <span>Unit Cost: ¥{item.unit_cost?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500">No budget items added yet</p>
                </div>
              )}

              {/* Total Amount */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total Budget Amount:</span>
                  <span className="text-2xl font-bold text-[#003366]">¥{selectedProposal.total_amount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4 text-sm text-gray-600 space-y-1">
                {selectedProposal.created_at && (
                  <p>Created: {new Date(selectedProposal.created_at).toLocaleString()}</p>
                )}
                {selectedProposal.submitted_at && (
                  <p>Submitted: {new Date(selectedProposal.submitted_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewProposalModal(false)
                  setSelectedProposal(null)
                }}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProposalForPayment && (
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
                  setShowPaymentModal(false)
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

      {/* Role Assignment Modal */}
      {showRankAssignModal && selectedMemberForRank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Assign Role</h2>
            <p className="text-gray-600 mb-4">
              Assign a role to <span className="font-medium">{selectedMemberForRank.full_name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                value={selectedRankId}
                onChange={(e) => setSelectedRankId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
              >
                {availableRanks.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Note: Admin and Embassy roles can only be assigned by Admin.</p>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAssignRank}
                disabled={assigningRank}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {assigningRank ? 'Assigning...' : 'Assign Role'}
              </button>
              <button
                onClick={() => {
                  setShowRankAssignModal(false)
                  setSelectedMemberForRank(null)
                  setSelectedRankId('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Event Modal */}
      {showViewEvent && viewingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Event Details</h3>
              <button
                onClick={() => {
                  setShowViewEvent(false)
                  setViewingEvent(null)
                  setEventRegistrations([])
                  setRegistrationsPage(1)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Event Cover Image */}
              {viewingEvent.cover_image_url && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img 
                    src={viewingEvent.cover_image_url} 
                    alt={viewingEvent.title}
                    className="w-full h-72 object-cover"
                  />
                </div>
              )}

              {viewingEvent.tshirt_enabled && viewingEvent.tshirt_image_url && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500">T-shirt design</label>
                  <div className="mt-2 rounded-lg overflow-hidden bg-gray-50 max-w-sm">
                    <img
                      src={viewingEvent.tshirt_image_url}
                      alt="T-shirt design"
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-semibold text-gray-900">{viewingEvent.title}</p>
                  {viewingEvent.event_type === 'ticket_only' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                      🎫 Ticket Only
                    </span>
                  ) : viewingEvent.event_type === 'free' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      🆓 Free Event
                    </span>
                  ) : viewingEvent.event_type === 'registration_required' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      📝 Registration Required
                    </span>
                  ) : viewingEvent.event_type === 'hybrid' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      ⚡ Hybrid Event
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Description */}
              {viewingEvent.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-700 mt-1">{viewingEvent.description}</p>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date & Time</label>
                  <div className="flex items-center mt-1 text-gray-900">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="font-medium">
                      {new Date(viewingEvent.event_date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>

                {/* Event Type */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Event Type</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                      {viewingEvent.event_type || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue format */}
              <div>
                <label className="text-sm font-medium text-gray-500">Venue</label>
                <div className="mt-1 space-y-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingEvent.event_format === 'online'
                        ? 'bg-blue-100 text-blue-800'
                        : viewingEvent.event_format === 'hybrid'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {viewingEvent.event_format === 'online'
                      ? 'Online'
                      : viewingEvent.event_format === 'hybrid'
                        ? 'Hybrid'
                        : 'In Person'}
                  </span>
                  {(viewingEvent.event_format === 'online' ||
                    viewingEvent.event_format === 'hybrid') &&
                    viewingEvent.online_link && (
                      <div className="flex items-start text-gray-900">
                        <Video className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <a
                            href={viewingEvent.online_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline break-all"
                          >
                            {viewingEvent.online_link}
                          </a>
                          {(viewingEvent.online_meeting_id || viewingEvent.online_password) && (
                            <p className="text-sm text-gray-600 mt-1">
                              {viewingEvent.online_meeting_id && (
                                <span>ID: {viewingEvent.online_meeting_id}</span>
                              )}
                              {viewingEvent.online_meeting_id && viewingEvent.online_password && (
                                <span className="mx-2">·</span>
                              )}
                              {viewingEvent.online_password && (
                                <span>Password: {viewingEvent.online_password}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  {viewingEvent.location && viewingEvent.event_format !== 'online' && (
                    <div className="flex items-center text-gray-900">
                      <MapPin className="w-5 h-5 mr-2 text-green-600" />
                      <span className="font-medium">{viewingEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {new Date(viewingEvent.event_date) < new Date() ? (
                    <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-600">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>

              {/* Capacity Information */}
              {viewingEvent.capacity && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-700 block mb-2">Event Capacity</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        {viewingEvent.registration_count || 0}
                      </span>
                      <span className="text-xl text-gray-500"> / {viewingEvent.capacity}</span>
                      <p className="text-sm text-gray-600 mt-1">registered attendees</p>
                    </div>
                    <div className="text-right">
                      {viewingEvent.spots_remaining > 0 ? (
                        <>
                          <span className="text-2xl font-bold text-green-600">
                            {viewingEvent.spots_remaining}
                          </span>
                          <p className="text-sm text-green-600 font-medium">spots remaining</p>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-red-600">FULL</span>
                          <p className="text-sm text-red-600 font-medium">
                            {viewingEvent.waitlist_enabled ? 'Waitlist available' : 'No more spots'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          viewingEvent.spots_remaining === 0 
                            ? 'bg-red-500' 
                            : viewingEvent.spots_remaining < 10 
                              ? 'bg-orange-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, ((viewingEvent.registration_count || 0) / viewingEvent.capacity) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {Math.round(((viewingEvent.registration_count || 0) / viewingEvent.capacity) * 100)}% full
                    </p>
                  </div>
                </div>
              )}

              {/* Registration Info */}
              {viewingEvent.requires_registration && (
                <div>
                  <label className="text-sm font-medium text-gray-900">Registration Required</label>
                  {viewingEvent.registration_deadline && (
                    <p className="text-sm text-gray-700 mt-1">
                      Deadline: {new Date(viewingEvent.registration_deadline).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                  
                  {/* Registrations List — verified only (members + approved non-members + paid tickets) */}
                  <div className="mt-4">
                    {(() => {
                      const verifiedRegistrations = eventRegistrations.filter((reg: any) =>
                        passesVerifiedAttendeeFilter(reg, { isFreeEvent: viewingEvent?.event_type === 'free' })
                      )
                      const hiddenPending = eventRegistrations.length - verifiedRegistrations.length
                      const pageRows = verifiedRegistrations.slice(
                        (registrationsPage - 1) * registrationsPerPage,
                        registrationsPage * registrationsPerPage
                      )

                      return (
                        <>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Registrations ({verifiedRegistrations.length})
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (Showing verified/registered only
                        {hiddenPending > 0 ? ` · ${hiddenPending} pending hidden` : ''})
                      </span>
                    </h4>
                    {loadingRegistrations ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading registrations...</span>
                      </div>
                    ) : verifiedRegistrations.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Name</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Email</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Phone</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Type</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Status</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Registered At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageRows.map((reg: any, index: number) => (
                                  <tr 
                                    key={reg.id} 
                                    className={index !== pageRows.length - 1 ? 'border-b border-gray-100' : ''}
                                  >
                                    <td className="py-3 px-4 text-sm text-gray-900">
                                      {reg.full_name || 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                      {reg.email || 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                      {reg.phone_number || 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {reg.type === 'ticket' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          🎫 Ticket
                                        </span>
                                      ) : reg.type === 'non_member' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                          🌐 Non-Member
                                        </span>
                                      ) : reg.type === 'guest' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                          👤 Guest
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                          ✓ Free
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {reg.type === 'non_member' ? (
                                        reg.status === 'approved' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            ✅ Verified
                                          </span>
                                        ) : reg.status === 'payment_pending' || reg.status === 'pending' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                            ⏳ Pending
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                            {reg.status || 'Unknown'}
                                          </span>
                                        )
                                      ) : reg.type === 'ticket' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          ✓ {reg.payment_status === 'paid' ? 'Paid' : (reg.status || 'Registered')}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                          ✓ {reg.status || 'Registered'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                      {new Date(reg.registered_at).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </td>
                                  </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {verifiedRegistrations.length > registrationsPerPage && (() => {
                            const totalFiltered = verifiedRegistrations.length
                            const totalPages = Math.ceil(totalFiltered / registrationsPerPage)
                            
                            return (
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                  Showing {((registrationsPage - 1) * registrationsPerPage) + 1} to {Math.min(registrationsPage * registrationsPerPage, totalFiltered)} of {totalFiltered}
                                  {hiddenPending > 0 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({hiddenPending} pending/unverified hidden)
                                    </span>
                                  )}
                                </p>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setRegistrationsPage(p => Math.max(1, p - 1))}
                                    disabled={registrationsPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Previous
                                  </button>
                                  <span className="px-3 py-1 text-sm text-gray-700">
                                    Page {registrationsPage} of {totalPages}
                                  </span>
                                  <button
                                    onClick={() => setRegistrationsPage(p => Math.min(totalPages, p + 1))}
                                    disabled={registrationsPage >= totalPages}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 py-4">
                        No verified registrations yet
                        {hiddenPending > 0 ? ` (${hiddenPending} pending non-members awaiting approval)` : ''}
                      </p>
                    )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Event File */}
              {viewingEvent.event_file_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Event File</label>
                  <div className="mt-2">
                    <a
                      href={viewingEvent.event_file_url}
                      download
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download File
                    </a>
                  </div>
                </div>
              )}

              {/* Created Date */}
              {viewingEvent.created_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-700 mt-1 text-sm">
                    {new Date(viewingEvent.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedEventForTickets(viewingEvent)
                  setShowTicketModal(true)
                  fetchEventTickets(viewingEvent.id)
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>Manage Tickets</span>
              </button>
              <button
                onClick={() => {
                  setShowViewEvent(false)
                  setViewingEvent(null)
                  setEventRegistrations([])
                  setRegistrationsPage(1)
                  handleEditEvent(viewingEvent)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Event</span>
              </button>
              <button
                onClick={() => {
                  setShowViewEvent(false)
                  setViewingEvent(null)
                  setEventRegistrations([])
                  setRegistrationsPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Management Modal */}
      {showTicketModal && selectedEventForTickets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Manage Tickets</h3>
                <p className="text-gray-600 mt-1">{selectedEventForTickets.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowTicketModal(false)
                  setSelectedEventForTickets(null)
                  setEventTickets([])
                  setShowTicketForm(false)
                  setEditingTicket(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Ticket Form */}
            {showTicketForm ? (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-bold mb-4">{editingTicket ? 'Edit Ticket Type' : 'Create New Ticket Type'}</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Name *</label>
                      <input
                        type="text"
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., General Admission, VIP Pass"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (¥) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ticketForm.price}
                        onChange={(e) => setTicketForm({...ticketForm, price: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="100.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="What's included with this ticket..."
                    />
                  </div>

                  {/* Ticket Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ticket Image
                      <span className="text-gray-500 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image must be less than 5MB')
                          e.target.value = ''
                          return
                        }
                        
                        if (!file.type.startsWith('image/')) {
                          toast.error('Please select an image file')
                          e.target.value = ''
                          return
                        }
                        
                        setUploadingFile(true)
                        try {
                          const imageUrl = await handleFileUpload(file)
                          if (imageUrl) {
                            setTicketForm({...ticketForm, ticket_image_url: imageUrl})
                            toast.success('Image uploaded')
                          }
                        } catch (error) {
                          toast.error('Failed to upload image')
                        } finally {
                          setUploadingFile(false)
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      disabled={uploadingFile}
                    />
                    
                    {uploadingFile && (
                      <div className="flex items-center mt-2 text-purple-600">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    )}
                    
                    {ticketForm.ticket_image_url && !uploadingFile && (
                      <div className="mt-3 relative inline-block max-w-sm">
                        <img 
                          src={ticketForm.ticket_image_url} 
                          alt="Ticket preview" 
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTicketForm({...ticketForm, ticket_image_url: ''})
                            const fileInput = document.querySelector('input[type="file"][accept="image/*"]:not([disabled])') as HTMLInputElement
                            if (fileInput) fileInput.value = ''
                          }}
                          className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Upload a visual representation of the ticket. Max 5MB.
                    </p>
                  </div>

                  {/* Payment Methods */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Methods Accepted
                      </label>
                      <input
                        type="text"
                        value={ticketForm.payment_methods}
                        onChange={(e) => setTicketForm({...ticketForm, payment_methods: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., WeChat Pay, Alipay, Bank Transfer"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate multiple methods with commas
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Instructions
                    </label>
                    <textarea
                      value={ticketForm.payment_instructions}
                      onChange={(e) => setTicketForm({...ticketForm, payment_instructions: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Provide payment details (WeChat ID, Alipay account, bank details, etc.)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Members will see these instructions when purchasing. Include account numbers, QR codes info, etc.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Members will upload payment screenshot after payment, similar to dues payment. 
                      Treasurer will approve/reject based on the screenshot.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Available
                      <span className="text-gray-500 font-normal ml-1">(leave empty for unlimited)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ticketForm.quantity_available}
                      onChange={(e) => setTicketForm({...ticketForm, quantity_available: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sale Start Date</label>
                      <input
                        type="datetime-local"
                        value={ticketForm.sale_start_date}
                        onChange={(e) => setTicketForm({...ticketForm, sale_start_date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sale End Date</label>
                      <input
                        type="datetime-local"
                        value={ticketForm.sale_end_date}
                        onChange={(e) => setTicketForm({...ticketForm, sale_end_date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={editingTicket ? updateTicket : createTicket}
                      disabled={creatingTicket || updatingTicket}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {(creatingTicket || updatingTicket) && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      {editingTicket 
                        ? (updatingTicket ? 'Updating...' : 'Update Ticket')
                        : (creatingTicket ? 'Creating...' : 'Create Ticket')
                      }
                    </button>
                    <button
                      onClick={() => {
                        setShowTicketForm(false)
                        setEditingTicket(null)
                        setTicketForm({
                          name: '',
                          description: '',
                          price: '',
                          quantity_available: '',
                          sale_start_date: '',
                          sale_end_date: '',
                          ticket_image_url: '',
                          payment_methods: '',
                          payment_instructions: ''
                        })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTicketForm(true)}
                className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Ticket Type</span>
              </button>
            )}

            {/* Tickets List */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold">Ticket Types</h4>
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
                </div>
              ) : eventTickets.length > 0 ? (
                <div className="space-y-3">
                  {eventTickets.map((ticket: any) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        {/* Ticket Image */}
                        {ticket.ticket_image_url && (
                          <div className="mr-4 flex-shrink-0">
                            <img 
                              src={ticket.ticket_image_url} 
                              alt={ticket.name}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h5 className="font-bold text-lg">{ticket.name}</h5>
                            <span className="text-2xl font-bold text-green-600">¥{parseFloat(ticket.price).toFixed(2)}</span>
                          </div>
                          {ticket.description && (
                            <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                          )}
                          
                          {/* Payment Methods */}
                          {ticket.payment_methods && (
                            <div className="mt-2 flex items-start">
                              <span className="text-sm font-medium text-gray-700 mr-2">💳 Payment:</span>
                              <span className="text-sm text-gray-600">{ticket.payment_methods}</span>
                            </div>
                          )}
                          
                          {/* Payment Instructions Preview */}
                          {ticket.payment_instructions && (
                            <div className="mt-1 flex items-start">
                              <span className="text-sm font-medium text-gray-700 mr-2">📝 Instructions:</span>
                              <span className="text-sm text-gray-600 line-clamp-2">{ticket.payment_instructions}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            {ticket.quantity_available ? (
                              <span>
                                📦 {ticket.quantity_sold || 0} / {ticket.quantity_available} sold
                                {ticket.quantity_available - (ticket.quantity_sold || 0) > 0 && (
                                  <span className="text-green-600 ml-1">
                                    ({ticket.quantity_available - (ticket.quantity_sold || 0)} left)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>📦 {ticket.quantity_sold || 0} sold (Unlimited)</span>
                            )}
                            {ticket.sale_start_date && (
                              <span>🕐 From: {new Date(ticket.sale_start_date).toLocaleDateString()}</span>
                            )}
                            {ticket.sale_end_date && (
                              <span>🕐 To: {new Date(ticket.sale_end_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEditTicket(ticket)}
                            className="text-blue-600 hover:text-blue-700 p-2"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeletingTicket(ticket)}
                            className="text-red-600 hover:text-red-700 p-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <p className="text-gray-500">No tickets created yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Ticket Type" to create your first ticket</p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTicketModal(false)
                  setSelectedEventForTickets(null)
                  setEventTickets([])
                  setShowTicketForm(false)
                  setEditingTicket(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Modal */}
      {deletingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Ticket Type</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{deletingTicket.name}</strong>? This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setDeletingTicket(null)}
                disabled={deletingTicketInProgress}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTicket(deletingTicket.id)}
                disabled={deletingTicketInProgress}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deletingTicketInProgress && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {deletingTicketInProgress ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Birthday Photo Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
          }}>
            <div style={{marginBottom: '16px'}}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px'
              }}>
                Delete Birthday Photo
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                lineHeight: '1.5'
              }}>
                Are you sure you want to delete this birthday photo? This action cannot be undone.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelDeletePhoto}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePhoto}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#B91C1C'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626'
                }}
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal - View birthday photos in full size */}
      {showPhotoLightbox && viewingPhoto && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={closeLightbox}
        >
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Image */}
            <img
              src={viewingPhoto.photo_url}
              alt={viewingPhoto.caption || 'Birthday photo'}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
              }}
            />

            {/* Photo info */}
            <div style={{
              marginTop: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '16px 24px',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%'
            }}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827'}}>
                  {viewingPhoto.users?.full_name}
                </h3>
                {viewingPhoto.is_reposted && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    border: '1px solid #BBF7D0'
                  }}>
                    <Megaphone style={{width: '12px', height: '12px', marginRight: '4px'}} />
                    Reposted
                  </span>
                )}
              </div>
              {viewingPhoto.caption && (
                <p style={{fontSize: '0.875rem', color: '#6B7280', marginBottom: '8px'}}>
                  {viewingPhoto.caption}
                </p>
              )}
              <p style={{fontSize: '0.75rem', color: '#9CA3AF'}}>
                Uploaded on {new Date(viewingPhoto.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loan Settings Modal */}
      {showLoanSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '550px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{marginBottom: '20px'}}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '8px'
              }}>
                Loan Application Settings
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                lineHeight: '1.5'
              }}>
                Configure eligibility requirements for loan applications
              </p>
            </div>

            {/* Dues Clearance Requirement */}
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: 'pointer',
                gap: '12px'
              }}>
                <input
                  type="checkbox"
                  checked={loanRequiresDuesClear}
                  onChange={(e) => setLoanRequiresDuesClear(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginTop: '2px',
                    cursor: 'pointer',
                    accentColor: '#00205B'
                  }}
                />
                <div style={{flex: 1}}>
                  <p style={{
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    Require dues clearance
                  </p>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#6B7280',
                    lineHeight: '1.4'
                  }}>
                    Members must have no outstanding monthly dues before applying for a loan
                  </p>
                </div>
              </label>
            </div>

            {/* Minimum Membership Months */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '8px'
              }}>
                <p style={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  Minimum paid months requirement
                </p>
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#6B7280',
                  lineHeight: '1.4',
                  marginBottom: '12px'
                }}>
                  Number of months a member must have paid dues before they can apply for a loan
                </p>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={loanMinimumMonths}
                    onChange={(e) => setLoanMinimumMonths(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                    style={{
                      width: '100px',
                      padding: '8px 12px',
                      fontSize: '0.875rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: '#111827'
                    }}
                  />
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    fontWeight: 500
                  }}>
                    paid {loanMinimumMonths === 1 ? 'month' : 'months'}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  {loanMinimumMonths === 0 
                    ? 'No minimum payment history required'
                    : `Members must have paid dues for at least ${loanMinimumMonths} ${loanMinimumMonths === 1 ? 'month' : 'months'}`
                  }
                </p>
              </label>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowLoanSettings(false)
                  loadLoanSettings() // Reset to saved values
                }}
                disabled={savingLoanSettings}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: savingLoanSettings ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: savingLoanSettings ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!savingLoanSettings) e.currentTarget.style.backgroundColor = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveLoanSettings}
                disabled={savingLoanSettings}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: '#00205B',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: savingLoanSettings ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  opacity: savingLoanSettings ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!savingLoanSettings) e.currentTarget.style.backgroundColor = '#003380'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#00205B'
                }}
              >
                {savingLoanSettings && (
                  <Loader2 style={{width: '16px', height: '16px', animation: 'spin 1s linear infinite'}} />
                )}
                {savingLoanSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Attendance Modal */}
      {showAttendanceModal && selectedMeetingForAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#003366]">Meeting Attendance</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportToExcel()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Export to Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttendanceModal(false)
                      setSelectedMeetingForAttendance(null)
                      setMeetingAttendees([])
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600">{selectedMeetingForAttendance.title}</p>
              <p className="text-sm text-gray-500">
                {new Date(selectedMeetingForAttendance.meeting_date).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Stats */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{meetingAttendees.length}</p>
                  <p className="text-sm text-gray-600">Registered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {meetingAttendees.filter(a => a.attended).length}
                  </p>
                  <p className="text-sm text-gray-600">Attended</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {meetingAttendees.filter(a => !a.attended).length}
                  </p>
                  <p className="text-sm text-gray-600">Did Not Attend</p>
                </div>
              </div>
            </div>

            {/* Add Attendee Section */}
            <div className="p-6 bg-blue-50 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Member Manually
              </label>
              <div className="flex space-x-2">
                <select
                  id="add-attendee-select"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  defaultValue=""
                >
                  <option value="">Select a member...</option>
                  {users
                    .filter(user => !meetingAttendees.some(att => att.user_id === user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} - {user.members_profile?.[0]?.member_id || user.email}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('add-attendee-select') as HTMLSelectElement
                    if (select?.value) {
                      addAttendeeManually(select.value)
                      select.value = ''
                    } else {
                      toast.error('Please select a member')
                    }
                  }}
                  className="px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#00205B] transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Add members who attended but didn't register online
              </p>
            </div>

            {/* Attendees List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAttendance ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-gray-600 mt-2">Loading attendance...</p>
                </div>
              ) : meetingAttendees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No one has registered yet</p>
                  <p className="text-sm text-gray-500 mt-1">Add attendees manually using the form above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {meetingAttendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-4 rounded-lg border transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                          {attendee.users?.members_profile?.[0]?.photo_url ? (
                            <img
                              src={attendee.users.members_profile[0].photo_url}
                              alt={attendee.users.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{attendee.users?.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {attendee.users?.members_profile?.[0]?.member_id || attendee.users?.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Registered: {new Date(attendee.registered_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleAttendance(attendee.id, attendee.attended)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            attendee.attended
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                        >
                          {attendee.attended ? '✓ Attended' : 'Mark as Attended'}
                        </button>
                        <button
                          onClick={() => removeAttendee(attendee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAttendanceModal(false)
                  setSelectedMeetingForAttendance(null)
                  setMeetingAttendees([])
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Attendance Modal */}
      {showEventAttendanceModal && selectedEventForAttendance && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#003366] to-[#002244] px-6 py-5 border-b border-blue-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">Event Attendance Report</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedEventForAttendance.event_type === 'free' 
                        ? 'bg-green-500/20 text-green-100 border border-green-500/30' 
                        : 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                    }`}>
                      {selectedEventForAttendance.event_type === 'free' ? 'Free Event' : 'Paid Event'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl text-blue-50 font-semibold mb-2">{selectedEventForAttendance.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedEventForAttendance.event_date).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedEventForAttendance.location || 'TBA'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportEventToExcel()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Export Report</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowEventAttendanceModal(false)
                      setSelectedEventForAttendance(null)
                      setEventAttendees([])
                      setGuestForm({ name: '', email: '', phone: '' })
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats — compact strip */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mr-1">Overview</span>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] text-gray-500">Registered</span>
                  <span className="text-sm font-bold text-blue-600">{eventAttendees.length}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1">
                  <UserCheck className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[11px] text-gray-500">Checked In</span>
                  <span className="text-sm font-bold text-green-600">{eventAttendees.filter(a => a.attended).length}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px] text-gray-500">Members</span>
                  <span className="text-sm font-bold text-purple-600">{eventAttendees.filter(a => a.user_id).length}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1">
                  <span className="text-[10px] font-bold text-orange-600">NM</span>
                  <span className="text-[11px] text-gray-500">Non-Members</span>
                  <span className="text-sm font-bold text-orange-600">{eventAttendees.filter(a => !a.user_id && a.type !== 'guest').length}</span>
                </div>
              </div>
            </div>

            {/* Attendees List */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingEventAttendance ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Loading attendance data...</p>
                </div>
              ) : eventAttendees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <Users className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No attendees yet</p>
                  <p className="text-sm text-gray-400 mt-1">Ticket purchases will appear here when they check in</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-900 to-[#003366]">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Name</th>
                          <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Contact</th>
                          <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                          <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Amount Paid</th>
                          <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Payment Method</th>
                          <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                          <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Registered</th>
                          <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Check-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {eventAttendees.map((attendee) => {
                          const isGuest = attendee.isGuest || (attendee.user_id === null && attendee.type === 'guest')
                          const isNonMember = attendee.type === 'non_member'
                          const isMember = !isGuest && !isNonMember
                          
                          // Get display name based on type
                          const displayName = isNonMember 
                            ? attendee.full_name 
                            : (isGuest ? attendee.guest_name : attendee.full_name)
                          const displayEmail = isNonMember 
                            ? attendee.email 
                            : (isGuest ? attendee.guest_email : (attendee.member_id || attendee.email))
                          
                          // Non-member highlighting
                          const isVerifiedNonMember = isNonMember && (attendee as any).status === 'approved'
                          const isPendingNonMember = isNonMember && (attendee as any).status === 'payment_pending'
                          
                          // Payment method
                          let paymentMethod = '-'
                          if (attendee.payment_status === 'refunded') {
                            paymentMethod = 'Refunded'
                          } else if (isGuest && attendee.payment_status) {
                            if (attendee.payment_status === 'paid' || attendee.payment_status === 'paid_online') paymentMethod = 'Online'
                            else if (attendee.payment_status === 'paid_at_door') paymentMethod = 'At Door'
                            else if (attendee.payment_status === 'complimentary') paymentMethod = 'Complimentary'
                            else if (attendee.payment_status === 'pending') paymentMethod = 'Pending'
                          } else if (isNonMember) {
                            paymentMethod = attendee.amount_paid > 0 ? 'Online' : '-'
                          } else if (!isGuest) {
                            paymentMethod = attendee.payment_status === 'paid' ? 'Online' : (attendee.payment_status || 'Online')
                          }
                          
                          // Payment status badge
                          const getPaymentBadge = () => {
                            if (attendee.payment_status === 'refunded') return (
                              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">
                                Refunded
                              </span>
                            )
                            if (attendee.payment_status === 'paid' || attendee.payment_status === 'paid_online' || attendee.payment_status === 'paid_at_door') return (
                              <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                                Paid
                              </span>
                            )
                            if (attendee.payment_status === 'pending') return (
                              <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full border border-yellow-200">
                                Pending
                              </span>
                            )
                            if (attendee.payment_status === 'complimentary') return (
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                                Complimentary
                              </span>
                            )
                            return <span className="text-gray-400 text-xs">-</span>
                          }
                          
                          return (
                            <tr key={attendee.id} className={`
                              transition-colors duration-150
                              ${isNonMember ? 'bg-purple-50/30 hover:bg-purple-50/50' : 'hover:bg-gray-50'}
                            `}>
                              {/* Name Column */}
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-gray-900 text-base ${
                                      isNonMember ? 'text-[#003366]' : ''
                                    }`}>
                                      {displayName}
                                    </span>
                                    {isVerifiedNonMember && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wide">
                                        Verified
                                      </span>
                                    )}
                                    {isPendingNonMember && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase tracking-wide">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  {attendee.notes && (
                                    <span className="text-xs text-gray-500 italic mt-0.5">{attendee.notes}</span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Contact Column */}
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm text-gray-700 font-medium">{displayEmail}</span>
                                  {isNonMember && attendee.phone && (
                                    <span className="text-xs text-gray-500">{attendee.phone}</span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Type Column */}
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  {isNonMember ? (
                                    <span className="px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg border border-purple-200">
                                      Non-Member
                                    </span>
                                  ) : isGuest ? (
                                    <span className="px-3 py-1.5 bg-orange-100 text-orange-800 text-xs font-bold rounded-lg border border-orange-200">
                                      Guest
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200">
                                      Member
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Amount Paid Column */}
                              <td className="px-4 py-4 text-center">
                                {attendee.payment_status === 'refunded' ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-red-600 font-semibold">¥0</span>
                                    {attendee.refund_amount != null && (
                                      <span className="text-xs text-red-500">
                                        refunded ¥{attendee.refund_amount}
                                      </span>
                                    )}
                                  </div>
                                ) : isNonMember ? (
                                  <span className={`text-base font-bold ${
                                    attendee.amount_paid > 0 ? 'text-[#003366]' : 'text-gray-400'
                                  }`}>
                                    ¥{attendee.amount_paid}
                                  </span>
                                ) : (
                                  <span className="text-gray-700 font-medium">
                                    {attendee.amount_paid ? `¥${attendee.amount_paid}` : '-'}
                                  </span>
                                )}
                              </td>
                              
                              {/* Payment Method Column */}
                              <td className="px-4 py-4 text-center">
                                <span className={`text-sm font-medium ${
                                  paymentMethod === 'Online' ? 'text-blue-600' :
                                  paymentMethod === 'At Door' ? 'text-green-600' :
                                  paymentMethod === 'Complimentary' ? 'text-purple-600' :
                                  paymentMethod === 'Pending' ? 'text-yellow-600' :
                                  paymentMethod === 'Refunded' ? 'text-red-600' :
                                  'text-gray-400'
                                }`}>
                                  {paymentMethod}
                                </span>
                              </td>
                              
                              {/* Payment Status Column */}
                              <td className="px-4 py-4 text-center">
                                {getPaymentBadge()}
                              </td>
                              
                              {/* Registered Column */}
                              <td className="px-4 py-4 text-center">
                                {attendee.created_at ? (
                                  <div className="flex flex-col">
                                    <span className="text-sm text-gray-700 font-medium">
                                      {new Date(attendee.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(attendee.created_at).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              
                              {/* Check-in Status Column */}
                              <td className="px-4 py-4 text-center">
                                {attendee.attended ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="flex items-center gap-1 text-green-600 font-semibold">
                                      <UserCheck className="w-4 h-4" />
                                      Checked In
                                    </span>
                                    {attendee.marked_attended_at && (
                                      <span className="text-xs text-green-500">
                                        {new Date(attendee.marked_attended_at).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Not Checked In</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {eventAttendees.length} {eventAttendees.length === 1 ? 'attendee' : 'attendees'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEventAttendanceModal(false)}
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg font-medium shadow-sm transition-all hover:shadow-md active:scale-95"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Event Attendee Confirmation Modal */}
      {showRemoveEventAttendeeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Remove Attendee</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this attendee from the list?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemoveEventAttendeeConfirm(false)
                  setEventAttendeeToRemove(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveEventAttendee}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Attendee Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Remove Attendee</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this attendee from the list?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false)
                  setAttendeeToRemove(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveAttendee}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
