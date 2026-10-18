'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicEventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [registrationForm, setRegistrationForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  // For paid events
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [eventTickets, setEventTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [paymentOption, setPaymentOption] = useState<'online' | 'at_gate'>('online')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentProof, setPaymentProof] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [wechatQrCode, setWechatQrCode] = useState<string | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicEvents()
  }, [])

  const fetchPublicEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public-events')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to load events')
      }
      
      const data = await response.json()
      console.log('Public events loaded:', data)
      setEvents(data.events || [])
    } catch (error: any) {
      console.error('Error fetching events:', error)
      toast.error(error.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterClick = async (event: any) => {
    setSelectedEvent(event)
    
    // Check if it's a paid event
    if (event.event_type === 'ticket_only') {
      // Fetch tickets for this event (using public API - no auth needed)
      try {
        const response = await fetch(`/api/public-tickets?eventId=${event.id}`)
        if (response.ok) {
          const data = await response.json()
          setEventTickets(data.tickets || [])
          
          // Treasurer payment QRs (Admin → QR Codes → Treasurer)
          const qrResponse = await fetch('/api/public-qr-code?role=treasurer')
          if (qrResponse.ok) {
            const qrData = await qrResponse.json()
            const wechat = qrData.wechat?.qr_code_url || null
            const alipay = qrData.alipay?.qr_code_url || null
            setWechatQrCode(wechat)
            setAlipayQrCode(alipay)
            if (!wechat && !alipay) {
              toast.error('No Treasurer payment QR code available. Please contact organizer.')
              return
            }
            setSelectedEvent(event)
          } else {
            toast.error('Failed to load payment QR code')
            return
          }
          
          setShowPaymentModal(true)
        } else {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to load ticket information')
        }
      } catch (error) {
        console.error('Error loading payment info:', error)
        toast.error('Failed to load tickets')
      }
    } else {
      // Free event - show registration form
      setShowRegistrationModal(true)
    }
  }

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!registrationForm.full_name || !registrationForm.email || !registrationForm.phone) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        event_id: selectedEvent.id,
        ...registrationForm,
        registration_type: 'free'
      }

      const response = await fetch('/api/public-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register')
      }

      const result = await response.json()
      
      if (selectedEvent.require_guest_approval !== false) {
        toast.success('Registration submitted! Waiting for approval.')
      } else {
        toast.success('Successfully registered for the event!')
      }
      
      setShowRegistrationModal(false)
      setRegistrationForm({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        message: ''
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to register')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return null

    setUploadingProof(true)
    try {
      const reader = new FileReader()
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } finally {
      setUploadingProof(false)
    }
  }

  const handlePaidRegistration = async () => {
    if (!selectedTicket) {
      toast.error('Please select a ticket')
      return
    }

    if (!registrationForm.full_name || !registrationForm.email || !registrationForm.phone) {
      toast.error('Please fill in all required fields')
      return
    }

    if (paymentOption === 'online') {
      if (!paymentMethod) {
        toast.error('Please select a payment method')
        return
      }

      if (!paymentProof) {
        toast.error('Please upload payment proof')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        event_id: selectedEvent.id,
        ...registrationForm,
        registration_type: 'paid',
        ticket_id: selectedTicket.id,
        amount_paid: selectedTicket.price,
        payment_option: paymentOption,
        payment_method: paymentOption === 'online' ? paymentMethod : 'cash_at_gate',
        payment_proof_url: paymentOption === 'online' ? paymentProof : null
      }

      const response = await fetch('/api/public-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register')
      }

      if (paymentOption === 'online') {
        toast.success('Registration submitted! Awaiting payment verification.')
      } else {
        toast.success('Registration submitted! Please pay at the event entrance.')
      }
      
      setShowPaymentModal(false)
      setRegistrationForm({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        message: ''
      })
      setPaymentProof('')
      setPaymentMethod('')
      setSelectedTicket(null)
      setPaymentOption('online')
    } catch (error: any) {
      toast.error(error.message || 'Failed to register')
    } finally {
      setSubmitting(false)
    }
  }

  const isPastEvent = (eventDate: string) => {
    return new Date(eventDate) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Globe className="w-8 h-8 text-blue-600" />
              Public Events
            </h1>
            <p className="text-gray-600 mt-1">Register for upcoming events</p>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No public events available at this time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const isPast = isPastEvent(event.event_date)
              
              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow ${
                    isPast ? 'opacity-60' : ''
                  }`}
                >
                  {/* Event Image */}
                  {event.cover_image_url && (
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  
                  <div className="p-6">
                    {/* Event Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                    
                    {/* Event Type Badge */}
                    <div className="mb-3">
                      {event.event_type === 'ticket_only' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          🎫 Ticket Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          Free Event
                        </span>
                      )}
                      {isPast && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                          Past
                        </span>
                      )}
                    </div>
                    
                    {/* Event Details */}
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(event.event_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.tshirt_enabled && (
                        <div className="flex items-center gap-2.5 pt-1">
                          {event.tshirt_image_url && (
                            <div className="w-16 h-16 rounded-md bg-gray-50 overflow-hidden flex-shrink-0">
                              <img
                                src={event.tshirt_image_url}
                                alt="T-shirt design"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="text-indigo-700">
                            <span className="font-medium">T-shirt available</span>
                            {event.tshirt_pricing === 'paid' && event.tshirt_price != null
                              ? ` · ¥${Number(event.tshirt_price).toFixed(2)}`
                              : ' · Free'}
                          </div>
                        </div>
                      )}

                      {event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>
                            {event.registration_count || 0}/{event.capacity} registered
                            {event.spots_remaining > 0 && (
                              <span className="ml-1 text-green-600 font-medium">
                                ({event.spots_remaining} spots left)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Description */}
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                    )}
                    
                    {/* Register Button */}
                    {!isPast && (
                      <button
                        onClick={() => handleRegisterClick(event)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        disabled={event.registration_status === 'full'}
                      >
                        {event.registration_status === 'full' ? (
                          'Event Full'
                        ) : (
                          <>
                            Register Now
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Free Event Registration Modal */}
      {showRegistrationModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Register for {selectedEvent.title}</h2>
            
            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={registrationForm.full_name}
                  onChange={(e) => setRegistrationForm({...registrationForm, full_name: e.target.value})}
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
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({...registrationForm, email: e.target.value})}
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
                  value={registrationForm.phone}
                  onChange={(e) => setRegistrationForm({...registrationForm, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={registrationForm.address}
                  onChange={(e) => setRegistrationForm({...registrationForm, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={registrationForm.message}
                  onChange={(e) => setRegistrationForm({...registrationForm, message: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Why would you like to attend?"
                />
              </div>
              
              {selectedEvent.require_guest_approval !== false && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ℹ️ Your registration will be reviewed and you'll receive a confirmation email.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegistrationModal(false)
                    setRegistrationForm({
                      full_name: '',
                      email: '',
                      phone: '',
                      address: '',
                      message: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paid Event Registration Modal */}
      {showPaymentModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold mb-2">Purchase Ticket for {selectedEvent.title}</h2>
            <p className="text-gray-600 mb-6">Complete your registration and payment</p>
            
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={registrationForm.full_name}
                      onChange={(e) => setRegistrationForm({...registrationForm, full_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={registrationForm.email}
                      onChange={(e) => setRegistrationForm({...registrationForm, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={registrationForm.phone}
                      onChange={(e) => setRegistrationForm({...registrationForm, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={registrationForm.address}
                      onChange={(e) => setRegistrationForm({...registrationForm, address: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ticket Selection */}
              {eventTickets.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-4">Select Ticket</h3>
                  <div className="space-y-3">
                    {eventTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedTicket?.id === ticket.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{ticket.name}</h4>
                            {ticket.description && (
                              <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">¥{ticket.price}</p>
                            {ticket.quantity_available && (
                              <p className="text-sm text-gray-500">
                                {ticket.quantity_available - ticket.quantity_sold} left
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Option Selection */}
              {selectedTicket && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-4">Payment Option</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('online')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        paymentOption === 'online'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">💳</div>
                      <h4 className="font-semibold">Pay Online Now</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Scan QR code & upload payment proof
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption('at_gate')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        paymentOption === 'at_gate'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">🚪</div>
                      <h4 className="font-semibold">Pay at Gate</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay cash at event entrance
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Online Payment Section — Treasurer QR codes */}
              {selectedTicket && paymentOption === 'online' && (wechatQrCode || alipayQrCode) && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Complete Payment</h3>
                  
                  {/* Price Display */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Ticket: {selectedTicket.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedTicket.description || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Amount to Pay</p>
                        <p className="text-3xl font-bold text-blue-600">¥{selectedTicket.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select payment method</option>
                      <option value="wechat">WeChat Pay</option>
                      <option value="alipay">Alipay</option>
                    </select>
                  </div>
                  
                  {/* Treasurer QR for selected method */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg border-2 border-dashed border-green-300 mb-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-4">
                        {paymentMethod === 'alipay'
                          ? 'Scan Treasurer Alipay QR'
                          : paymentMethod === 'wechat'
                            ? 'Scan Treasurer WeChat Pay QR'
                            : 'Select a payment method to see the QR code'}
                      </p>
                      {paymentMethod === 'wechat' && wechatQrCode && (
                        <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                          <img
                            src={wechatQrCode}
                            alt="Treasurer WeChat Pay QR"
                            className="w-64 h-64 object-contain"
                          />
                        </div>
                      )}
                      {paymentMethod === 'alipay' && alipayQrCode && (
                        <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                          <img
                            src={alipayQrCode}
                            alt="Treasurer Alipay QR"
                            className="w-64 h-64 object-contain"
                          />
                        </div>
                      )}
                      {paymentMethod === 'wechat' && !wechatQrCode && (
                        <p className="text-sm text-amber-700">Treasurer WeChat QR is not set.</p>
                      )}
                      {paymentMethod === 'alipay' && !alipayQrCode && (
                        <p className="text-sm text-amber-700">Treasurer Alipay QR is not set.</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Proof Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Payment Proof * (Screenshot)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const imageUrl = await handleFileUpload(file)
                        if (imageUrl) {
                          setPaymentProof(imageUrl)
                          toast.success('Payment proof uploaded')
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={uploadingProof}
                    />
                    {paymentProof && (
                      <div className="mt-3">
                        <img
                          src={paymentProof}
                          alt="Payment proof"
                          className="w-32 h-32 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pay at Gate Notice */}
              {selectedTicket && paymentOption === 'at_gate' && (
                <div>
                  {/* Price Display */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Ticket: {selectedTicket.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedTicket.description || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Amount to Pay</p>
                        <p className="text-3xl font-bold text-blue-600">¥{selectedTicket.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-2">Payment at Entrance</h4>
                    <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                      <li>Bring ¥{selectedTicket.price} in cash</li>
                      <li>Show your phone number: <strong>{registrationForm.phone || '[Enter phone above]'}</strong></li>
                      <li>Pay at the registration desk</li>
                      <li>Get your ticket after payment confirmation</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentOption('online')
                    setPaymentMethod('')
                    setPaymentProof('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaidRegistration}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Processing...' : paymentOption === 'online' ? 'Submit Registration' : 'Reserve Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
