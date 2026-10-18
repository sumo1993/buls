'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { PhoneInput } from './PhoneInput'

interface SimpleGuestManagementModalProps {
  // Core props
  eventId?: string
  eventTitle?: string
  eventType?: 'free' | 'ticket_only' | 'registration_required' | 'hybrid'
  
  // Ticket props (for ticket events)
  ticketPurchaseId?: string
  memberName?: string
  ticketNumber?: string  // Add ticket number prop
  
  // Event configuration
  maxGuests?: number
  doorGuestPrice?: number
  allowDoorAddition?: boolean
  allowAfterPurchase?: boolean
  
  // User context
  isAdmin?: boolean
  isSecretary?: boolean
  readonly?: boolean
  trigger?: React.ReactNode
  
  // Callbacks
  onGuestsUpdated?: (guests: any[]) => void
  onPaymentCollected?: (amount: number) => void
  onGuestClick?: (guest: any) => void  // Add this callback
}

type Guest = {
  id?: number
  full_name: string
  email?: string
  phone?: string
  relationship?: 'family' | 'friend' | 'colleague' | 'other'
  additional_info?: string
  checked_in?: boolean
  checked_in_at?: string
  payment_status?: string
  payment_method?: string
  payment_notes?: string
  payment_proof_url?: string
  amount_paid?: number
  refund_amount?: number
  refund_reason?: string
  refund_proof_url?: string
  refunded_at?: string
  updated_at?: string
  added_by_admin?: boolean
  added_at_event?: boolean
}

