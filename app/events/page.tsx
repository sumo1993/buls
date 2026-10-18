'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PublicSiteHeader from '@/components/PublicSiteHeader'
import { 
  Calendar, 
  MapPin,
  Video,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { countryCities, countries } from '@/lib/countries-cities'

function EventsShell({
  signedIn,
  userRole,
  children,
}: {
  signedIn: boolean
  userRole?: string
  children: ReactNode
}) {
  // Use DashboardLayout for signed-in members, PublicSiteHeader for guests
  if (signedIn) {
    return <DashboardLayout userRole={userRole}>{children}</DashboardLayout>
  }
  
  // For non-signed-in users, use public layout
  return (
    <>
      <PublicSiteHeader />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  )
}

export default function EventsPage() {
  const { isLoaded, userId, isSignedIn } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const eventsPerPage = 10
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({})
  const [registering, setRegistering] = useState<string | null>(null)
  const [showTshirtModal, setShowTshirtModal] = useState(false)
  const [tshirtEvent, setTshirtEvent] = useState<any>(null)
  const [tshirtWanted, setTshirtWanted] = useState(true)
  const [tshirtSize, setTshirtSize] = useState('')
  const [tshirtPaymentMethod, setTshirtPaymentMethod] = useState('')
  const [ticketTshirtWanted, setTicketTshirtWanted] = useState(true)
  const [ticketTshirtSize, setTicketTshirtSize] = useState('')
  
  // Ticket purchasing state
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventTickets, setEventTickets] = useState<any[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentProof, setPaymentProof] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [purchasingTicket, setPurchasingTicket] = useState(false)
  const [purchaseNotes, setPurchaseNotes] = useState('')
  type RegisterGuest = {
    full_name: string
    email: string
    phone: string
    tshirt_wanted: boolean
    tshirt_size: string
  }
  const emptyGuestDraft = (): RegisterGuest => ({
    full_name: '',
    email: '',
    phone: '',
    tshirt_wanted: false,
    tshirt_size: '',
  })
  const [registerGuests, setRegisterGuests] = useState<RegisterGuest[]>([])
  const [guestDraft, setGuestDraft] = useState<RegisterGuest>(emptyGuestDraft())
  
  // Non-member registration
  const [showNonMemberRegistrationModal, setShowNonMemberRegistrationModal] = useState(false)
  const [nonMemberRegistrationStep, setNonMemberRegistrationStep] = useState<'info' | 'payment'>('info')
  const [nonMemberForm, setNonMemberForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    address: '',
    education_level: '',
    message: ''
  })
  const [submittingNonMember, setSubmittingNonMember] = useState(false)
  const [verificationCode, setVerificationCode] = useState<string | null>(null)
  const [showVerificationCode, setShowVerificationCode] = useState(false)
  const [wechatQrCode, setWechatQrCode] = useState<string | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState<string | null>(null)
  const [loadingPaymentQr, setLoadingPaymentQr] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [paymentProofFile, setPaymentProofFile] = useState<string | null>(null)

  // Handle country change to populate cities
  const handleCountryChange = (country: string) => {
    setNonMemberForm({...nonMemberForm, country, city: ''}) // Reset city when country changes
    if (country && countryCities[country]) {
      setAvailableCities(countryCities[country])
    } else {
      setAvailableCities([])
    }
  }

  /** Upload proof to /api/upload — never send huge base64 in the purchase JSON body. */
  const uploadPaymentProof = async (file: File, target: 'ticket' | 'nonmember' | 'tshirt') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadingProof(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload payment proof')
      }
      const url = result.url as string
      if (!url) throw new Error('Upload did not return a file URL')

      if (target === 'ticket' || target === 'tshirt') {
        setPaymentProof(url)
      } else {
        setPaymentProofFile(url)
      }
      toast.success('Payment proof uploaded')
    } catch (error: any) {
      console.error('Payment proof upload failed:', error)
      toast.error(error?.message || 'Failed to upload payment proof')
    } finally {
      setUploadingProof(false)
    }
  }

  const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadPaymentProof(file, 'nonmember')
  }

  /** Ticket-sold events: T-shirt is an add-on on the ticket only (not free Register). */
  const eventSellsTickets = (event: any) =>
    event?.event_type === 'ticket_only' ||
    event?.event_type === 'hybrid' ||
    event?.ticket_only === true

  /** Free / registration-only events may offer T-shirt on Register. */
  const tshirtOnFreeRegister = (event: any) =>
    !!event?.tshirt_enabled && !eventSellsTickets(event)

  const ticketWantsShirt = () =>
    !!selectedEvent?.tshirt_enabled &&
    (ticketTshirtWanted || !!selectedEvent.tshirt_required)

  const ticketTshirtUnitPrice = () => {
    if (!ticketWantsShirt()) return 0
    if (selectedEvent?.tshirt_pricing !== 'paid') return 0
    return parseFloat(String(selectedEvent?.tshirt_price ?? 0)) || 0
  }

  const maxRegisterGuests = () =>
    Number(selectedEvent?.max_total_guests_per_member) ||
    Number(selectedEvent?.max_guests_per_member) ||
    5

  const guestUnitPrice = () => {
    if (!selectedTicket) return 0
    return (
      parseFloat(String(selectedTicket.price)) ||
      parseFloat(String(selectedEvent?.door_guest_price ?? 0)) ||
      0
    )
  }

  const guestShirtUnitPrice = () => {
    if (!selectedEvent?.tshirt_enabled) return 0
    if (selectedEvent.tshirt_pricing !== 'paid') return 0
    return parseFloat(String(selectedEvent.tshirt_price ?? 0)) || 0
  }

  const guestTicketLineTotal = () => guestUnitPrice() * registerGuests.length

  const guestShirtLineTotal = () =>
    guestShirtUnitPrice() *
    registerGuests.filter((g) => g.tshirt_wanted).length

  const guestLineTotal = () => guestTicketLineTotal() + guestShirtLineTotal()

  const ticketCombinedTotal = () => {
    if (!selectedTicket) return 0
    const ticketLine = parseFloat(selectedTicket.price) * ticketQuantity
    return ticketLine + ticketTshirtUnitPrice() + guestLineTotal()
  }

  const addRegisterGuest = () => {
    const name = guestDraft.full_name.trim()
    if (!name) {
      toast.error('Guest name is required')
      return
    }
    if (registerGuests.length >= maxRegisterGuests()) {
      toast.error(`Maximum ${maxRegisterGuests()} guests allowed`)
      return
    }
    const shirtsOn = !!selectedEvent?.tshirt_enabled
    const shirtRequired = shirtsOn && !!selectedEvent?.tshirt_required
    const wantShirt = shirtRequired || (shirtsOn && guestDraft.tshirt_wanted)
    if (wantShirt && !guestDraft.tshirt_size) {
      toast.error('Select a T-shirt size for this guest')
      return
    }
    setRegisterGuests((prev) => [
      ...prev,
      {
        full_name: name,
        email: guestDraft.email.trim(),
        phone: guestDraft.phone.trim(),
        tshirt_wanted: wantShirt,
        tshirt_size: wantShirt ? guestDraft.tshirt_size : '',
      },
    ])
    setGuestDraft({
      ...emptyGuestDraft(),
      tshirt_wanted: shirtRequired,
    })
  }

  // Remove redirect - make events page public
  useEffect(() => {
    if (isLoaded) {
      // Always load events, whether signed in or not
      fetchEvents()
      if (userId) {
        // Only fetch registrations if signed in
        fetchMyRegistrations()
      }
    }
  }, [isLoaded, userId])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Events API error:', errorData)
        throw new Error(errorData.error || 'Failed to load events')
      }

      const result = await response.json()
      
      // Sort events newest to oldest
      const sortedEvents = result.events?.sort((a: any, b: any) => 
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      ) || []
      
      setEvents(sortedEvents)
    } catch (error: any) {
      console.error('Error fetching events:', error)
      toast.error(error.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchMyRegistrations = async () => {
    try {
      const response = await fetch('/api/event-registrations')
      if (response.ok) {
        const result = await response.json()
        const regMap: Record<string, boolean> = {}
        result.registrations?.forEach((reg: any) => {
          regMap[reg.event_id] = true
        })
        setRegistrations(regMap)
      }
    } catch (error) {
      console.error('Error fetching registrations:', error)
    }
  }

  const requireSignIn = (action: string) => {
    toast.error(`Please sign in to ${action}`)
    router.push(`/auth/signin?redirect_url=${encodeURIComponent('/events')}`)
  }

  const submitRegistration = async (
    eventId: string,
    tshirt?: {
      wanted: boolean
      size: string
      payment_method?: string
      payment_proof_url?: string | null
    }
  ) => {
    setRegistering(eventId)
    try {
      const response = await fetch('/api/event-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          tshirt_wanted: tshirt?.wanted || false,
          tshirt_size: tshirt?.wanted ? tshirt.size : null,
          payment_method: tshirt?.payment_method || null,
          tshirt_payment_proof_url: tshirt?.payment_proof_url || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register')
      }

      const data = await response.json()
      toast.success(data.message || 'Successfully registered for event!')
      setRegistrations((prev) => ({ ...prev, [eventId]: true }))
      setShowTshirtModal(false)
      setTshirtEvent(null)
      setTshirtSize('')
      setTshirtPaymentMethod('')
      setPaymentProof('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to register for event')
    } finally {
      setRegistering(null)
    }
  }

  const handleRegister = async (eventId: string) => {
    if (!isSignedIn) {
      // For non-members, show registration modal
      const event = events.find(e => e.id === eventId)
      setSelectedEvent(event)
      setNonMemberRegistrationStep('info') // Reset to first step
      setShowNonMemberRegistrationModal(true)
      
      // Fetch event tickets
      try {
        const ticketsResponse = await fetch(`/api/public-tickets?eventId=${eventId}`)
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json()
          setEventTickets(ticketsData.tickets || [])
          // Auto-select first ticket if available
          if (ticketsData.tickets && ticketsData.tickets.length > 0) {
            setSelectedTicket(ticketsData.tickets[0])
          }
        }
      } catch (error) {
        console.error('Error fetching tickets:', error)
      }
      
      // Treasurer payment QR codes (admin-configured for Treasurer role)
      await fetchTreasurerPaymentQrs()
      return
    }

    const event = events.find((e) => e.id === eventId)
    // T-shirt with tickets must go through Tickets — never free Register alone
    if (tshirtOnFreeRegister(event)) {
      setTshirtEvent(event)
      setTshirtWanted(true)
      setTshirtSize('')
      setShowTshirtModal(true)
      await fetchTreasurerPaymentQrs()
      return
    }

    await submitRegistration(eventId)
  }

  const handleConfirmTshirtRegistration = async () => {
    if (!tshirtEvent) return
    const wanted = tshirtWanted || !!tshirtEvent.tshirt_required
    if (wanted && !tshirtSize) {
      toast.error('Please select a T-shirt size')
      return
    }
    if (tshirtEvent.tshirt_required && !tshirtWanted) {
      toast.error('A T-shirt is required for this event')
      return
    }

    const paidShirt =
      wanted &&
      tshirtEvent.tshirt_pricing === 'paid' &&
      (parseFloat(String(tshirtEvent.tshirt_price ?? 0)) || 0) > 0

    if (paidShirt) {
      if (!tshirtPaymentMethod) {
        toast.error('Please select a payment method for the T-shirt')
        return
      }
      if (tshirtPaymentMethod !== 'cash' && !paymentProof) {
        toast.error('Please upload payment proof for the T-shirt')
        return
      }
    }

    await submitRegistration(tshirtEvent.id, {
      wanted,
      size: tshirtSize,
      payment_method: paidShirt ? tshirtPaymentMethod : undefined,
      payment_proof_url: paidShirt && tshirtPaymentMethod !== 'cash' ? paymentProof : null,
    })
  }
  
  const handleNonMemberRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nonMemberForm.full_name || !nonMemberForm.email || !nonMemberForm.phone || !nonMemberForm.country || !nonMemberForm.city || !nonMemberForm.education_level) {
      toast.error('Please fill in all required fields')
      return
    }

    // First step: validate and move to payment
    if (nonMemberRegistrationStep === 'info') {
      setNonMemberRegistrationStep('payment')
      return
    }

    // Second step: submit the registration
    setSubmittingNonMember(true)
    try {
      const response = await fetch('/api/non-member-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          ...nonMemberForm,
          payment_proof_url: paymentProofFile,
          amount_paid: selectedTicket?.price || 0
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register')
      }

      const result = await response.json()
      
      // Show verification code
      setVerificationCode(result.verification_code)
      setShowVerificationCode(true)
      
      // Close the registration modal
      setShowNonMemberRegistrationModal(false)
      
      toast.success('Registration submitted successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to register')
    } finally {
      setSubmittingNonMember(false)
    }
  }

  const handleCancelRegistration = async (eventId: string) => {
    setRegistering(eventId)
    try {
      const response = await fetch(`/api/event-registrations?eventId=${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel registration')
      }

      toast.success('Registration cancelled')
      setRegistrations(prev => {
        const newRegs = { ...prev }
        delete newRegs[eventId]
        return newRegs
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel registration')
    } finally {
      setRegistering(null)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isPastEvent = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  // Ticket purchasing functions — guests can browse ticket types; purchase requires sign-in
  const fetchTreasurerPaymentQrs = async (opts?: { defaultPaymentMethod?: boolean }) => {
    setLoadingPaymentQr(true)
    try {
      const response = await fetch('/api/public-qr-code?role=treasurer')
      if (!response.ok) {
        console.error('QR fetch failed', response.status)
        return
      }
      const data = await response.json()
      const wechat = data.wechat?.qr_code_url || null
      const alipay = data.alipay?.qr_code_url || null
      setWechatQrCode(wechat)
      setAlipayQrCode(alipay)
      // On Purchase: default method so Treasurer QR shows before proof upload
      if (opts?.defaultPaymentMethod) {
        if (wechat) setPaymentMethod('wechat')
        else if (alipay) setPaymentMethod('alipay')
      }
      return { wechat, alipay }
    } catch (error) {
      console.error('Error fetching treasurer payment QR codes:', error)
      return null
    } finally {
      setLoadingPaymentQr(false)
    }
  }

  const handleBuyTicket = async (event: any) => {
    setSelectedEvent(event)
    // Optional add-on: unchecked until user picks a ticket, then they can add a shirt
    setTicketTshirtWanted(!!event?.tshirt_required)
    setTicketTshirtSize('')
    setSelectedTicket(null)
    setPaymentMethod('')
    setPaymentProof('')
    setWechatQrCode(null)
    setAlipayQrCode(null)
    setRegisterGuests([])
    setGuestDraft({
      ...emptyGuestDraft(),
      tshirt_wanted: !!event?.tshirt_enabled && !!event?.tshirt_required,
    })
    setShowTicketModal(true)
    // Load tickets + Treasurer QRs together; QR must be ready before pay step
    await Promise.all([
      fetchEventTickets(event.id),
      fetchTreasurerPaymentQrs({ defaultPaymentMethod: true }),
    ])
  }

  const fetchEventTickets = async (eventId: number) => {
    setLoadingTickets(true)
    try {
      const response = await fetch(`/api/tickets?event_id=${eventId}`)
      if (response.ok) {
        const result = await response.json()
        const activeTickets = (result.tickets || []).filter((t: any) => t.is_active)
        setEventTickets(activeTickets)
      } else {
        toast.error('Failed to load tickets')
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Failed to load tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  const handlePurchaseTicket = async () => {
    if (!isSignedIn) {
      requireSignIn('buy tickets')
      return
    }

    if (!selectedTicket) {
      toast.error('Please select a ticket')
      return
    }

    if (ticketQuantity < 1) {
      toast.error('Quantity must be at least 1')
      return
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    const wantShirt =
      !!selectedEvent?.tshirt_enabled &&
      (ticketTshirtWanted || !!selectedEvent.tshirt_required)

    if (wantShirt && !ticketTshirtSize) {
      toast.error('Please select a T-shirt size')
      return
    }

    // Only require payment proof if NOT paying in person (cash) and total > 0
    if (paymentMethod !== 'cash' && ticketCombinedTotal() > 0 && !paymentProof) {
      toast.error('Please upload payment proof screenshot')
      return
    }

    if (uploadingProof) {
      toast.error('Please wait for the payment proof to finish uploading')
      return
    }

    // Block accidental huge base64 payloads (old flow) — must be a short uploaded URL
    if (
      paymentMethod !== 'cash' &&
      paymentProof &&
      paymentProof.startsWith('data:')
    ) {
      toast.error('Please re-upload your payment proof, then submit again')
      setPaymentProof('')
      return
    }

    setPurchasingTicket(true)
    try {
      const requestBody = {
        ticket_id: selectedTicket.id,
        quantity: ticketQuantity,
        payment_method: paymentMethod,
        payment_proof_url: paymentMethod === 'cash' ? null : paymentProof,
        notes: purchaseNotes,
        tshirt_wanted: wantShirt,
        tshirt_size: wantShirt ? ticketTshirtSize : null,
        guests: registerGuests,
      }
      console.log('🎫 Sending purchase request:', requestBody)

      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const raw = await response.text()
        let error: any = {}
        try {
          error = raw ? JSON.parse(raw) : {}
        } catch {
          error = { error: raw?.slice(0, 200) || `Request failed (${response.status})` }
        }
        console.error('❌ API Error:', response.status, error)
        throw new Error(
          error.error || error.details || error.message || `Failed to purchase ticket (${response.status})`
        )
      }

      const result = await response.json()
      console.log('✅ Purchase success:', result)
      toast.success(result.breakdown || result.message || 'Ticket purchased! Waiting for approval.')
      
      // Reset form
      setShowTicketModal(false)
      setSelectedTicket(null)
      setTicketQuantity(1)
      setPaymentMethod('')
      setPaymentProof('')
      setPurchaseNotes('')
      setTicketTshirtWanted(true)
      setTicketTshirtSize('')
      setRegisterGuests([])
      setGuestDraft(emptyGuestDraft())
    } catch (error: any) {
      console.error('Error purchasing ticket:', error)
      toast.error(error.message || 'Failed to purchase ticket')
    } finally {
      setPurchasingTicket(false)
    }
  }

  const closeTicketModal = () => {
    setShowTicketModal(false)
    setSelectedEvent(null)
    setSelectedTicket(null)
    setTicketQuantity(1)
    setPaymentMethod('')
    setPaymentProof('')
    setPurchaseNotes('')
    setTicketTshirtWanted(true)
    setTicketTshirtSize('')
    setRegisterGuests([])
    setGuestDraft(emptyGuestDraft())
  }

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent)
  const totalPages = Math.ceil(events.length / eventsPerPage)

  if (!isLoaded || loading) {
    return (
      <EventsShell signedIn={!!isSignedIn} userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </EventsShell>
    )
  }

  return (
    <EventsShell signedIn={!!isSignedIn} userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">
            {isSignedIn
              ? 'View all upcoming and past events'
              : 'Browse upcoming BULS events — sign in to register or buy tickets'}
          </p>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No events scheduled</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for new events</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentEvents.map((event) => {
                const isPast = isPastEvent(event.event_date)
                
                return (
                  <div key={event.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
                    {/* Cover Image - Reduced height */}
                    {event.cover_image_url ? (
                      <div className="w-full h-40 overflow-hidden bg-gray-100">
                        <img 
                          src={event.cover_image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-white opacity-30" />
                      </div>
                    )}
                    
                    {/* Status Badge - Smaller */}
                    <div className="absolute top-2 right-2">
                      {isPast ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-900 text-white shadow-lg">
                          Past
                        </span>
                      ) : event.registration_status === 'full' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-lg">
                          FULL
                        </span>
                      ) : event.registration_status === 'closed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-lg">
                          Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-600 text-white shadow-lg">
                          Open
                        </span>
                      )}
                    </div>
                    
                    {/* Event Content - Compact */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      
                      {event.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center text-xs text-gray-700">
                          <Calendar className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                          <span className="font-medium truncate">{formatDateTime(event.event_date)}</span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-700">
                          <MapPin className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
                          <span className="truncate">
                            {event.event_format === 'online'
                              ? event.location || 'Online'
                              : event.location || 'Location TBA'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-700">
                          {event.event_format === 'online' || event.event_format === 'hybrid' ? (
                            <Video className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
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
                        </div>
                        
                        {event.requires_registration && (
                          <div className="flex items-center text-xs text-gray-900">
                            <svg className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="font-semibold">
                              {event.capacity ? `${event.registration_count || 0}/${event.capacity}` : `${event.registration_count || 0}`}
                            </span>
                            {event.capacity && event.spots_remaining > 0 && event.registration_status === 'open' && (
                              <span className="ml-1 text-green-600 font-medium">
                                ({event.spots_remaining} left)
                              </span>
                            )}
                          </div>
                        )}

                        {event.tshirt_enabled && (
                          <div className="flex items-center gap-2.5 text-xs text-gray-700">
                            {event.tshirt_image_url && (
                              <div className="w-16 h-16 rounded-md bg-gray-50 overflow-hidden flex-shrink-0">
                                <img
                                  src={event.tshirt_image_url}
                                  alt="T-shirt design"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-indigo-700">T-shirt</span>
                              {event.tshirt_pricing === 'paid' && event.tshirt_price != null
                                ? ` · ${event.tshirt_price} CNY`
                                : ' · Free'}
                              {eventSellsTickets(event) ? ' · with ticket' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons - Smaller */}
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        {/*
                          Ticketed events: one Register → modal with ticket + T-shirt together.
                          Free / registration-only: Register (optionally with T-shirt).
                        */}
                        {!isPast && eventSellsTickets(event) && (
                          <button
                            onClick={() => handleBuyTicket(event)}
                            className="w-full px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            Register
                          </button>
                        )}

                        {event.requires_registration &&
                          !eventSellsTickets(event) &&
                          !isPast && (
                          <>
                            {registrations[event.id] ? (
                              <button
                                onClick={() => handleCancelRegistration(event.id)}
                                disabled={registering === event.id}
                                className="w-full px-2.5 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {registering === event.id ? 'Canceling...' : 'Cancel'}
                              </button>
                            ) : event.registration_status === 'full' && !event.waitlist_enabled ? (
                              <button 
                                disabled 
                                className="w-full px-2.5 py-1.5 bg-gray-300 text-gray-600 text-xs font-medium rounded-md cursor-not-allowed"
                              >
                                Full
                              </button>
                            ) : event.registration_status === 'closed' ? (
                              <button 
                                disabled 
                                className="w-full px-2.5 py-1.5 bg-gray-300 text-gray-600 text-xs font-medium rounded-md cursor-not-allowed"
                              >
                                Closed
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(event.id)}
                                disabled={registering === event.id}
                                className="w-full px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {registering === event.id
                                  ? 'Registering...'
                                  : tshirtOnFreeRegister(event)
                                    ? 'Register + T-shirt'
                                    : 'Register'}
                              </button>
                            )}
                          </>
                        )}
                        
                        {event.event_file_url && (
                          <a
                            href={event.event_file_url}
                            download
                            className="w-full px-2.5 py-1.5 border border-blue-600 text-blue-600 text-xs font-medium rounded-md hover:bg-blue-50 transition-colors text-center"
                          >
                            File
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {events.length > eventsPerPage && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstEvent + 1} to {Math.min(indexOfLastEvent, events.length)} of {events.length} events
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
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
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
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

      {/* Ticket Purchase Modal — compact 2-column layout (less scrolling) */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="flex w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Compact header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Register</h2>
                <p className="truncate text-sm text-gray-600">{selectedEvent?.title}</p>
                {(selectedEvent?.event_format === 'online' ||
                  selectedEvent?.event_format === 'hybrid') && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-700">
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    {selectedEvent.event_format === 'hybrid' ? 'Hybrid event' : 'Online event'}
                    {selectedEvent.online_link && (
                      <>
                        {' · '}
                        <a
                          href={selectedEvent.online_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Join link
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedTicket && (
                  <span className="hidden rounded-full bg-[#00205B] px-3 py-1 text-sm font-semibold text-white sm:inline">
                    ¥{ticketCombinedTotal().toFixed(2)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={closeTicketModal}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {loadingTickets ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : eventTickets.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-16 text-gray-500">
                No tickets available for this event
              </div>
            ) : (
              <>
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-5">
                  {/* LEFT: ticket + options (scrolls if needed) */}
                  <div className="min-h-0 space-y-3 overflow-y-auto border-b border-gray-100 p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      1. Choose ticket
                    </p>
                    <div className="space-y-2">
                      {eventTickets.map((ticket) => {
                        const available = ticket.quantity_available
                          ? ticket.quantity_available - ticket.quantity_sold
                          : null
                        const isAvailable = available === null || available > 0
                        const isSelected = selectedTicket?.id === ticket.id
                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-[#00205B] bg-[#00205B] text-white shadow-md'
                                : isAvailable
                                  ? 'border-gray-200 bg-white hover:border-[#00205B]/40'
                                  : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{ticket.name}</p>
                              {ticket.description && (
                                <p
                                  className={`truncate text-xs ${
                                    isSelected ? 'text-white/80' : 'text-gray-500'
                                  }`}
                                >
                                  {ticket.description}
                                </p>
                              )}
                              {available !== null && (
                                <p
                                  className={`mt-0.5 text-[11px] ${
                                    isSelected ? 'text-white/70' : 'text-gray-400'
                                  }`}
                                >
                                  {isAvailable ? `${available} left` : 'Sold out'}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 text-base font-bold ${
                                isSelected ? 'text-white' : 'text-[#EF3340]'
                              }`}
                            >
                              ¥{parseFloat(ticket.price).toFixed(0)}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {selectedTicket && (
                      <>
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-gray-600">Your ticket</span>
                            <span className="font-semibold text-gray-900">
                              ×{ticketQuantity} · ¥
                              {(parseFloat(selectedTicket.price) * ticketQuantity).toFixed(2)}
                            </span>
                          </div>
                          {registerGuests.length > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-gray-600">
                                Guests ({registerGuests.length})
                              </span>
                              <span className="font-semibold text-gray-900">
                                ¥{guestTicketLineTotal().toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-1.5 text-xs">
                            <span className="font-medium text-gray-800">
                              People attending
                            </span>
                            <span className="font-bold text-[#00205B]">
                              {ticketQuantity + registerGuests.length}
                              <span className="ml-1 font-normal text-gray-500">
                                (you{registerGuests.length > 0 ? ` + ${registerGuests.length} guest${registerGuests.length === 1 ? '' : 's'}` : ''})
                              </span>
                            </span>
                          </div>
                          <div className="flex items-end justify-between gap-2 pt-0.5">
                            <div>
                              <p className="text-[11px] text-gray-500">Amount to pay</p>
                              <p className="text-lg font-bold text-gray-900">
                                ¥{ticketCombinedTotal().toFixed(2)}
                              </p>
                              <p className="text-[10px] text-gray-500 leading-snug">
                                {ticketTshirtUnitPrice() > 0
                                  ? `Includes your shirt ¥${ticketTshirtUnitPrice().toFixed(2)}`
                                  : ''}
                                {guestShirtLineTotal() > 0
                                  ? `${ticketTshirtUnitPrice() > 0 ? ' · ' : ''}Guest shirts ¥${guestShirtLineTotal().toFixed(2)}`
                                  : ''}
                              </p>
                            </div>
                            {/* Rare: buy extra tickets for yourself — keep compact */}
                            <div className="w-16 shrink-0">
                              <label className="mb-0.5 block text-[10px] text-gray-500">
                                Your qty
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={
                                  selectedTicket.quantity_available
                                    ? selectedTicket.quantity_available -
                                      selectedTicket.quantity_sold
                                    : 999
                                }
                                value={ticketQuantity}
                                onChange={(e) =>
                                  setTicketQuantity(parseInt(e.target.value) || 1)
                                }
                                className="w-full rounded-md border border-gray-300 px-1.5 py-1 text-sm"
                                title="Number of tickets for you (not guests). Guests are added below."
                              />
                            </div>
                          </div>
                        </div>

                        {selectedEvent?.tshirt_enabled && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                            <div className="flex gap-3">
                              {selectedEvent.tshirt_image_url && (
                                <img
                                  src={selectedEvent.tshirt_image_url}
                                  alt="T-shirt"
                                  className="h-20 w-20 shrink-0 rounded bg-gray-50 object-contain"
                                />
                              )}
                              <div className="min-w-0 flex-1 space-y-2">
                                {!selectedEvent.tshirt_required ? (
                                  <label className="flex items-center gap-2 text-sm text-gray-800">
                                    <input
                                      type="checkbox"
                                      checked={ticketTshirtWanted}
                                      onChange={(e) => {
                                        setTicketTshirtWanted(e.target.checked)
                                        if (!e.target.checked) setTicketTshirtSize('')
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                    />
                                    Add T-shirt
                                    {selectedEvent.tshirt_pricing === 'paid' &&
                                    selectedEvent.tshirt_price != null
                                      ? ` (+¥${Number(selectedEvent.tshirt_price).toFixed(0)})`
                                      : ' (free)'}
                                  </label>
                                ) : (
                                  <p className="text-sm font-medium text-indigo-900">T-shirt required</p>
                                )}
                                {(ticketTshirtWanted || selectedEvent.tshirt_required) && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {(Array.isArray(selectedEvent.tshirt_sizes) &&
                                    selectedEvent.tshirt_sizes.length
                                      ? selectedEvent.tshirt_sizes
                                      : ['S', 'M', 'L', 'XL', 'XXL']
                                    ).map((size: string) => (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={() => setTicketTshirtSize(size)}
                                        className={`rounded border px-2 py-1 text-xs ${
                                          ticketTshirtSize === size
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-gray-300 bg-white text-gray-700'
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Guests — paid with this registration as one total */}
                        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Guests (optional)
                            </p>
                            <span className="text-[11px] text-gray-500">
                              {registerGuests.length}/{maxRegisterGuests()} · ¥
                              {guestUnitPrice().toFixed(0)} each
                            </span>
                          </div>

                          {registerGuests.length > 0 && (
                            <ul className="space-y-1">
                              {registerGuests.map((g, idx) => (
                                <li
                                  key={`${g.full_name}-${idx}`}
                                  className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-900">{g.full_name}</p>
                                    <p className="truncate text-gray-500">
                                      {[
                                        g.email,
                                        g.phone,
                                        g.tshirt_wanted
                                          ? `Shirt ${g.tshirt_size}${
                                              guestShirtUnitPrice() > 0
                                                ? ` +¥${guestShirtUnitPrice().toFixed(0)}`
                                                : ''
                                            }`
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRegisterGuests((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="shrink-0 text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {registerGuests.length < maxRegisterGuests() && (
                            <div className="space-y-1.5 border-t border-gray-100 pt-2">
                              <input
                                type="text"
                                value={guestDraft.full_name}
                                onChange={(e) =>
                                  setGuestDraft({ ...guestDraft, full_name: e.target.value })
                                }
                                placeholder="Guest full name *"
                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="email"
                                  value={guestDraft.email}
                                  onChange={(e) =>
                                    setGuestDraft({ ...guestDraft, email: e.target.value })
                                  }
                                  placeholder="Email"
                                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                                />
                                <input
                                  type="tel"
                                  value={guestDraft.phone}
                                  onChange={(e) =>
                                    setGuestDraft({ ...guestDraft, phone: e.target.value })
                                  }
                                  placeholder="Phone"
                                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                                />
                              </div>

                              {selectedEvent?.tshirt_enabled && (
                                <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-2 space-y-1.5">
                                  {!selectedEvent.tshirt_required ? (
                                    <label className="flex items-center gap-2 text-xs text-gray-800">
                                      <input
                                        type="checkbox"
                                        checked={guestDraft.tshirt_wanted}
                                        onChange={(e) =>
                                          setGuestDraft({
                                            ...guestDraft,
                                            tshirt_wanted: e.target.checked,
                                            tshirt_size: e.target.checked
                                              ? guestDraft.tshirt_size
                                              : '',
                                          })
                                        }
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                                      />
                                      Guest T-shirt
                                      {selectedEvent.tshirt_pricing === 'paid' &&
                                      selectedEvent.tshirt_price != null
                                        ? ` (+¥${Number(selectedEvent.tshirt_price).toFixed(0)})`
                                        : ' (free)'}
                                    </label>
                                  ) : (
                                    <p className="text-xs font-medium text-indigo-900">
                                      Guest T-shirt required — pick size
                                    </p>
                                  )}
                                  {(guestDraft.tshirt_wanted || selectedEvent.tshirt_required) && (
                                    <div className="flex flex-wrap gap-1">
                                      {(Array.isArray(selectedEvent.tshirt_sizes) &&
                                      selectedEvent.tshirt_sizes.length
                                        ? selectedEvent.tshirt_sizes
                                        : ['S', 'M', 'L', 'XL', 'XXL']
                                      ).map((size: string) => (
                                        <button
                                          key={size}
                                          type="button"
                                          onClick={() =>
                                            setGuestDraft({
                                              ...guestDraft,
                                              tshirt_wanted: true,
                                              tshirt_size: size,
                                            })
                                          }
                                          className={`rounded border px-2 py-0.5 text-[11px] ${
                                            guestDraft.tshirt_size === size
                                              ? 'border-indigo-600 bg-indigo-600 text-white'
                                              : 'border-gray-300 bg-white text-gray-700'
                                          }`}
                                        >
                                          {size}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={addRegisterGuest}
                                className="w-full rounded-md border border-[#00205B] bg-[#00205B]/5 px-2 py-1.5 text-xs font-medium text-[#00205B] hover:bg-[#00205B]/10"
                              >
                                + Add guest to this payment
                              </button>
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={purchaseNotes}
                          onChange={(e) => setPurchaseNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </>
                    )}

                    {!selectedTicket && (
                      <p className="pt-4 text-center text-sm text-gray-500">
                        Select a ticket to continue to payment →
                      </p>
                    )}
                  </div>

                  {/* RIGHT: payment panel */}
                  <div className="flex min-h-0 flex-col overflow-y-auto bg-gray-50/80 p-4 lg:col-span-3">
                    {!selectedTicket ? (
                      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                        Payment appears after you select a ticket
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          2. Pay
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              { id: 'wechat', label: 'WeChat' },
                              { id: 'alipay', label: 'Alipay' },
                              { id: 'cash', label: 'Cash' },
                            ] as const
                          ).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (m.id === 'cash') {
                                  setPaymentMethod('cash')
                                  setPaymentProof('')
                                  return
                                }
                                setPaymentMethod(m.id)
                                if (
                                  (m.id === 'wechat' && !wechatQrCode) ||
                                  (m.id === 'alipay' && !alipayQrCode)
                                ) {
                                  if (!loadingPaymentQr) void fetchTreasurerPaymentQrs()
                                }
                              }}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                                paymentMethod === m.id
                                  ? m.id === 'wechat'
                                    ? 'border-green-600 bg-green-50 text-green-800'
                                    : m.id === 'alipay'
                                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                                      : 'border-amber-500 bg-amber-50 text-amber-800'
                                  : 'border-gray-200 bg-white text-gray-700'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>

                        {paymentMethod === 'cash' ? (
                          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Pay the treasurer in person — no screenshot needed.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* QR */}
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                              <p className="mb-2 text-xs font-medium text-gray-700">
                                Scan Treasurer{' '}
                                {paymentMethod === 'alipay' ? 'Alipay' : 'WeChat'} QR
                              </p>
                              {loadingPaymentQr ? (
                                <div className="flex h-40 flex-col items-center justify-center gap-2 text-purple-700">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  <span className="text-xs">Loading…</span>
                                </div>
                              ) : paymentMethod === 'wechat' && wechatQrCode ? (
                                <img
                                  src={wechatQrCode}
                                  alt="WeChat Pay"
                                  className="mx-auto h-40 w-40 object-contain"
                                />
                              ) : paymentMethod === 'alipay' && alipayQrCode ? (
                                <img
                                  src={alipayQrCode}
                                  alt="Alipay"
                                  className="mx-auto h-40 w-40 object-contain"
                                />
                              ) : (
                                <div className="flex h-40 flex-col items-center justify-center gap-1 px-2">
                                  <p className="text-xs text-amber-700">QR not loaded</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      fetchTreasurerPaymentQrs({ defaultPaymentMethod: true })
                                    }
                                    className="text-xs text-purple-700 underline"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}
                              <p className="mt-1 text-[11px] font-semibold text-gray-900">
                                Pay ¥{ticketCombinedTotal().toFixed(2)}
                              </p>
                            </div>

                            {/* Proof */}
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <p className="mb-2 text-xs font-medium text-gray-700">
                                Upload payment proof *
                              </p>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) void uploadPaymentProof(file, 'ticket')
                                }}
                                disabled={uploadingProof || purchasingTicket}
                                className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-purple-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-purple-700"
                              />
                              {paymentProof ? (
                                <div className="relative mt-2 h-28 overflow-hidden rounded bg-gray-50">
                                  <img
                                    src={paymentProof}
                                    alt="Proof"
                                    className="h-full w-full object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPaymentProof('')}
                                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-[11px] font-medium text-red-600">
                                  Scan the QR first, then upload your screenshot here.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedTicket.payment_instructions && (
                          <p className="line-clamp-2 text-[11px] text-gray-500">
                            {selectedTicket.payment_instructions}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky footer actions */}
                <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={closeTicketModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePurchaseTicket}
                    disabled={
                      !selectedTicket ||
                      purchasingTicket ||
                      uploadingProof ||
                      !paymentMethod ||
                      (paymentMethod !== 'cash' && !paymentProof)
                    }
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingProof ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading proof…
                      </span>
                    ) : purchasingTicket ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </span>
                    ) : !selectedTicket ? (
                      'Select a ticket'
                    ) : paymentMethod && paymentMethod !== 'cash' && !paymentProof ? (
                      'Upload proof to submit'
                    ) : (
                      `Submit — ¥${ticketCombinedTotal().toFixed(2)}`
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Non-Member Registration Modal */}
      {showNonMemberRegistrationModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 my-8 max-h-[95vh] overflow-y-auto">
            {nonMemberRegistrationStep === 'info' ? (
              // Step 1: Personal Information
              <>
                <h2 className="text-2xl font-bold mb-2">Register for {selectedEvent.title}</h2>
                <p className="text-gray-600 mb-4">Please provide your information to register</p>
                
                <form onSubmit={handleNonMemberRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={nonMemberForm.full_name}
                        onChange={(e) => setNonMemberForm({...nonMemberForm, full_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={nonMemberForm.email}
                        onChange={(e) => setNonMemberForm({...nonMemberForm, email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={nonMemberForm.phone}
                        onChange={(e) => setNonMemberForm({...nonMemberForm, phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Education Level *
                      </label>
                      <select
                        value={nonMemberForm.education_level}
                        onChange={(e) => setNonMemberForm({...nonMemberForm, education_level: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select education level</option>
                        <option value="High School">High School</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Bachelor">Bachelor's Degree</option>
                        <option value="Master">Master's Degree</option>
                        <option value="PhD">PhD</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <select
                        value={nonMemberForm.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select country</option>
                        {countries.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      {availableCities.length > 0 ? (
                        <select
                          value={nonMemberForm.city}
                          onChange={(e) => setNonMemberForm({...nonMemberForm, city: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select city</option>
                          {availableCities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                          <option value="Other">Other (Type below)</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={nonMemberForm.city}
                          onChange={(e) => setNonMemberForm({...nonMemberForm, city: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={nonMemberForm.country ? "Enter your city" : "Select country first"}
                          required
                          disabled={!nonMemberForm.country}
                        />
                      )}
                      {nonMemberForm.city === 'Other' && (
                        <input
                          type="text"
                          value={nonMemberForm.city}
                          onChange={(e) => setNonMemberForm({...nonMemberForm, city: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
                          placeholder="Type your city name"
                          required
                        />
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={nonMemberForm.address}
                      onChange={(e) => setNonMemberForm({...nonMemberForm, address: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Street address, building, apartment number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (Optional)
                    </label>
                    <textarea
                      value={nonMemberForm.message}
                      onChange={(e) => setNonMemberForm({...nonMemberForm, message: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Why would you like to attend?"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNonMemberRegistrationModal(false)
                        setNonMemberRegistrationStep('info')
                        setNonMemberForm({
                          full_name: '',
                          email: '',
                          phone: '',
                          country: '',
                          city: '',
                          address: '',
                          education_level: '',
                          message: ''
                        })
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Next →
                    </button>
                  </div>
                </form>
              </>
            ) : (
              // Step 2: Payment Information
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Complete Your Registration</h2>
                  <p className="text-gray-600 text-sm mt-1">Event: {selectedEvent.title}</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Registration Summary & Instructions */}
                  <div className="space-y-4">
                    {/* Registration Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Your Details
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <p className="font-medium text-gray-900 truncate">{nonMemberForm.full_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium text-gray-900 truncate">{nonMemberForm.email}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium text-gray-900">{nonMemberForm.phone}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Education:</span>
                          <p className="font-medium text-gray-900 truncate">{nonMemberForm.education_level}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Country:</span>
                          <p className="font-medium text-gray-900">{nonMemberForm.country}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">City:</span>
                          <p className="font-medium text-gray-900">{nonMemberForm.city}</p>
                        </div>
                      </div>
                    </div>

                    {/* Next Steps Instructions */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Next Steps
                      </h4>
                      <ol className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                          <span>Scan QR code with WeChat or Alipay</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                          <span>Take screenshot of payment confirmation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                          <span>Upload screenshot below</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                          <span>We'll verify within 24 hours</span>
                        </li>
                      </ol>
                    </div>

                    {/* Payment Proof Upload */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Upload Payment Proof *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaymentProofUpload}
                        disabled={uploadingProof}
                        className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        Upload screenshot (JPG, PNG, max 5MB)
                      </p>
                      
                      {paymentProofFile && (
                        <div className="mt-3 relative">
                          <img
                            src={paymentProofFile}
                            alt="Payment proof"
                            className="w-full h-32 object-cover rounded-md border border-gray-300"
                          />
                          <button
                            onClick={() => setPaymentProofFile(null)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {uploadingProof && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - QR Codes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 text-center">Scan to Pay</h3>
                    
                    {/* Price Display - Simple black text */}
                    {selectedEvent?.tshirt_enabled && selectedEvent?.tshirt_image_url && (
                      <div className="rounded-lg overflow-hidden bg-white mb-3">
                        <p className="text-xs font-medium text-indigo-800 px-3 pt-2">T-shirt design</p>
                        <img
                          src={selectedEvent.tshirt_image_url}
                          alt="T-shirt design"
                          className="w-full max-h-64 object-contain p-2"
                        />
                      </div>
                    )}

                    {selectedTicket && (
                      <div className="text-center py-2">
                        <p className="text-5xl font-bold text-black">¥{selectedTicket.price}</p>
                      </div>
                    )}
                    
                    {/* Payment Method Selection */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedPaymentMethod('wechat')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                          selectedPaymentMethod === 'wechat'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <img src="/wechat-logo.svg" alt="WeChat" className="h-5 w-5 object-contain" />
                          WeChat
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedPaymentMethod('alipay')}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                          selectedPaymentMethod === 'alipay'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <img src="/alipay-logo.svg" alt="Alipay" className="h-5 w-5 object-contain" />
                          Alipay
                        </div>
                      </button>
                    </div>

                    {/* QR Code Display */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center">
                      {selectedPaymentMethod === 'wechat' && wechatQrCode ? (
                        <>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <img
                              src={wechatQrCode}
                              alt="WeChat Pay QR Code"
                              className="w-64 h-64 object-contain"
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-3">Scan with WeChat</p>
                        </>
                      ) : selectedPaymentMethod === 'alipay' && alipayQrCode ? (
                        <>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <img
                              src={alipayQrCode}
                              alt="Alipay QR Code"
                              className="w-64 h-64 object-contain"
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-3">Scan with Alipay</p>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-gray-500 text-sm">
                            {selectedPaymentMethod === 'wechat' ? 'WeChat' : 'Alipay'} QR code not available
                          </p>
                          <p className="text-gray-400 text-xs mt-1">Please contact organizer</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setNonMemberRegistrationStep('info')}
                    className="flex-1 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNonMemberRegistration}
                    disabled={submittingNonMember}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {submittingNonMember ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Verification Code Modal */}
      {showVerificationCode && verificationCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 text-sm">
                Save your verification code to check your registration status
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Your Verification Code</p>
              <div className="text-5xl font-bold text-blue-600 tracking-widest mb-2">
                {verificationCode}
              </div>
              <p className="text-xs text-gray-500">
                Please save this code. You'll need it to check your registration status.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(verificationCode)
                  toast.success('Code copied to clipboard!')
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </button>
              <button
                onClick={() => {
                  setShowVerificationCode(false)
                  setVerificationCode(null)
                  setNonMemberRegistrationStep('info')
                  setNonMemberForm({
                    full_name: '',
                    email: '',
                    phone: '',
                    country: '',
                    city: '',
                    address: '',
                    education_level: '',
                    message: ''
                  })
                  setPaymentProofFile(null)
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
              >
                Done
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Check your status anytime at{' '}
                <a href="/" className="text-blue-600 hover:underline font-medium">
                  homepage
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      {showTshirtModal && tshirtEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Register — {tshirtEvent.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This event offers a T-shirt
              {tshirtEvent.tshirt_pricing === 'paid' && tshirtEvent.tshirt_price != null
                ? ` (¥${Number(tshirtEvent.tshirt_price).toFixed(2)})`
                : ' (free)'}
              .
            </p>
            {tshirtEvent.tshirt_image_url && (
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={tshirtEvent.tshirt_image_url}
                  alt="T-shirt design"
                  className="w-full max-h-72 object-contain"
                />
              </div>
            )}

            {!tshirtEvent.tshirt_required && (
              <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tshirtWanted}
                  onChange={(e) => {
                    setTshirtWanted(e.target.checked)
                    if (!e.target.checked) {
                      setTshirtSize('')
                      setTshirtPaymentMethod('')
                      setPaymentProof('')
                    }
                  }}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded"
                />
                I want a T-shirt
              </label>
            )}

            {(tshirtWanted || tshirtEvent.tshirt_required) && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Select size</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(tshirtEvent.tshirt_sizes) && tshirtEvent.tshirt_sizes.length
                    ? tshirtEvent.tshirt_sizes
                    : ['S', 'M', 'L', 'XL', 'XXL']
                  ).map((size: string) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTshirtSize(size)}
                      className={`px-3 py-1.5 text-sm rounded-md border ${
                        tshirtSize === size
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(tshirtWanted || tshirtEvent.tshirt_required) &&
              tshirtEvent.tshirt_pricing === 'paid' &&
              (parseFloat(String(tshirtEvent.tshirt_price ?? 0)) || 0) > 0 && (
                <div className="mb-4 space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-900">
                    Pay ¥{Number(tshirtEvent.tshirt_price).toFixed(2)} for T-shirt
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment method *
                    </label>
                    <select
                      value={tshirtPaymentMethod}
                      onChange={(e) => setTshirtPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select…</option>
                      <option value="alipay">Alipay</option>
                      <option value="wechat">WeChat</option>
                      <option value="cash">In Person (Cash)</option>
                    </select>
                  </div>
                  {tshirtPaymentMethod === 'wechat' && (
                    <div className="rounded-lg border border-green-100 bg-green-50/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-800">1. Scan Treasurer WeChat Pay QR</p>
                      {wechatQrCode ? (
                        <img
                          src={wechatQrCode}
                          alt="Treasurer WeChat Pay QR"
                          className="mx-auto w-40 h-40 object-contain bg-white rounded border"
                        />
                      ) : (
                        <p className="text-xs text-amber-700">Treasurer WeChat QR is not set.</p>
                      )}
                    </div>
                  )}
                  {tshirtPaymentMethod === 'alipay' && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-800">1. Scan Treasurer Alipay QR</p>
                      {alipayQrCode ? (
                        <img
                          src={alipayQrCode}
                          alt="Treasurer Alipay QR"
                          className="mx-auto w-40 h-40 object-contain bg-white rounded border"
                        />
                      ) : (
                        <p className="text-xs text-amber-700">Treasurer Alipay QR is not set.</p>
                      )}
                    </div>
                  )}
                  {tshirtPaymentMethod && tshirtPaymentMethod !== 'cash' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        2. Upload payment proof *
                      </label>
                      <p className="text-xs text-gray-500 mb-1">
                        Scan the QR above first, then upload your screenshot.
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void uploadPaymentProof(file, 'tshirt')
                        }}
                        className="w-full text-sm"
                      />
                      {paymentProof && (
                        <img
                          src={paymentProof}
                          alt="Proof"
                          className="mt-2 h-32 object-contain rounded border"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowTshirtModal(false)
                  setTshirtEvent(null)
                  setTshirtSize('')
                  setTshirtPaymentMethod('')
                  setPaymentProof('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={registering === tshirtEvent.id}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTshirtRegistration}
                disabled={registering === tshirtEvent.id || uploadingProof}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {registering === tshirtEvent.id ? 'Registering...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EventsShell>
  )
}
