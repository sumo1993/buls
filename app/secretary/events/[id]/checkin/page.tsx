'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, UserCheck, Users, ArrowLeft, Search, QrCode, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { formatOrGenerateTicketNumber } from '@/lib/ticket-utils'
import { SimpleGuestManagementModal } from '@/components/SimpleGuestManagementModal'
import {
  isGuestPaymentCleared,
  isGuestRefunded,
  isNonMemberApproved,
  passesVerifiedAttendeeFilter,
} from '@/lib/event-attendance'
import { formatTshirtPaymentStatus } from '@/lib/event-tshirts'

export default function EventCheckInPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [checkIns, setCheckIns] = useState<any[]>([])
  const [allAttendees, setAllAttendees] = useState<any[]>([]) // Full enriched list (source of truth)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAll, setShowAll] = useState(false) // false = Verified Only, true = All Registrations
  const [stats, setStats] = useState<any>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [loadMeta, setLoadMeta] = useState<{
    ticketCount: number
    pendingTickets: number
    guestCount: number
  }>({ ticketCount: 0, pendingTickets: 0, guestCount: 0 })
  
  // Guest management state
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Verified Only: free regs + paid tickets + ONLY approved non-members
  // All Registrations: every main-row registration (guests still nested under tickets)
  // Verified Only: paid tickets, payment-cleared guests, treasurer-approved non-members
  const passesVerifiedFilter = (a: any) => passesVerifiedAttendeeFilter(a)

  // Derive visible list from toggle — always in sync with showAll (no separate state/effect)
  const visibleAttendees = showAll
    ? allAttendees
    : allAttendees.filter(passesVerifiedFilter)

  const hiddenCount = Math.max(0, allAttendees.length - visibleAttendees.length)
  
  // Debug: Log filter results
  useEffect(() => {
    console.log('[CheckIn] Filter debug:', {
      allCount: allAttendees.length,
      verifiedCount: visibleAttendees.length,
      hiddenCount,
      showAll,
      nonMemberCount: allAttendees.filter((a: any) => a.type === 'non_member').length,
      approvedNonMembers: allAttendees.filter((a: any) => a.type === 'non_member' && a.status === 'approved').length,
      pendingNonMembers: allAttendees.filter((a: any) => a.type === 'non_member' && a.status === 'payment_pending').length,
      paidNonMembers: allAttendees.filter((a: any) => a.type === 'non_member' && (a.amount_paid || 0) > 0).length,
      paidTickets: allAttendees.filter((a: any) => a.type === 'ticket' && a.payment_status === 'paid').length,
      freeRegs: allAttendees.filter((a: any) => a.type === 'free' || a.type === 'registration').length
    })
  }, [allAttendees, visibleAttendees.length, showAll])

  // QR Scanner - depends on allAttendees (which is defined after, but we use it in the effect)
  // Using a ref to access the latest attendees value
  const attendeesRef = useRef(visibleAttendees)
  
  useEffect(() => {
    attendeesRef.current = visibleAttendees
  }, [visibleAttendees])

  // Log check-ins for debugging
  useEffect(() => {
    console.log('[CheckIn] Check-ins updated:', checkIns)
  }, [checkIns])

  useEffect(() => {
    if (userId && eventId) {
      console.log('[CheckIn] useEffect triggered, userId:', userId, 'eventId:', eventId)
      fetchData()
    }
  }, [userId, eventId])

  useEffect(() => {
    if (showQRScanner && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true
        },
        false
      )
      
      scanner.render(
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText)
            
            if (data.event_id !== parseInt(eventId)) {
              toast.error('QR code is for a different event')
              return
            }
            
            // Use attendeesRef to get current attendees
            const attendee = attendeesRef.current.find((a: any) => a.user_id === data.user_id)
            if (!attendee) {
              toast.error('Attendee not found')
              return
            }
            
            // Stop scanner and check in
            scanner.clear().catch(console.error)
            scannerRef.current = null
            setShowQRScanner(false)
            await handleCheckIn(attendee)
            
          } catch (error) {
            console.error('QR parse error:', error)
            toast.error('Invalid QR code format')
          }
        },
        (error) => {
          // Ignore continuous scanning errors
        }
      )
      
      scannerRef.current = scanner
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [showQRScanner, eventId])

  const fetchData = async () => {
    setLoading(true)
    setErrorState(null)
    console.log('[CheckIn] fetchData starting for event:', eventId)
    try {
      // Fetch event details
      console.log('[CheckIn] Fetching event details...')
      const [eventResponse, checkinsResponse, registrationsResponse] = await Promise.all([
        fetch(`/api/events?id=${eventId}`),
        fetch(`/api/events/${eventId}/checkins`),
        fetch(`/api/event-registrations?eventId=${eventId}`),
      ])

      if (eventResponse.ok) {
        const eventData = await eventResponse.json()
        setEvent(eventData.event)
      } else {
        console.error('[CheckIn] Event fetch failed:', eventResponse.status)
      }

      if (checkinsResponse.ok) {
        const checkinsData = await checkinsResponse.json()
        setCheckIns(checkinsData.checkins || [])
        setStats(checkinsData.stats)
      } else {
        console.error('[CheckIn] Check-ins fetch failed:', checkinsResponse.status)
      }

      if (!registrationsResponse.ok) {
        console.error('[CheckIn] Registrations fetch failed:', registrationsResponse.status)
        setErrorState(`Failed to load registrations: ${registrationsResponse.statusText}`)
        setLoading(false)
        return
      }
      
      const registrationsData = await registrationsResponse.json()

      // Main rows only — nest guests under ticket holders (no per-ticket N+1 fetches)
      const allRegs = registrationsData.registrations || []
      const mainRows = allRegs.filter(
        (a: any) => a.type !== 'guest' && a.source_type !== 'ticket_guest'
      )
      const guestRows = allRegs.filter(
        (a: any) => a.type === 'guest' || a.source_type === 'ticket_guest'
      )

      const attendeesWithGuests = mainRows.map((attendee: any) => {
        if (attendee.type === 'ticket' && attendee.id) {
          const guests = guestRows
            .filter(
              (g: any) =>
                String(g.ticket_purchase_id) === String(attendee.id)
            )
            .map((g: any) => ({
              id: g.id,
              full_name: g.full_name,
              email: g.email,
              phone: g.phone_number || g.phone,
              phone_number: g.phone_number || g.phone,
              payment_status: g.payment_status,
              relationship: g.relationship,
              amount_paid: g.amount_paid,
              refund_amount: g.refund_amount,
              refund_reason: g.refund_reason,
              checked_in: g.checked_in,
              checked_in_at: g.checked_in_at,
              tshirt_wanted: g.tshirt_wanted,
              tshirt_size: g.tshirt_size,
              tshirt_payment_status: g.tshirt_payment_status,
              tshirt_picked_up: g.tshirt_picked_up,
            }))
          return {
            ...attendee,
            ticketPrice: attendee.unit_price || attendee.catalog_price || 0,
            guests,
            guestCount: guests.length,
            hasRefundedGuests: guests.some((g: any) => g.payment_status === 'refunded'),
          }
        }
        return {
          ...attendee,
          guests: [],
          guestCount: 0,
          hasRefundedGuests: false,
          ticketPrice: attendee.ticketPrice || 0,
        }
      })

      const ticketRows = attendeesWithGuests.filter((a: any) => a.type === 'ticket')
      setLoadMeta({
        ticketCount: ticketRows.length,
        pendingTickets: ticketRows.filter((a: any) => a.payment_status === 'pending').length,
        guestCount: guestRows.length,
      })

      setAllAttendees(attendeesWithGuests)
      // If Verified Only is empty but there are pending tickets, show All so staff can see them
      const verified = attendeesWithGuests.filter(passesVerifiedAttendeeFilter)
      if (verified.length === 0 && attendeesWithGuests.length > 0) {
        setShowAll(true)
      }
      console.log('[CheckIn] fetchData complete, all:', attendeesWithGuests.length, {
        tickets: ticketRows.length,
        guests: guestRows.length,
        verified: verified.length,
      })
    } catch (error) {
      console.error('[CheckIn] fetchData failed:', error)
      setErrorState('Failed to load check-in data: ' + (error instanceof Error ? error.message : String(error)))
      toast.error('Failed to load check-in data')
    } finally {
      setLoading(false)
    }
  }

  // Stable row key for loading state — never use user_id alone (null for non-members)
  const getProcessingKey = (attendee: any) => {
    if (!attendee) return null
    return `${attendee.type || 'unknown'}:${attendee.id}`
  }

  const handleCheckIn = async (attendee: any) => {
    console.log('[handleCheckIn] START - attendee:', attendee?.type, attendee?.id);
    
    // Check if ticket / non-member registration is refunded
    if (attendee.payment_status === 'refunded' || attendee.status === 'refunded') {
      console.log('[handleCheckIn] REFUNDED - returning early');
      toast.error('❌ This registration has been refunded and cannot be checked in')
      return
    }
    
    // Non-member: treasurer must approve before check-in (no bypass)
    if (attendee.type === 'non_member' && !isNonMemberApproved(attendee.status)) {
      toast.error('⏳ Treasurer must verify this non-member payment before check-in')
      return
    }

    console.log('[handleCheckIn] Processing non-refunded registration');

    const processingKey = getProcessingKey(attendee)
    console.log('[handleCheckIn] Setting processing key:', processingKey)
    setProcessing(processingKey)
    
    try {
      // Prepare check-in data based on attendee type
      const checkinData: any = {
        check_in_method: 'manual'
      };

      if (attendee.type === 'non_member') {
        // Non-member check-in - use registration_id instead of user_id
        checkinData.user_id = null;
        checkinData.registration_id = attendee.id;
        checkinData.registration_type = 'non_member';
      } else {
        // Member check-in (free or ticket)
        checkinData.user_id = attendee.user_id;
        checkinData.registration_id = attendee.id;
        checkinData.registration_type = attendee.type === 'ticket' ? 'ticket_purchase' : 'registration';
      }

      console.log('🎯 Checking in:', attendee.type, checkinData);

      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkinData)
      })
      
      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        let errorMessage = response.statusText
        try {
          const error = await response.json()
          console.error('❌ API Error:', error)
          errorMessage = error.error || errorMessage
          if (error.refunded) {
            toast.error('❌ This registration has been refunded and cannot be checked in')
            return
          }
          if (error.unpaid || error.status === 'payment_pending' || error.status === 'pending') {
            toast.error('⏳ Treasurer must verify this payment before check-in')
            return
          }
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        throw new Error(errorMessage || 'Failed to check in')
      }

      const result = await response.json()
      console.log('✅ Check-in success:', result)
      console.log('Check-in data:', result.checkin)
      toast.success(result.message || `${getFullName(attendee) || 'Attendee'} checked in successfully`)
      
      // Only refresh check-ins instead of full fetchData for better performance
      const checkinsResponse = await fetch(`/api/events/${eventId}/checkins`)
      if (checkinsResponse.ok) {
        const checkinsData = await checkinsResponse.json()
        console.log('Check-ins after check-in:', checkinsData.checkins)
        setCheckIns(checkinsData.checkins || [])
      }
      
      // Update allAttendees locally to reflect the check-in status
      setAllAttendees(prev => prev.map(a => {
        if (a.id === attendee.id && a.type === attendee.type) {
          return { ...a, checkedIn: true }
        }
        return a
      }))
      
      // Re-apply the filter to update visibleAttendees
      // The visibleAttendees will automatically update since it's derived from allAttendees
    } catch (error: any) {
      console.error('Error checking in:', error)
      toast.error(error.message || 'Failed to check in')
    } finally {
      setProcessing(null)
    }
  }

  const handleTshirtPickup = async (attendee: any, pickedUp: boolean) => {
    if (!attendee?.tshirt_wanted) {
      toast.error('No T-shirt for this attendee')
      return
    }
    if (
      pickedUp &&
      attendee.tshirt_payment_status === 'pending'
    ) {
      toast.error('Treasurer must approve T-shirt payment before handover')
      return
    }

    const processingKey = `tshirt:${attendee.type}:${attendee.id}`
    setProcessing(processingKey)
    try {
      const source =
        attendee.type === 'ticket' ? 'ticket_purchase' : 'registration'
      const response = await fetch('/api/tshirts/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          id: attendee.id,
          picked_up: pickedUp,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to update T-shirt')
      }
      const data = await response.json()
      toast.success(data.message || (pickedUp ? 'T-shirt collected' : 'Collection undone'))
      setAllAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id && a.type === attendee.type
            ? { ...a, tshirt_picked_up: pickedUp }
            : a
        )
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to update T-shirt')
    } finally {
      setProcessing(null)
    }
  }

  const handleUndoCheckIn = async (attendee: any) => {
    const processingKey = getProcessingKey(attendee)
    setProcessing(processingKey)
    
    try {
      // For non-members, use registration_id; for members, use user_id
      const queryParam = attendee.type === 'non_member' 
        ? `registration_id=${attendee.id}&registration_type=non_member`
        : `user_id=${attendee.user_id}`;

      const response = await fetch(`/api/events/${eventId}/checkin?${queryParam}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to undo check-in')
      }

      toast.success(`Check-in removed for ${getFullName(attendee)}`)
      
      // Only refresh check-ins instead of full fetchData for better performance
      const checkinsResponse = await fetch(`/api/events/${eventId}/checkins`)
      if (checkinsResponse.ok) {
        const checkinsData = await checkinsResponse.json()
        setCheckIns(checkinsData.checkins || [])
      }
      
      // Update allAttendees locally to reflect the check-in status
      setAllAttendees(prev => prev.map(a => {
        if (a.id === attendee.id && a.type === attendee.type) {
          return { ...a, checkedIn: false }
        }
        return a
      }))
    } catch (error: any) {
      console.error('Error undoing check-in:', error)
      toast.error(error.message || 'Failed to undo check-in')
    } finally {
      setProcessing(null)
    }
  }

  const isCheckedIn = (attendee: any) => {
    if (!attendee) return false
    
    // Non-members: check if their registration_id exists in checkIns with registration_type 'non_member'
    if (attendee.type === 'non_member') {
      return checkIns.some(ci => 
        ci.registration_id === attendee.id && ci.registration_type === 'non_member'
      )
    }
    
    // For members (free or ticket), check by user_id
    if (!attendee.user_id) return false
    return checkIns.some(ci => ci.user_id === attendee.user_id)
  }



  // Helper function to get full_name from either top level or nested user object
  const getFullName = (attendee: any) => {
    return attendee.full_name || attendee.user?.full_name || 'Unknown User'
  }

  // Helper function to get email from either top level or nested user object
  const getEmail = (attendee: any) => {
    return attendee.email || attendee.user?.email || 'unknown@example.com'
  }

  // Helper function to get phone number
  const getPhoneNumber = (attendee: any) => {
    return attendee.phone_number || attendee.user?.phone_number || null
  }

  // Helper function to get passport number
  const getPassportNumber = (attendee: any) => {
    return attendee.passport_number || attendee.user?.passport_number || null
  }

  const digitsOnly = (value: string) => String(value || '').replace(/\D/g, '')

  /** Guests matching search — name, email, phone, or last 3 phone digits */
  const getMatchingGuests = (attendee: any, rawSearch?: string) => {
    if (attendee?.type !== 'ticket') return []
    const search = (rawSearch ?? searchTerm).toLowerCase().trim()
    if (!search) return []
    const cleanSearch = digitsOnly(search)
    const guests = Array.isArray(attendee.guests) ? attendee.guests : []

    return guests.filter((g: any) => {
      if (String(g.full_name || '').toLowerCase().includes(search)) return true
      if (String(g.email || '').toLowerCase().includes(search)) return true
      const gPhone = digitsOnly(g.phone || g.phone_number || '')
      if (!gPhone || !cleanSearch) return false
      // Exact last-3 match (gate staff common case)
      if (cleanSearch.length === 3 && gPhone.slice(-3) === cleanSearch) return true
      // Longer digit search (partial / full number)
      if (cleanSearch.length >= 3 && gPhone.includes(cleanSearch)) return true
      return false
    })
  }

  const handleGuestCheckIn = async (guest: any) => {
    try {
      setProcessing(`guest:${guest.id}`)
      const response = await fetch(`/api/guests/${guest.id}/checkin`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || `${guest.full_name} checked in!`)
        fetchData()
      } else {
        const error = await response.json()
        if (error.refunded) {
          toast.error('❌ This guest has been refunded and cannot be checked in')
        } else if (error.unpaid) {
          toast.error('⏳ Collect guest payment before check-in')
        } else {
          toast.error(error.error || 'Failed to check in guest')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to check in guest')
    } finally {
      setProcessing(null)
    }
  }

  const filteredAttendees = visibleAttendees.filter(a => {
    const search = searchTerm.toLowerCase().trim()
    
    // Show everyone in full list (both free and ticket holders)
    // When no search term, show all attendees
    if (!search) {
      return true // Show all attendees (free + ticket)
    }
    

    
    // Search by name
    const fullName = getFullName(a)
    if (fullName?.toLowerCase().includes(search)) {
      return true
    }
    
    // Search by email
    const email = getEmail(a)
    if (email?.toLowerCase().includes(search)) {
      return true
    }
    
    // Format and search by ticket number (only for ticket purchases)
    if (a.type === 'ticket') {
      const formattedTicket = formatOrGenerateTicketNumber(
        a.ticket_number,
        a.event?.title,
        a.event?.event_date,
        a.id
      ).toLowerCase()
      
      if (formattedTicket.includes(search)) {
        return true
      }
      
      // Also search by just the numeric part without TKT prefix
      const numericPart = formattedTicket.replace('tkt', '')
      
      if (numericPart.includes(search)) {
        return true
      }
      
      // Search by last 3 digits
      if (search.length >= 3) {
        const last3 = numericPart.slice(-3)
        if (last3 === search || numericPart.includes(search)) {
          return true
        }
      }
    }
    
    // Search by phone number (remove spaces and dashes for comparison)
    const phoneNumber = getPhoneNumber(a)
    if (phoneNumber) {
      const cleanPhone = digitsOnly(phoneNumber)
      const cleanSearch = digitsOnly(search)
      
      // Search by full phone number
      if (cleanPhone.includes(cleanSearch)) {
        return true
      }
      
      // Search by last 3 digits of phone number
      if (cleanSearch.length === 3 && cleanPhone.slice(-3) === cleanSearch) {
        return true
      }
      if (cleanSearch.length >= 3) {
        const last3Phone = cleanPhone.slice(-3)
        if (last3Phone === cleanSearch || cleanPhone.includes(cleanSearch)) {
          return true
        }
      }
    }
    
    // Search by passport number
    const passportNumber = getPassportNumber(a)
    if (passportNumber) {
      const cleanPassport = passportNumber.toLowerCase()
      
      // Search by full passport number
      if (cleanPassport.includes(search)) {
        return true
      }
      
      // Search by last 3 digits of passport number
      if (search.length >= 3) {
        const last3Passport = cleanPassport.slice(-3)
        if (last3Passport === search || cleanPassport.includes(search)) {
          return true
        }
      }
    }
    
    // Ticket number search (for ticket purchases)
    if (a.type === 'ticket') {
      const formattedTicket = (a.ticket_number || '').toLowerCase()
      
      if (formattedTicket.includes(search)) {
        return true
      }
      
      // Also search by just the numeric part without TKT prefix
      const numericPart = formattedTicket.replace('tkt', '')
      
      if (numericPart.includes(search)) {
        return true
      }
      
      // Search by last 3 digits
      if (search.length >= 3) {
        const last3 = numericPart.slice(-3)
        if (last3 === search || numericPart.includes(search)) {
          return true
        }
      }

      // Search by guest name / email / phone (incl. last 3 digits)
      if (getMatchingGuests(a, search).length > 0) return true
    }
    
    return false
  })

  // Guests matched by current search (for quick check-in at gate)
  const matchedGuestsForSearch = searchTerm.trim()
    ? filteredAttendees.flatMap((a) =>
        getMatchingGuests(a).map((g) => ({
          guest: g,
          host: a,
          phoneLast3: digitsOnly(g.phone || g.phone_number || '').slice(-3),
        }))
      )
    : []
  const unmatchedGuestsReady = matchedGuestsForSearch.filter(
    ({ guest }) =>
      !guest.checked_in &&
      isGuestPaymentCleared(guest.payment_status) &&
      !isGuestRefunded(guest.payment_status)
  )

  const getPartyCheckInProgress = (attendee: any) => {
    if (attendee.type !== 'ticket') return null
    const guests = Array.isArray(attendee.guests) ? attendee.guests : []
    const eligibleGuests = guests.filter(
      (g: any) => !isGuestRefunded(g.payment_status)
    )
    const partyTotal = 1 + eligibleGuests.length // member + guests
    const guestsIn = eligibleGuests.filter((g: any) => !!g.checked_in).length
    const memberIn = isCheckedIn(attendee) ? 1 : 0
    return {
      checkedIn: memberIn + guestsIn,
      total: partyTotal,
      guestsIn,
      guestTotal: eligibleGuests.length,
      memberIn: memberIn === 1,
    }
  }

  if (errorState) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to load check-in page</h2>
            <p className="text-red-700 text-sm mb-4">{errorState}</p>
            <button
              onClick={() => { setErrorState(null); fetchData() }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Event not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>
          
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-gray-600 mt-1">{formatDate(event.event_date)}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/secretary/events/${eventId}/tshirts`)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                T-shirt list (print)
              </button>
              {/* For ticket-only events, guests must be added to a specific ticket */}
              {event.event_type !== 'ticket_only' && (
                <SimpleGuestManagementModal
                  eventId={eventId}
                  eventTitle={event.title}
                  eventType={event.event_type || 'ticket_only'}
                  maxGuests={event.max_total_guests_per_member || 0}
                  doorGuestPrice={event.door_guest_price || 0}
                  allowDoorAddition={event.allow_door_guest_addition !== false}
                  allowAfterPurchase={event.allow_guest_addition_after_purchase !== false}
                  isAdmin={true}
                  isSecretary={true}
                  trigger={
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <UserPlus className="w-4 h-4" />
                      <span>Add Guest at Door</span>
                    </button>
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Registered</p>
                <p className="text-2xl font-bold text-gray-900">{visibleAttendees.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Checked In</p>
                <p className="text-2xl font-bold text-green-600">{checkIns.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Not Checked In</p>
                <p className="text-2xl font-bold text-orange-600">{visibleAttendees.length - checkIns.length}</p>
              </div>
              <Users className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {visibleAttendees.length > 0 
                    ? ((checkIns.length / visibleAttendees.length) * 100).toFixed(1) 
                    : 0}%
                  {!showAll && hiddenCount > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({hiddenCount} pending/unverified hidden)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <button
              type="button"
              onClick={() => {
                console.log('[CheckIn] Toggle → Verified Only')
                setShowAll(false)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !showAll
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Verified Only ({allAttendees.filter(passesVerifiedFilter).length})
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('[CheckIn] Toggle → All Registrations')
                setShowAll(true)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showAll
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Registrations ({allAttendees.length})
            </button>
          </div>
          {!showAll && hiddenCount > 0 ? (
            <div className="text-sm text-gray-500">
              {hiddenCount} unverified/pending hidden
            </div>
          ) : showAll ? (
            <div className="text-sm text-gray-500">
              Showing all {allAttendees.length} registrations
            </div>
          ) : null}
        </div>

        {/* QR Scanner Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <button
            onClick={() => setShowQRScanner(!showQRScanner)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <QrCode className="w-5 h-5" />
            {showQRScanner ? 'Close Scanner' : 'Scan QR Code'}
          </button>
          
          {showQRScanner && (
            <div className="mt-4">
              <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
              <style jsx global>{`
                /* Hide all dashboard sections (camera select, stop button, file upload) */
                #qr-reader__dashboard_section,
                #qr-reader__dashboard_section_csr,
                #qr-reader__dashboard_section_fsr,
                #qr-reader__dashboard_section_swaplink {
                  display: none !important;
                }
                
                /* Hide the entire dashboard */
                #qr-reader__dashboard {
                  display: none !important;
                }
                
                /* Only show the camera scan region */
                #qr-reader__scan_region {
                  border-radius: 12px !important;
                  overflow: hidden !important;
                  border: none !important;
                }
                
                #qr-reader video {
                  border-radius: 12px !important;
                  display: block !important;
                }
                
                /* Hide header text */
                #qr-reader__header_message {
                  display: none !important;
                }
                
                /* Clean container */
                #qr-reader {
                  border: none !important;
                  padding: 0 !important;
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Search and Attendees List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                // Search is already reactive, but we can trigger validation here
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Guest last 3 phone digits, name, ticket #, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-0 focus:border-gray-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </form>
            <p className="mt-2 text-xs text-gray-500">
              Tip: guests can check in with the last 3 digits of their phone number (e.g. 836).
            </p>

            {/* Quick Check-in for matched guests (phone last-3 / name) */}
            {unmatchedGuestsReady.length > 0 && (
              <div className="mt-3 space-y-2">
                {unmatchedGuestsReady.map(({ guest, host, phoneLast3 }) => (
                  <div
                    key={`quick-guest-${guest.id}`}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        Guest: {guest.full_name}
                        {phoneLast3 ? (
                          <span className="ml-2 font-mono text-blue-700">···{phoneLast3}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        With {getFullName(host)}
                        {guest.phone || guest.phone_number
                          ? ` · ${guest.phone || guest.phone_number}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGuestCheckIn(guest)}
                      disabled={processing === `guest:${guest.id}`}
                      className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm"
                    >
                      {processing === `guest:${guest.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Check In Guest
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Quick Check-in for single search result (member) */}
            {searchTerm &&
              filteredAttendees.length === 1 &&
              unmatchedGuestsReady.length === 0 &&
              !isCheckedIn(filteredAttendees[0]) && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{getFullName(filteredAttendees[0])}</p>
                    <p className="text-xs text-gray-600">{getEmail(filteredAttendees[0])}</p>
                    <p className="text-xs text-gray-500">Phone: {getPhoneNumber(filteredAttendees[0]) || 'N/A'}</p>
                    {filteredAttendees[0].type === 'ticket' && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {formatOrGenerateTicketNumber(
                          filteredAttendees[0].ticket_number,
                          filteredAttendees[0].event?.title,
                          filteredAttendees[0].event?.event_date,
                          filteredAttendees[0].id
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCheckIn(filteredAttendees[0])}
                    disabled={processing === getProcessingKey(filteredAttendees[0])}
                    className="ml-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    {processing === getProcessingKey(filteredAttendees[0]) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Check In
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {/* Search results count */}
            {searchTerm && (
              <div className="mt-3 text-sm text-gray-600">
                {filteredAttendees.length === 0 ? (
                  <span className="text-red-600">No results found for "{searchTerm}"</span>
                ) : (
                  <span>Found {filteredAttendees.length} result{filteredAttendees.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">T-shirt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="max-w-lg mx-auto">
                        <div className="text-gray-400 mb-3">
                          <Users className="w-12 h-12 mx-auto" />
                        </div>
                        {allAttendees.length > 0 ? (
                          <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No verified attendees yet
                            </h3>
                            <p className="text-gray-600 mb-4">
                              {allAttendees.length} registration
                              {allAttendees.length === 1 ? '' : 's'} found, but none are paid/verified
                              for check-in yet
                              {loadMeta.pendingTickets > 0
                                ? ` (${loadMeta.pendingTickets} ticket${
                                    loadMeta.pendingTickets === 1 ? '' : 's'
                                  } still pending treasurer approval)`
                                : ''}
                              .
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAll(true)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                              Show All Registrations ({allAttendees.length})
                            </button>
                            <p className="mt-3 text-sm text-gray-500">
                              Guests appear under their member after you open All Registrations (or
                              after the ticket is approved).
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No attendees for this event
                            </h3>
                            <p className="text-gray-600 mb-3">
                              Nothing was loaded for <strong>{event.title}</strong>. Your members
                              were probably not deleted — check these:
                            </p>
                            <ul className="list-disc pl-5 text-left text-sm text-gray-600 space-y-1 mb-4">
                              <li>
                                Confirm this is the same event as in Treasurer → Tickets (open that
                                event&apos;s Check-In from Secretary → Events).
                              </li>
                              <li>
                                In Treasurer, tickets must appear under Pending or Approved for this
                                event title.
                              </li>
                              <li>Refresh this page after approving a payment.</li>
                            </ul>
                            <p className="text-xs text-gray-400">
                              Event ID: {eventId}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? (
                        <div>
                          <p className="mb-2">No results found for "{searchTerm}"</p>
                          <p className="text-sm text-gray-400">
                            Try searching by name, email, ticket number (including "640"), phone, or passport
                          </p>
                        </div>
                      ) : (
                        "No attendees to display"
                      )}
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredAttendees.map(attendee => {
                      const checkedIn = isCheckedIn(attendee)
                      const isRefunded = attendee.payment_status === 'refunded' || attendee.status === 'refunded'
                      const processingKey = getProcessingKey(attendee)
                      
                      return (
                        <React.Fragment key={`${attendee.type}-${attendee.id}`}>
                          {/* Main Attendee Row */}
                          <tr className={isRefunded ? 'bg-red-50' : checkedIn ? 'bg-green-50' : ''}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {getFullName(attendee)}
                              {isRefunded && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-600 text-white font-bold">
                                  REFUNDED
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {getEmail(attendee)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {getPhoneNumber(attendee) || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {attendee.type === 'ticket' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                  🎫 Ticket
                                </span>
                              ) : attendee.type === 'non_member' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                                  🌐 Non-Member
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                  ✓ Free
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {attendee.type === 'ticket' ? (
                                <span className="font-mono text-xs font-semibold text-gray-900">
                                  {formatOrGenerateTicketNumber(
                                attendee.ticket_number,
                                attendee.event?.title,
                                attendee.event?.event_date,
                                attendee.id
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {attendee.type === 'ticket' ? (
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const party = getPartyCheckInProgress(attendee)
                                if (!party) return null
                                const complete = party.checkedIn === party.total && party.total > 0
                                return (
                                  <span
                                    className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                      complete
                                        ? 'bg-green-100 text-green-800'
                                        : party.checkedIn > 0
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    Party {party.checkedIn}/{party.total} in
                                  </span>
                                )
                              })()}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">
                                  {attendee.guestCount || 0} guest
                                  {(attendee.guestCount || 0) === 1 ? '' : 's'}
                                </span>
                                {attendee.hasRefundedGuests && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">
                                    Has Refunds
                                  </span>
                                )}
                                <SimpleGuestManagementModal
                                  ticketPurchaseId={attendee.id}
                                  eventId={eventId}
                                  eventTitle={event.title}
                                  eventType={event.event_type || 'ticket_only'}
                                  memberName={getFullName(attendee)}
                                  maxGuests={event.max_total_guests_per_member || 0}
                                  doorGuestPrice={attendee.ticketPrice || attendee.unit_price || event.door_guest_price || 0}
                                  allowAfterPurchase={event.allow_guest_addition_after_purchase !== false}
                                  isAdmin={true}
                                  isSecretary={true}
                                  trigger={
                                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                      Manage
                                    </button>
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {!attendee.tshirt_wanted ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-xs text-gray-800">
                                Size <span className="font-semibold">{attendee.tshirt_size || '?'}</span>
                                <span className="text-gray-500 ml-1">
                                  ({formatTshirtPaymentStatus(attendee.tshirt_payment_status)})
                                </span>
                              </div>
                              {attendee.tshirt_picked_up ? (
                                <button
                                  type="button"
                                  onClick={() => handleTshirtPickup(attendee, false)}
                                  disabled={processing === `tshirt:${attendee.type}:${attendee.id}`}
                                  className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200 disabled:opacity-50"
                                  title="Undo T-shirt collection"
                                >
                                  {processing === `tshirt:${attendee.type}:${attendee.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : (
                                    '✓ Collected — Undo'
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTshirtPickup(attendee, true)}
                                  disabled={
                                    processing === `tshirt:${attendee.type}:${attendee.id}` ||
                                    attendee.tshirt_payment_status === 'pending' ||
                                    attendee.tshirt_payment_status === 'refunded'
                                  }
                                  className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                                    attendee.tshirt_payment_status === 'pending' ||
                                    attendee.tshirt_payment_status === 'refunded'
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                  title={
                                    attendee.tshirt_payment_status === 'pending'
                                      ? 'Awaiting treasurer approval'
                                      : attendee.tshirt_payment_status === 'refunded'
                                        ? 'Payment refunded'
                                        : 'Mark T-shirt handed out'
                                  }
                                >
                                  {processing === `tshirt:${attendee.type}:${attendee.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : attendee.tshirt_payment_status === 'pending' ? (
                                    'Awaiting pay'
                                  ) : (
                                    'Mark Collected'
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isRefunded ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-600 text-white font-bold">
                              ❌ REFUNDED
                            </span>
                          ) : attendee.hasRefundedGuests ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 font-medium">
                              ⚠️ Some Guests Refunded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                              ✓ Valid
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {checkedIn ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                              ✓ Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                              Not Checked In
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {checkedIn ? (
                            <button
                              onClick={() => handleUndoCheckIn(attendee)}
                              disabled={processing === getProcessingKey(attendee)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              {processing === getProcessingKey(attendee) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Undo'
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('CHECK_IN_BTN', { attendeeId: attendee.id, type: attendee.type, disabled: processing === getProcessingKey(attendee) || isRefunded });
                                handleCheckIn(attendee);
                              }}
                              disabled={
                                processing === getProcessingKey(attendee) ||
                                isRefunded ||
                                (attendee.type === 'non_member' && !isNonMemberApproved(attendee.status))
                              }
                              className={`px-3 py-1.5 rounded disabled:opacity-50 ${
                                isRefunded || (attendee.type === 'non_member' && !isNonMemberApproved(attendee.status))
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-900 text-white hover:bg-gray-800'
                              }`}
                              title={
                                isRefunded
                                  ? 'Cannot check in refunded registration'
                                  : attendee.type === 'non_member' && !isNonMemberApproved(attendee.status)
                                    ? 'Treasurer must verify payment first'
                                    : 'Check in attendee'
                              }
                            >
                              {processing === getProcessingKey(attendee) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isRefunded ? (
                                'Refunded'
                              ) : attendee.type === 'non_member' && !isNonMemberApproved(attendee.status) ? (
                                'Awaiting Treasurer'
                              ) : (
                                'Check In'
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {/* Guest Rows - Show under ticket holder */}
                      {attendee.type === 'ticket' && attendee.guests && attendee.guests.length > 0 && (
                        attendee.guests.map((guest: any, guestIndex: number) => {
                          const guestRefunded = isGuestRefunded(guest.payment_status)
                          const guestPaid = isGuestPaymentCleared(guest.payment_status)
                          const guestPhone = guest.phone || guest.phone_number || ''
                          const guestLast3 = digitsOnly(guestPhone).slice(-3)
                          const isSearchMatch =
                            !!searchTerm.trim() &&
                            getMatchingGuests(attendee).some((g) => g.id === guest.id)
                          return (
                            <tr
                              key={`guest-${guest.id}-${guestIndex}`}
                              className={
                                isSearchMatch
                                  ? 'bg-sky-100 border-l-4 border-l-sky-500 ring-1 ring-inset ring-sky-200'
                                  : guestRefunded
                                    ? 'bg-orange-50 border-l-4 border-l-orange-400'
                                    : !guestPaid
                                      ? 'bg-yellow-50 border-l-4 border-l-yellow-400'
                                      : 'bg-blue-50 border-l-4 border-l-blue-400'
                              }
                            >
                              <td className="px-6 py-3 text-sm">
                                <div className="flex items-center gap-2 pl-8">
                                  <span className="text-blue-600">↳</span>
                                  <div>
                                    <span className="font-medium text-gray-900">{guest.full_name}</span>
                                    {isSearchMatch && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-sky-600 text-white font-bold">
                                        MATCH
                                      </span>
                                    )}
                                    {guestRefunded && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-600 text-white font-bold">
                                        GUEST REFUNDED
                                      </span>
                                    )}
                                    {!guestRefunded && !guestPaid && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-500 text-white font-bold">
                                        UNPAID
                                      </span>
                                    )}
                                    <p className="text-xs text-gray-500">Guest of {getFullName(attendee)}</p>
                                  </div>
                                </div>
                              </td>
                              {/* Email column */}
                              <td className="px-6 py-3 text-sm text-gray-600">
                                {guest.email || '-'}
                              </td>
                              {/* Phone column */}
                              <td className="px-6 py-3 text-sm text-gray-600">
                                {guestPhone ? (
                                  <div>
                                    <span>{guestPhone}</span>
                                    {guestLast3 && (
                                      <span className="ml-1.5 font-mono text-xs text-blue-700">
                                        (···{guestLast3})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              {/* Type column */}
                              <td className="px-6 py-3 text-sm">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                  👤 Guest
                                </span>
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-400">
                                -
                              </td>
                              <td className="px-6 py-3 text-sm text-gray-600">
                                <span className="text-xs capitalize">{guest.relationship || '-'}</span>
                              </td>
                              <td className="px-6 py-3 text-sm">
                                {guestRefunded ? (
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-600 text-white font-bold mb-1">
                                      ❌ REFUNDED
                                    </span>
                                    {guest.refund_reason && (
                                      <span className="text-xs text-gray-600 italic">
                                        "{guest.refund_reason}"
                                      </span>
                                    )}
                                    {guest.refund_amount && (
                                      <span className="text-xs text-orange-600 font-semibold mt-1">
                                        ¥{guest.refund_amount}
                                      </span>
                                    )}
                                  </div>
                                ) : guestPaid ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                                    ✓ Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">
                                    ⏳ Unpaid
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-sm">
                                {guest.checked_in ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex w-fit items-center px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-medium">
                                      ✓ Checked In
                                    </span>
                                    {guest.checked_in_at && (
                                      <span className="text-[11px] text-gray-500">
                                        {new Date(guest.checked_in_at).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                        })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    Not Checked In
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3 text-sm">
                                {guestRefunded ? (
                                  <span className="text-xs text-gray-400 italic">Cannot check in (refunded)</span>
                                ) : !guestPaid ? (
                                  <span className="text-xs text-yellow-700 italic">Collect payment first</span>
                                ) : guest.checked_in ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/guests/${guest.id}/checkin`, {
                                          method: 'DELETE'
                                        })
                                        
                                        if (response.ok) {
                                          toast.success(`Check-in removed for ${guest.full_name}`)
                                          fetchData() // Refresh the page
                                        } else {
                                          const error = await response.json()
                                          toast.error(error.error || 'Failed to undo check-in')
                                        }
                                      } catch (error) {
                                        console.error('Error:', error)
                                        toast.error('Failed to undo check-in')
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
                                  >
                                    Undo
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleGuestCheckIn(guest)}
                                    disabled={processing === `guest:${guest.id}`}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs disabled:opacity-50"
                                  >
                                    {processing === `guest:${guest.id}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin inline" />
                                    ) : (
                                      'Check In Guest'
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </React.Fragment>
                    )
                  })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