export function SimpleGuestManagementModal({
  eventId,
  eventTitle,
  eventType = 'free',
  ticketPurchaseId,
  memberName,
  ticketNumber,
  maxGuests = 5,
  doorGuestPrice = 0,
  allowDoorAddition = true,
  allowAfterPurchase = true,
  isAdmin = false,
  isSecretary = false,
  readonly = false,
  trigger,
  onGuestsUpdated,
  onPaymentCollected,
  onGuestClick,  // Add this
}: SimpleGuestManagementModalProps) {
  console.log('SimpleGuestManagementModal props:', { eventId, eventTitle, ticketPurchaseId, memberName, ticketNumber, maxGuests, doorGuestPrice, allowDoorAddition, allowAfterPurchase, isAdmin, isSecretary })
  
  const [showModal, setShowModal] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false) // Track if showing add form
  const [showGuestDetail, setShowGuestDetail] = useState(false) // Track if showing guest detail
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null) // Selected guest for detail view
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState<any>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingQR, setLoadingQR] = useState(false)
  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    relationship: 'friend' as const,
    additionalInfo: '',
    paymentOption: 'full' as 'full' | 'complimentary' | 'vip',
  })

  // Fetch existing guests when modal opens
  useEffect(() => {
    if (showModal && ticketPurchaseId) {
      fetchGuests()
    }
  }, [showModal, ticketPurchaseId])

  const fetchGuests = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketPurchaseId}/guests`)
      if (response.ok) {
        const data = await response.json()
        setGuests(data.guests || [])
        console.log('Fetched guests:', data.guests)
      }
    } catch (error) {
      console.error('Error fetching guests:', error)
    }
  }

  const saveGuestToDatabase = async (
    guestName: string,
    paymentOption: string,
    _guestNumber: number,
    statusOverride?: string
  ): Promise<{ ok: boolean; guest?: any }> => {
    try {
      // Map UI options → API payment_method / status
      // pending = unpaid door (cannot check in until paid)
      // complimentary = VIP/comp (can check in)
      // paid_* = collected (can check in)
      let finalStatus =
        statusOverride ||
        (paymentOption === 'full' ? 'pending' : 'waived')
      let paymentMethod = 'door'
      if (paymentOption === 'vip' || paymentOption === 'complimentary' || finalStatus === 'waived' || finalStatus === 'complimentary') {
        paymentMethod = 'complimentary'
        finalStatus = 'complimentary'
      } else if (finalStatus === 'paid' || finalStatus === 'paid_online' || finalStatus === 'paid_at_door') {
        paymentMethod = 'already_paid'
        finalStatus = 'paid_online'
      } else {
        paymentMethod = 'door'
        finalStatus = 'pending'
      }
      
      const response = await fetch(`/api/tickets/${ticketPurchaseId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: guestName,
          email: form.guestEmail.trim(),
          phone: form.guestPhone.trim(),
          relationship: form.relationship,
          additional_info: form.additionalInfo.trim(),
          payment_status: finalStatus,
          amount_paid:
            paymentMethod === 'complimentary'
              ? 0
              : parseFloat(doorGuestPrice?.toString() || '0') || 0,
          payment_method: paymentMethod,
          guest_type: paymentOption === 'vip' ? 'vip' : 'regular',
          added_by_admin: true,
          added_at_event: true,
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Guest saved:', data)
        await fetchGuests()
        return { ok: true, guest: data.guest || data }
      } else {
        const error = await response.json()
        console.error('Failed to save guest:', error)
        return { ok: false }
      }
    } catch (error) {
      console.error('Error saving guest:', error)
      return { ok: false }
    }
  }

  const handleAddGuest = async () => {
    if (!form.guestName.trim()) {
      toast.error('Please enter guest name')
      return
    }

    if (!form.guestPhone.trim()) {
      toast.error('Phone number is required')
      return
    }

    if (!form.guestEmail.trim()) {
      toast.error('Email is required')
      return
    }

    if (!ticketPurchaseId) {
      toast.error('Ticket purchase is required to add a guest')
      return
    }

    setLoading(true)
    try {
      const guestName = form.guestName.trim()
      const paymentOption = form.paymentOption
      let guestPrice = parseFloat(doorGuestPrice?.toString() || '0')
      if (isNaN(guestPrice)) guestPrice = 0

      // Guest number for QR / display
      let thisGuestNumber = 1
      try {
        const guestsResponse = await fetch(`/api/tickets/${ticketPurchaseId}/guests`)
        if (guestsResponse.ok) {
          const data = await guestsResponse.json()
          thisGuestNumber = (data.guests?.length || 0) + 1
        }
      } catch {
        // non-fatal
      }

      // VIP / complimentary: persist immediately (payment cleared → can check in)
      if (paymentOption === 'vip' || paymentOption === 'complimentary') {
        const { ok } = await saveGuestToDatabase(
          guestName,
          paymentOption,
          thisGuestNumber,
          'waived'
        )
        if (!ok) {
          toast.error('Failed to save guest')
          return false
        }
        toast.success(
          paymentOption === 'vip'
            ? `✓ ${guestName} added as VIP (payment waived)`
            : `✓ ${guestName} added as complimentary (payment waived)`,
          { duration: 4000, icon: paymentOption === 'vip' ? '👑' : '🎁' }
        )
        await fetchGuests()
        if (onGuestsUpdated) {
          onGuestsUpdated([])
        }
        setForm({
          guestName: '',
          guestEmail: '',
          guestPhone: '',
          relationship: 'friend',
          additionalInfo: '',
          paymentOption: 'full',
        })
        return true
      }

      // Full payment: save as pending first (cannot check in until paid), then show QR
      const { ok: pendingOk, guest: pendingGuest } = await saveGuestToDatabase(
        guestName,
        'full',
        thisGuestNumber,
        'pending'
      )
      if (!pendingOk) {
        toast.error('Failed to save guest')
        return false
      }

      toast.success(`✓ ${guestName} added. Payment required: ¥${guestPrice.toFixed(2)}`, {
        duration: 4000,
        icon: '💰',
      })

      setLoadingQR(true)
      try {
        const finalTicketNumber = ticketNumber || ticketPurchaseId.substring(0, 8)
        const qrResponse = await fetch('/api/qr-codes')
        if (qrResponse.ok) {
          const qrPayload = await qrResponse.json()
          const adminQrCode = qrPayload.qrCodes?.[0]

          if (adminQrCode && adminQrCode.qr_code_url) {
            setQrData({
              qr_code_url: adminQrCode.qr_code_url,
              guest_id: pendingGuest?.id,
              guest_name: guestName,
              guest_email: form.guestEmail.trim(),
              guest_phone: form.guestPhone.trim(),
              amount: guestPrice,
              discount_percent: 0,
              original_amount: doorGuestPrice,
              event_title: eventTitle,
              ticket_purchase_id: ticketPurchaseId,
              ticket_number: finalTicketNumber,
              guest_number: thisGuestNumber,
              total_guests: 1,
              total_amount: guestPrice,
            })
            setShowQRModal(true)
          } else {
            toast.error('No QR code uploaded yet. Guest saved as unpaid — collect payment before check-in.')
          }
        } else {
          toast.error('Failed to load QR codes. Guest saved as unpaid.')
        }
      } catch (error) {
        console.error('Error fetching QR codes:', error)
        toast.error('Failed to load QR codes. Guest saved as unpaid.')
      } finally {
        setLoadingQR(false)
      }

      await fetchGuests()
      setForm({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        relationship: 'friend',
        additionalInfo: '',
        paymentOption: 'full',
      })

      return true
    } catch (error) {
      console.error('Error adding guest:', error)
      toast.error('Failed to add guest')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Handle marking payment as paid (updates existing pending guest — no duplicate insert)
  const handleMarkPaid = async () => {
    console.log('Marking payment as paid:', qrData)
    const finalAmount = qrData.amount
    setShowQRModal(false)

    try {
      let guestId = qrData.guest_id
      // Fallback: find pending guest by name under this ticket
      if (!guestId && ticketPurchaseId && qrData.guest_name) {
        const listRes = await fetch(`/api/tickets/${ticketPurchaseId}/guests`)
        if (listRes.ok) {
          const listData = await listRes.json()
          const match = (listData.guests || []).find(
            (g: any) =>
              g.full_name === qrData.guest_name &&
              g.payment_status === 'pending'
          )
          guestId = match?.id
        }
      }

      if (!guestId) {
        toast.error('Guest record not found to mark paid')
        return
      }

      const response = await fetch(`/api/admin/guests/${guestId}/collect-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          payment_method: 'door',
          notes: 'Payment marked paid at door via QR modal',
        })
      })

      if (response.ok) {
        toast.success(`Payment marked as PAID! Amount: ¥${finalAmount}`)
        await fetchGuests()
        if (onPaymentCollected) onPaymentCollected(finalAmount)
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || 'Failed to mark payment as paid')
      }
    } catch (error) {
      console.error('Error marking guest paid:', error)
      toast.error('Failed to mark payment as paid')
    }
  }

  // Handle rejecting payment
  const handleMarkRejected = () => {
    console.log('Rejecting payment:', qrData)
    toast.error('Payment marked as REJECTED')
    setShowQRModal(false)
  }

  return (
    <>
      {trigger && (
        <div onClick={() => setShowModal(true)}>
          {trigger}
        </div>
      )}

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            // Only close if clicking directly on the backdrop
            if (e.target === e.currentTarget) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div 
            className="w-full max-w-md rounded-lg bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {showAddForm ? 'Add Guest' : 'My Guests'}
                </h3>
                {eventTitle && (
                  <p className="text-sm text-gray-500">
                    {eventTitle}
                  </p>
                )}
              </div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
                >
                  + Add Guest
                </button>
              )}
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {!showAddForm ? (
                // GUEST LIST VIEW
                <>
                  {guests.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-4">No guests added yet</p>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                      >
                        Add Your First Guest
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {guests.map((guest, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (onGuestClick && (isAdmin || isSecretary)) {
                              // For treasurer/admin - use callback to open Edit Guest modal
                              onGuestClick(guest)
                              setShowModal(false)
                            } else {
                              // For regular members - show detail view
                              setSelectedGuest(guest)
                              setShowGuestDetail(true)
                            }
                          }}
                          className="w-full flex items-start justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900 mb-1">{guest.full_name}</p>
                            {(guest.email || guest.phone) && (
                              <div className="space-y-1 text-sm text-gray-600">
                                {guest.email && (
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {guest.email}
                                  </div>
                                )}
                                {guest.phone && (
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {guest.phone}
                                  </div>
                                )}
                              </div>
                            )}
                            {guest.relationship && (
                              <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {guest.relationship}
                              </span>
                            )}
                            <div className="mt-2">
                              {guest.payment_status === 'paid' || guest.payment_status === 'paid_at_door' || guest.payment_status === 'paid_online' ? (
                                <span className="inline-flex items-center text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                                  ✓ Paid ¥{guest.amount_paid ?? doorGuestPrice ?? 0}
                                </span>
                              ) : guest.payment_status === 'pending' ? (
                                <span className="inline-flex items-center text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                                  ⏳ Pending Payment
                                </span>
                              ) : guest.payment_status === 'refunded' ? (
                                <span className="inline-flex items-center text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                                  ↩ Refunded ¥{guest.refund_amount ?? guest.amount_paid ?? doorGuestPrice ?? 0}
                                </span>
                              ) : guest.payment_status === 'complimentary' || guest.payment_status === 'waived' ? (
                                <span className="inline-flex items-center text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                  🎁 Complimentary
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // ADD GUEST FORM VIEW
                <>
              {/* Guest Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Guest Name *
                </label>
                <input
                  type="text"
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter guest name"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.guestEmail}
                    onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    onBlur={(e) => e.preventDefault()} // Prevent closing on blur
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="guest@email.com"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <PhoneInput
                    value={form.guestPhone}
                    onChange={(phone) => setForm({ ...form, guestPhone: phone })}
                    label="Phone *"
                    placeholder="138 0013 8000"
                    required
                  />
                </div>
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="friend">Friend</option>
                  <option value="family">Family</option>
                  <option value="colleague">Colleague</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Additional Info */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={form.additionalInfo}
                  onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Any special requirements..."
                  rows={2}
                />
              </div>

              {/* Payment Option - Compact Card */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Option
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentOption: 'full', discountPercent: 0 })}
                    className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      form.paymentOption === 'full'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span className="mb-0.5 text-xs">💰</span>
                    Full
                    <span className="text-[9px]">¥{doorGuestPrice}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentOption: 'complimentary', discountPercent: 0 })}
                    className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      form.paymentOption === 'complimentary'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <span className="mb-0.5 text-xs">🎁</span>
                    Free
                    <span className="text-[9px]">Complimentary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentOption: 'vip', discountPercent: 0 })}
                    className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      form.paymentOption === 'vip'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <span className="mb-0.5 text-xs">👑</span>
                    VIP
                    <span className="text-[9px]">Free</span>
                  </button>
                </div>
              </div>

              {/* Discount Option - Disabled */}
              <div>
                <p className="text-xs text-gray-500">
                 Discount option disabled
                </p>
              </div>
                </>
              )}
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
              {showAddForm ? (
                <>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
                  >
                    ← Back to List
                  </button>
                  <button
                    onClick={handleAddGuest}
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded"
                  >
                    {loading ? 'Adding...' : 'Add Guest'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Payment Modal - Shows Admin Uploaded QR Code */}
      {showQRModal && qrData && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {/* Header */}
            <div className="p-4 text-center flex-shrink-0 bg-blue-50 border-b border-blue-100">
              <h3 className="text-lg font-bold text-blue-900">
                Payment QR Code
              </h3>
              <p className="text-sm text-blue-700 font-medium mt-1">
                Scan to pay ¥{qrData.amount} for {qrData.guest_name}
              </p>
            </div>
            
            {/* QR Code Image */}
            {qrData.qr_code_url && (
              <div className="flex justify-center p-3">
                <img 
                  src={qrData.qr_code_url} 
                  alt="Payment QR Code" 
                  className="max-w-full max-h-56 object-contain"
                />
              </div>
            )}

            {/* Guest Details */}
            <div className="bg-gray-50 rounded-md p-3 text-left flex-shrink-0 space-y-2">
              {/* Guest Info */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm pb-2 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Guest:</span>
                  <span className="font-semibold text-gray-900">{qrData.guest_name}</span>
                </div>
                {(qrData.guest_email || qrData.guest_phone) && (
                  <div className="flex flex-wrap gap-2">
                    {qrData.guest_email && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        📧 {qrData.guest_email}
                      </span>
                    )}
                    {qrData.guest_phone && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        📱 {qrData.guest_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Due:</span>
                  <div className="flex items-center">
                    <span className="font-bold text-gray-900 text-lg">¥{qrData.amount}</span>
                  </div>
                </div>
              </div>

              {/* Event Info */}
              {qrData.event_title && (
                <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                  <span className="font-medium">Event:</span> {qrData.event_title}
                </div>
              )}

              {/* Ticket Info */}
              <div className="flex justify-between text-xs text-gray-600">
                {qrData.ticket_number && (
                  <span>Ticket: #{qrData.ticket_number}</span>
                )}
                {qrData.guest_number && (
                  <span>Guest: #{qrData.guest_number}</span>
                )}
              </div>

              {/* Guest Count */}
              <div className="text-xs text-gray-500">
                Guest #{qrData.guest_number} added
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleMarkPaid()}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700 flex-shrink-0 transition-colors"
              >
                ✅ Mark Paid
              </button>
              <button
                onClick={() => handleMarkRejected()}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 flex-shrink-0 transition-colors"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Detail Modal (for regular members) */}
      {showGuestDetail && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-4 max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Guest Details</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedGuest.full_name}</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Guest Information */}
              <div className="space-y-3">
                {selectedGuest.email && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{selectedGuest.email}</p>
                    </div>
                  </div>
                )}
                {selectedGuest.phone && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{selectedGuest.phone}</p>
                    </div>
                  </div>
                )}
                {selectedGuest.relationship && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Relationship</p>
                      <p className="text-sm text-gray-900 capitalize">{selectedGuest.relationship}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Status & Details */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 space-y-3">
                <p className="text-sm text-gray-700 font-semibold mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payment Information
                </p>
                
                {selectedGuest.payment_status === 'paid' || selectedGuest.payment_status === 'paid_at_door' || selectedGuest.payment_status === 'paid_online' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-300">
                      <span className="text-lg font-bold text-green-600 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Paid
                      </span>
                      <span className="text-2xl font-bold text-gray-900">¥{doorGuestPrice || selectedGuest.amount_paid || 0}</span>
                    </div>
                    
                    {/* Payment Method */}
                    {selectedGuest.payment_method && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {selectedGuest.payment_method === 'door' ? 'Paid at Door' : 
                           selectedGuest.payment_method === 'already_paid' ? 'Already Paid' :
                           selectedGuest.payment_method === 'online' ? 'Online Payment' :
                           selectedGuest.payment_method}
                        </span>
                      </div>
                    )}

                    {/* Payment Notes from Treasurer */}
                    {selectedGuest.payment_notes && (
                      <div className="bg-white rounded-lg p-3 mt-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">Treasurer Notes:</p>
                        <p className="text-sm text-gray-700">{selectedGuest.payment_notes}</p>
                      </div>
                    )}

                    {/* Payment Proof */}
                    {selectedGuest.payment_proof_url && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 font-medium mb-2">Payment Receipt:</p>
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <img 
                            src={selectedGuest.payment_proof_url} 
                            alt="Payment proof" 
                            className="w-full max-h-48 object-contain mx-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(selectedGuest.payment_proof_url, '_blank')}
                          />
                          <p className="text-xs text-center text-gray-500 mt-1">Click to view full size</p>
                        </div>
                      </div>
                    )}

                    {/* Payment Date */}
                    {selectedGuest.updated_at && (
                      <div className="flex justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                        <span>Last Updated:</span>
                        <span>{new Date(selectedGuest.updated_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : selectedGuest.payment_status === 'pending' ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-yellow-600">⏳ Pending Payment</span>
                      <span className="text-lg font-bold text-gray-900">¥{doorGuestPrice || selectedGuest.amount_paid || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Payment is awaiting treasurer approval</p>
                  </div>
                ) : selectedGuest.payment_status === 'refunded' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-300">
                      <span className="text-lg font-bold text-red-600 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414L9 6.586 7.707 5.293a1 1 0 00-1.414 1.414L7.586 8l-1.293 1.293a1 1 0 101.414 1.414L9 9.414l1.293 1.293a1 1 0 001.414-1.414L10.414 8l1.293-1.293z" clipRule="evenodd" />
                        </svg>
                        Refunded
                      </span>
                      <span className="text-2xl font-bold text-gray-900">¥{selectedGuest.refund_amount ?? selectedGuest.amount_paid ?? doorGuestPrice ?? 0}</span>
                    </div>
                    
                    {selectedGuest.refund_reason && (
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">Refund Reason:</p>
                        <p className="text-sm text-gray-700">{selectedGuest.refund_reason}</p>
                      </div>
                    )}

                    {/* Refund Proof Receipt */}
                    {selectedGuest.refund_proof_url && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 font-medium mb-2">Refund Receipt:</p>
                        <div className="bg-white rounded-lg p-2 border border-red-200">
                          <img 
                            src={selectedGuest.refund_proof_url} 
                            alt="Refund proof" 
                            className="w-full max-h-48 object-contain mx-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(selectedGuest.refund_proof_url, '_blank')}
                          />
                          <p className="text-xs text-center text-gray-500 mt-1">Click to view full size</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.refunded_at && (
                      <div className="flex justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                        <span>Refunded On:</span>
                        <span>{new Date(selectedGuest.refunded_at).toLocaleString()}</span>
                      </div>
                    )}

                    {/* Payment Proof (even if refunded) */}
                    {selectedGuest.payment_proof_url && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-600 font-medium mb-2">Original Payment Receipt:</p>
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <img 
                            src={selectedGuest.payment_proof_url} 
                            alt="Payment proof" 
                            className="w-full max-h-48 object-contain mx-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(selectedGuest.payment_proof_url, '_blank')}
                          />
                          <p className="text-xs text-center text-gray-500 mt-1">Click to view full size</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedGuest.payment_status === 'complimentary' || selectedGuest.payment_status === 'waived' ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-lg font-semibold text-purple-600 flex items-center">
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      🎁 Complimentary Guest
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No payment information available</span>
                )}
              </div>

              {/* Additional Notes */}
              {selectedGuest.additional_info && (
                <div>
                  <p className="text-sm text-gray-700 font-semibold mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Notes
                  </p>
                  <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{selectedGuest.additional_info}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowGuestDetail(false)
                  setSelectedGuest(null)
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

