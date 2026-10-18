'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, CheckCircle, XCircle, Eye, TrendingUp, Users, Ticket } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatOrGenerateTicketNumber, getSearchableTicketNumber } from '@/lib/ticket-utils'
import { formatTshirtPaymentStatus } from '@/lib/event-tshirts'
import { isGuestRefunded } from '@/lib/event-attendance'
import { SimpleGuestManagementModal } from '@/components/SimpleGuestManagementModal'

export default function TreasurerTicketsPage() {
  const { userId } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([])
  const [approvedPurchases, setApprovedPurchases] = useState<any[]>([])
  const [rejectedPurchases, setRejectedPurchases] = useState<any[]>([])
  const [pendingTshirts, setPendingTshirts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'refunds' | 'tshirts'>('pending')
  const [processing, setProcessing] = useState<number | string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState('')
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [isTicketFlipped, setIsTicketFlipped] = useState(false)
  const [showQRGenerateModal, setShowQRGenerateModal] = useState(false)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [showEditGuestModal, setShowEditGuestModal] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<any>(null)
  const [guestEditForm, setGuestEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    relationship: 'friend' as const,
    payment_proof_url: '',
  })
  const [showRefundGuestModal, setShowRefundGuestModal] = useState(false)
  const [guestRefundReason, setGuestRefundReason] = useState('')
  const [guestRefundAmount, setGuestRefundAmount] = useState<number>(0)
  const [guestRefundProofUrl, setGuestRefundProofUrl] = useState('')
  const [uploadingGuestRefundProof, setUploadingGuestRefundProof] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSecretary, setIsSecretary] = useState(false)
  const [isTreasurer, setIsTreasurer] = useState(false)
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const itemsPerPage = 20
  
  // Refund filters
  const [refundFilters, setRefundFilters] = useState({
    year: 'all',
    month: 'all',
    event: 'all',
    search: ''
  })

  useEffect(() => {
    if (userId) {
      fetchUser()
      fetchPurchases()
    }
  }, [userId])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsAdmin(data.user?.role === 'admin')
        setIsSecretary(data.user?.role === 'secretary')
        setIsTreasurer(data.user?.role === 'treasurer')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchPurchases = async () => {
    setLoading(true)
    try {
      // One unfiltered fetch so every event/status shows (tabs split client-side).
      // Rejected tickets are stored as payment_status=cancelled (not "rejected").
      const allRes = await fetch('/api/tickets/purchase')
      if (allRes.ok) {
        const data = await allRes.json()
        const all = data.purchases || []
        setPendingPurchases(all.filter((p: any) => p.payment_status === 'pending'))
        setApprovedPurchases(all.filter((p: any) => p.payment_status === 'paid'))
        setRejectedPurchases(
          all.filter((p: any) =>
            ['cancelled', 'rejected', 'refunded'].includes(p.payment_status)
          )
        )
      } else {
        let details = ''
        try {
          const errBody = await allRes.json()
          details = errBody.details || errBody.error || ''
        } catch {
          /* ignore */
        }
        console.error('Ticket list API failed:', allRes.status, details)
        setPendingPurchases([])
        setApprovedPurchases([])
        setRejectedPurchases([])
        toast.error(
          details
            ? `Failed to load tickets: ${details}`
            : 'Failed to load ticket purchases. Try refresh.'
        )
      }

      const tshirtRes = await fetch('/api/tshirts/approve?status=pending')
      if (tshirtRes.ok) {
        const tshirtData = await tshirtRes.json()
        setPendingTshirts(tshirtData.registrations || [])
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
      toast.error('Failed to load ticket purchases')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveTshirt = async (registrationId: number | string, action: 'approve' | 'reject') => {
    setProcessing(`tshirt-${registrationId}`)
    try {
      const response = await fetch('/api/tshirts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: registrationId, action }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update T-shirt payment')
      }
      toast.success(action === 'approve' ? 'T-shirt payment approved' : 'T-shirt payment rejected')
      setPendingTshirts((prev) => prev.filter((r) => r.id !== registrationId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to update T-shirt payment')
    } finally {
      setProcessing(null)
    }
  }

  const handleApprove = async (purchaseId: number) => {
    setProcessing(purchaseId)
    try {
      const response = await fetch('/api/tickets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchaseId,
          action: 'approve'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve purchase')
      }

      const data = await response.json()
      const shirtNote = data.purchase?.tshirt_wanted
        ? ` T-shirt ${data.purchase.tshirt_size} marked ${data.purchase.tshirt_payment_status}.`
        : ''
      toast.success(`✅ Ticket approved! QR code generated.${shirtNote}`)
      
      // Instant update: Move from pending to approved list
      setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId))
      setApprovedPurchases(prev => [data.purchase, ...prev])
      
      // Background sync
      fetchPurchases()
    } catch (error: any) {
      console.error('Error approving purchase:', error)
      toast.error(error.message || 'Failed to approve purchase')
    } finally {
      setProcessing(null)
    }
  }

  const openRejectModal = (purchase: any) => {
    setSelectedPurchase(purchase)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const openViewModal = async (purchase: any) => {
    setSelectedPurchase(purchase)
    setShowViewModal(true)
    setIsTicketFlipped(false) // Reset flip state when opening modal
    // Lazy-load QR (excluded from list payloads for speed)
    if (purchase?.id && purchase.payment_status === 'paid' && !purchase.qr_code_url) {
      try {
        const res = await fetch(`/api/tickets/purchase/${purchase.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.purchase?.qr_code_url || data.purchase?.payment_proof_url) {
            setSelectedPurchase((prev: any) =>
              prev?.id === purchase.id
                ? {
                    ...prev,
                    qr_code_url: data.purchase.qr_code_url || prev.qr_code_url,
                    payment_proof_url:
                      data.purchase.payment_proof_url || prev.payment_proof_url,
                  }
                : prev
            )
          }
        }
      } catch (error) {
        console.error('Failed to load ticket QR/proof:', error)
      }
    }
  }

  const openRefundModal = (purchase: any) => {
    setSelectedPurchase(purchase)
    setRefundReason('')
    setShowRefundModal(true)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setProcessing(selectedPurchase.id)
    try {
      const response = await fetch('/api/tickets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: selectedPurchase.id,
          action: 'reject',
          rejection_reason: rejectionReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject purchase')
      }

      const data = await response.json()
      toast.success('Purchase rejected')
      
      // Instant update: Move from pending to rejected list
      setPendingPurchases(prev => prev.filter(p => p.id !== selectedPurchase.id))
      setRejectedPurchases(prev => [data.purchase, ...prev])
      
      setShowRejectModal(false)
      setSelectedPurchase(null)
      setRejectionReason('')
      
      // Background sync
      fetchPurchases()
    } catch (error: any) {
      console.error('Error rejecting purchase:', error)
      toast.error(error.message || 'Failed to reject purchase')
    } finally {
      setProcessing(null)
    }
  }

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason')
      return
    }

    setProcessing(selectedPurchase.id)
    try {
      const response = await fetch('/api/tickets/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: selectedPurchase.id,
          refund_reason: refundReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to refund purchase')
      }

      const data = await response.json()
      toast.success('Ticket refunded successfully')
      
      // Instant update: Move from approved to rejected list (refunded appears in rejected tab)
      setApprovedPurchases(prev => prev.filter(p => p.id !== selectedPurchase.id))
      setRejectedPurchases(prev => [data.purchase, ...prev])
      
      // If viewing the refunded purchase in modal, update it
      if (selectedPurchase) {
        setSelectedPurchase(data.purchase)
      }
      
      setShowRefundModal(false)
      setRefundReason('')
      
      // Background sync
      fetchPurchases()
    } catch (error: any) {
      console.error('Error refunding purchase:', error)
      toast.error(error.message || 'Failed to refund purchase')
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteRefundedTicket = async (purchaseId: number) => {
    if (!confirm('Are you sure you want to permanently delete this refunded ticket record? This action cannot be undone.')) {
      return
    }

    setProcessing(purchaseId)
    try {
      const response = await fetch(`/api/tickets/purchase/${purchaseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete refunded ticket')
      }

      toast.success('Refunded ticket record deleted')
      
      // Remove from the rejected list (where refunded tickets are shown)
      setRejectedPurchases(prev => prev.filter(p => p.id !== purchaseId))
      
      // Background sync
      fetchPurchases()
    } catch (error: any) {
      console.error('Error deleting refunded ticket:', error)
      toast.error(error.message || 'Failed to delete refunded ticket')
    } finally {
      setProcessing(null)
    }
  }

  const viewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setShowImageModal(true)
  }

  const openEditGuestModal = (guest: any) => {
    if (!selectedPurchase?.id) return
    setSelectedGuest(guest)
    setGuestEditForm({
      full_name: guest.full_name,
      email: guest.email || '',
      phone: guest.phone || '',
      relationship: guest.relationship || 'friend',
    })
    setShowEditGuestModal(true)
  }

  const handleEditGuest = async () => {
    if (!selectedGuest?.id || !selectedPurchase?.id || !guestEditForm.full_name.trim()) {
      toast.error('Please enter guest name')
      return
    }

    console.log('Editing guest:', {
      guest_id: selectedGuest.id,
      ticket_purchase_id: selectedPurchase.id,
      full_name: guestEditForm.full_name.trim(),
    })

    try {
      const response = await fetch(`/api/tickets/${selectedPurchase.id}/guests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          full_name: guestEditForm.full_name.trim(),
          email: guestEditForm.email.trim() || null,
          phone: guestEditForm.phone.trim() || null,
          relationship: guestEditForm.relationship,
          payment_proof_url: guestEditForm.payment_proof_url || null,
        })
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        toast.success('Guest updated successfully')
        
        // Update the guest in the selectedPurchase state immediately
        if (selectedPurchase?.guests) {
          const updatedGuests = selectedPurchase.guests.map((g: any) => 
            g.id === selectedGuest.id ? data.guest : g
          )
          setSelectedPurchase({
            ...selectedPurchase,
            guests: updatedGuests
          })
        }
        
        setShowEditGuestModal(false)
        setSelectedGuest(null)
        
        // Also refresh the full list in background
        fetchPurchases()
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        toast.error(error.error || 'Failed to update guest')
      }
    } catch (error) {
      console.error('Error updating guest:', error)
      toast.error('Failed to update guest')
    }
  }

  const guestCanBeRefunded = (guest: any) => {
    if (!guest || isGuestRefunded(guest.payment_status)) return false
    // Guests paid with the member ticket are usually paid_online (not plain "paid")
    return ['paid', 'paid_online', 'paid_at_door'].includes(guest.payment_status)
  }

  const openRefundGuestModal = (guest: any) => {
    if (!selectedPurchase?.id) return
    setSelectedGuest(guest)
    // Prefer stored guest amount (ticket + shirt), then catalog ticket price
    const guestPaid = parseFloat(String(guest.amount_paid ?? '')) || 0
    const catalogPrice =
      parseFloat(
        String(
          selectedPurchase.tickets?.price ?? selectedPurchase.unit_price ?? 0
        )
      ) || 0
    setGuestRefundAmount(guestPaid > 0 ? guestPaid : catalogPrice)
    setGuestRefundReason(guest.refund_reason || '')
    setGuestRefundProofUrl(guest.refund_proof_url || '')
    setShowEditGuestModal(false)
    setShowRefundGuestModal(true)
  }

  const uploadGuestRefundProof = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }
    setUploadingGuestRefundProof(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to upload refund proof')
      if (!result.url) throw new Error('Upload did not return a URL')
      setGuestRefundProofUrl(result.url)
      toast.success('Refund proof uploaded')
      return result.url as string
    } catch (error: any) {
      console.error('Refund proof upload failed:', error)
      toast.error(error?.message || 'Failed to upload refund proof')
      return null
    } finally {
      setUploadingGuestRefundProof(false)
    }
  }

  /** Attach / replace refund proof on an already-refunded guest */
  const saveGuestRefundProof = async (guest: any, proofUrl: string) => {
    if (!selectedPurchase?.id || !guest?.id || !proofUrl) return
    try {
      const response = await fetch(`/api/tickets/${selectedPurchase.id}/guests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guest.id,
          refund_proof_url: proofUrl,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to save refund proof')
      }
      const data = await response.json()
      if (selectedPurchase?.guests) {
        setSelectedPurchase({
          ...selectedPurchase,
          guests: selectedPurchase.guests.map((g: any) =>
            g.id === guest.id ? { ...g, ...data.guest } : g
          ),
        })
      }
      toast.success('Refund proof saved')
      fetchPurchases()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save refund proof')
    }
  }

  const handleRefundGuest = async () => {
    if (!selectedGuest?.id || !guestRefundReason.trim()) {
      toast.error('Please provide a refund reason')
      return
    }

    if (uploadingGuestRefundProof) {
      toast.error('Please wait for the refund proof to finish uploading')
      return
    }

    try {
      const response = await fetch('/api/tickets/guests/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          refund_reason: guestRefundReason.trim(),
          refund_amount: guestRefundAmount,
          refund_proof_url: guestRefundProofUrl || null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Guest refunded successfully')
        
        // Update the guest + purchase total in the modal immediately
        if (selectedPurchase?.guests) {
          const updatedGuests = selectedPurchase.guests.map((g: any) => 
            g.id === selectedGuest.id ? data.guest : g
          )
          const prevTotal = parseFloat(String(selectedPurchase.total_price ?? '')) || 0
          const refundedAmt = parseFloat(String(data.guest?.refund_amount ?? guestRefundAmount)) || 0
          setSelectedPurchase({
            ...selectedPurchase,
            guests: updatedGuests,
            total_price:
              prevTotal > 0
                ? Math.max(0, Math.round((prevTotal - refundedAmt) * 100) / 100)
                : selectedPurchase.total_price,
          })
        }
        
        setShowRefundGuestModal(false)
        setSelectedGuest(null)
        setGuestRefundReason('')
        setGuestRefundAmount(0)
        setGuestRefundProofUrl('')
        
        // Also refresh the full list in background
        fetchPurchases()
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        toast.error(error.error || 'Failed to refund guest')
      }
    } catch (error) {
      console.error('Error refunding guest:', error)
      toast.error('Failed to refund guest')
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

  // Calculate stats — prefer stored total_price (includes T-shirt)
  const totalRevenue = approvedPurchases.reduce((sum, p) => {
    const stored = parseFloat(String(p.total_price ?? ''))
    if (stored > 0) return sum + stored
    return sum + (parseFloat(p.tickets?.price || 0) * p.quantity)
  }, 0)
  const totalTicketsSold = approvedPurchases.reduce((sum, p) => sum + p.quantity, 0)
  const uniqueBuyers = new Set(approvedPurchases.map(p => p.user_id)).size

  const renderPurchaseCard = (purchase: any) => {
    const ticketLine = parseFloat(purchase.tickets?.price || purchase.unit_price || 0) * purchase.quantity
    const shirtAmt = purchase.tshirt_wanted
      ? (parseFloat(String(purchase.tshirt_amount ?? 0)) || 0)
      : 0
    const storedTotal = parseFloat(String(purchase.total_price ?? '')) || 0
    const totalAmount = storedTotal > 0 ? storedTotal : ticketLine + shirtAmt
    const isProcessing = processing === purchase.id

    return (
      <div key={purchase.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with status */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{purchase.events?.title}</h3>
            <p className="text-xs text-gray-600 truncate">{purchase.tickets?.name}</p>
          </div>
          <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            purchase.payment_status === 'pending' 
              ? 'bg-yellow-100 text-yellow-800'
              : purchase.payment_status === 'approved'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {purchase.payment_status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Member & Amount */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Member</p>
              <p className="font-medium text-gray-900 text-sm truncate">
                {purchase.users?.full_name}
              </p>
              <p className="text-xs text-gray-600 truncate">{purchase.users?.email}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500 mb-0.5">Amount</p>
              <p className="font-bold text-gray-900 text-lg">¥{totalAmount.toFixed(2)}</p>
              {purchase.tshirt_wanted && shirtAmt > 0 && (
                <p className="text-[10px] text-gray-500">
                  Ticket ¥{ticketLine.toFixed(2)} + Shirt ¥{shirtAmt.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-y border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
              <p className="text-sm font-medium text-gray-900">{purchase.quantity} ticket(s)</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Payment Method</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{purchase.payment_method}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500 mb-0.5">Purchase Date</p>
              <p className="text-sm text-gray-700">{formatDateTime(purchase.created_at)}</p>
            </div>
            {purchase.tshirt_wanted && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-500 mb-0.5">T-shirt</p>
                <p className="text-sm font-medium text-indigo-800">
                  Size {purchase.tshirt_size || '?'} ·{' '}
                  {formatTshirtPaymentStatus(purchase.tshirt_payment_status)}
                  {shirtAmt > 0 ? ` · ¥${shirtAmt.toFixed(2)}` : ''}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="bg-blue-50 border-l-2 border-blue-400 rounded px-3 py-2">
              <p className="text-xs text-blue-700 font-medium mb-0.5">💬 Member Notes</p>
              <p className="text-xs text-blue-900">{purchase.notes}</p>
            </div>
          )}

          {purchase.rejection_reason && (
            <div className="bg-red-50 border-l-2 border-red-400 rounded px-3 py-2">
              <p className="text-xs text-red-700 font-medium mb-0.5">❌ Rejection Reason</p>
              <p className="text-xs text-red-900">{purchase.rejection_reason}</p>
            </div>
          )}

          {/* Payment Screenshot */}
          {purchase.payment_proof_url && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-700">💳 Payment Screenshot</p>
                <button
                  onClick={() => viewImage(purchase.payment_proof_url)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Full Size
                </button>
              </div>
              <div 
                className="relative group cursor-pointer rounded-md overflow-hidden border border-gray-200 hover:border-purple-400 transition-all"
                onClick={() => viewImage(purchase.payment_proof_url)}
              >
                <img
                  src={purchase.payment_proof_url}
                  alt="Payment proof"
                  className="w-full h-48 sm:h-56 object-contain bg-gray-50"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all">
                  <div className="bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {purchase.payment_status === 'pending' && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => handleApprove(purchase.id)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Approve
                </>
              )}
            </button>
            <button
              onClick={() => openRejectModal(purchase)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject
            </button>
          </div>
        )}

        {purchase.payment_status === 'approved' && (
          <div className="bg-green-50 px-4 py-3 border-t border-green-100 flex items-center justify-between">
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium">
                Approved on {formatDateTime(purchase.approved_at)}
              </span>
            </div>
            <SimpleGuestManagementModal
              eventId={purchase.event_id}
              eventTitle={purchase.events?.title}
              eventType={purchase.events?.event_type || 'ticket_only'}
              ticketPurchaseId={purchase.id}
              ticketNumber={purchase.ticket_number}
              memberName={purchase.users?.full_name}
              maxGuests={purchase.events?.max_total_guests_per_member || 0}
              doorGuestPrice={purchase.tickets?.price || purchase.unit_price || purchase.events?.door_guest_price || 0}
              allowDoorAddition={purchase.events?.allow_door_guest_addition !== false}
              allowAfterPurchase={purchase.events?.allow_guest_addition_after_purchase !== false}
              isAdmin={true}
              isSecretary={true}
              onGuestClick={(guest) => {
                setSelectedPurchase(purchase)
                setSelectedGuest(guest)
                setGuestEditForm({
                  full_name: guest.full_name,
                  email: guest.email || '',
                  phone: guest.phone || '',
                  relationship: guest.relationship || 'friend',
                  payment_proof_url: guest.payment_proof_url || '',
                })
                setShowEditGuestModal(true)
              }}
              trigger={
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Guests
                </button>
              }
            />
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    )
  }

  const currentPurchases = 
    activeTab === 'tshirts' ? [] :
    activeTab === 'pending' ? pendingPurchases :
    activeTab === 'approved' ? approvedPurchases :
    activeTab === 'refunds' ? rejectedPurchases.filter(p => p.payment_status === 'refunded') :
    rejectedPurchases

  // Sort by newest first (descending order)
  const sortedPurchases = [...currentPurchases].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Filter by search query
  const filteredPurchases = sortedPurchases.filter(purchase => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const eventTitle = purchase.events?.title?.toLowerCase() || ''
    const ticketName = purchase.tickets?.name?.toLowerCase() || ''
    const memberName = `${purchase.users?.full_name || ''}`.toLowerCase()
    const memberEmail = purchase.users?.email?.toLowerCase() || ''
    const memberPhone = (purchase.users?.phone_number || purchase.users?.phone || '').toLowerCase()
    const paymentMethod = purchase.payment_method?.toLowerCase() || ''
    
    // Use actual ticket_number field for search
    const searchableTicketNumber = getSearchableTicketNumber(purchase.ticket_number, purchase.id).toLowerCase()
    const formattedTicket = formatOrGenerateTicketNumber(
      purchase.ticket_number, 
      purchase.events?.title,
      purchase.events?.event_date,
      purchase.id
    ).toLowerCase()
    
    // Check guests for this purchase
    const hasMatchingGuest = purchase.guests?.some((guest: any) => 
      guest.full_name?.toLowerCase().includes(query) ||
      guest.email?.toLowerCase().includes(query) ||
      guest.phone?.toLowerCase().includes(query)
    ) || false
    
    return eventTitle.includes(query) || 
           ticketName.includes(query) || 
           memberName.includes(query) || 
           memberEmail.includes(query) ||
           memberPhone.includes(query) ||
           paymentMethod.includes(query) ||
           searchableTicketNumber.includes(query) ||
           formattedTicket.includes(query) ||
           hasMatchingGuest
  })

  // Pagination
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex)

  // Reset to page 1 when changing tabs or searching
  const handleTabChange = (tab: 'pending' | 'approved' | 'rejected' | 'refunds' | 'tshirts') => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchQuery('')
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎫 Ticket Approvals</h1>
          <p className="text-gray-600 mt-1">Review and manage ticket purchases</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingPurchases.length}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <Loader2 className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalTicketsSold}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <Ticket className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">¥{totalRevenue.toFixed(0)}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Buyers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{uniqueBuyers}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Generate QR Codes Button */}
        <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 rounded-full p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Regenerate All QR Codes</h3>
                <p className="text-sm text-gray-600 mt-1">Update ticket numbers and regenerate QR codes for all approved tickets</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!confirm('This will regenerate QR codes for ALL approved tickets with the new format. Continue?')) return
                
                setIsGeneratingQR(true)
                try {
                  const response = await fetch('/api/tickets/regenerate-qr', {
                    method: 'POST'
                  })
                  
                  if (response.ok) {
                    const data = await response.json()
                    toast.success(`✅ Regenerated ${data.updated} QR codes!`)
                    fetchPurchases()
                  } else {
                    const error = await response.json()
                    toast.error(error.error || 'Failed to regenerate QR codes')
                  }
                } catch (error) {
                  console.error('Error:', error)
                  toast.error('Failed to regenerate QR codes')
                } finally {
                  setIsGeneratingQR(false)
                }
              }}
              disabled={isGeneratingQR}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold transition-all shadow-md hover:shadow-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingQR ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('pending')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Pending ({pendingPurchases.length})
            </button>
            <button
              onClick={() => handleTabChange('approved')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'approved'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Approved ({approvedPurchases.length})
            </button>
            <button
              onClick={() => handleTabChange('refunds')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'refunds'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Refunds ({rejectedPurchases.filter(p => p.payment_status === 'refunded').length})
              </span>
            </button>
            <button
              onClick={() => handleTabChange('rejected')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'rejected'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Rejected ({rejectedPurchases.filter(p => p.payment_status !== 'refunded').length})
            </button>
            <button
              onClick={() => handleTabChange('tshirts')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'tshirts'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              T-shirts ({pendingTshirts.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {currentPurchases.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by member, guest, ticket number, event, or payment method..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredPurchases.length} result{filteredPurchases.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Refunded Guests Section - Only show on Refunds tab */}
        {activeTab === 'refunds' && (() => {
          // Collect all refunded guests from all purchases
          const allRefundedGuests: Array<{guest: any, purchase: any}> = []
          
          approvedPurchases.forEach(purchase => {
            if (purchase.guests) {
              purchase.guests.forEach((guest: any) => {
                if (guest.payment_status === 'refunded') {
                  allRefundedGuests.push({ guest, purchase })
                }
              })
            }
          })
          
          rejectedPurchases.forEach(purchase => {
            if (purchase.guests) {
              purchase.guests.forEach((guest: any) => {
                if (guest.payment_status === 'refunded') {
                  allRefundedGuests.push({ guest, purchase })
                }
              })
            }
          })

          if (allRefundedGuests.length > 0) {
            // Extract unique years, months, and events for filters
            const years = Array.from(new Set(allRefundedGuests.map(({ guest }) => {
              if (guest.refunded_at) {
                return new Date(guest.refunded_at).getFullYear().toString()
              }
              return null
            }).filter(Boolean))).sort((a: any, b: any) => b - a)

            const months = [
              { value: '0', label: 'January' },
              { value: '1', label: 'February' },
              { value: '2', label: 'March' },
              { value: '3', label: 'April' },
              { value: '4', label: 'May' },
              { value: '5', label: 'June' },
              { value: '6', label: 'July' },
              { value: '7', label: 'August' },
              { value: '8', label: 'September' },
              { value: '9', label: 'October' },
              { value: '10', label: 'November' },
              { value: '11', label: 'December' },
            ]

            const events = Array.from(new Set(allRefundedGuests.map(({ purchase }) => 
              purchase.events?.title
            ).filter(Boolean))).sort()

            // Apply filters
            const filteredGuests = allRefundedGuests.filter(({ guest, purchase }) => {
              const refundDate = guest.refunded_at ? new Date(guest.refunded_at) : null
              
              // Year filter
              if (refundFilters.year !== 'all' && refundDate) {
                if (refundDate.getFullYear().toString() !== refundFilters.year) {
                  return false
                }
              }
              
              // Month filter
              if (refundFilters.month !== 'all' && refundDate) {
                if (refundDate.getMonth().toString() !== refundFilters.month) {
                  return false
                }
              }
              
              // Event filter
              if (refundFilters.event !== 'all') {
                if (purchase.events?.title !== refundFilters.event) {
                  return false
                }
              }
              
              // Search filter
              if (refundFilters.search.trim()) {
                const searchLower = refundFilters.search.toLowerCase()
                const guestName = guest.full_name?.toLowerCase() || ''
                const guestEmail = guest.email?.toLowerCase() || ''
                const guestPhone = guest.phone?.toLowerCase() || ''
                const eventTitle = purchase.events?.title?.toLowerCase() || ''
                const ticketHolder = purchase.users?.full_name?.toLowerCase() || ''
                const refundReason = guest.refund_reason?.toLowerCase() || ''
                
                return guestName.includes(searchLower) ||
                       guestEmail.includes(searchLower) ||
                       guestPhone.includes(searchLower) ||
                       eventTitle.includes(searchLower) ||
                       ticketHolder.includes(searchLower) ||
                       refundReason.includes(searchLower)
              }
              
              return true
            })

            // Calculate total refund amount
            const totalRefundAmount = filteredGuests.reduce((sum, { guest }) => {
              return sum + (guest.refund_amount || guest.amount_paid || 0)
            }, 0)

            return (
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#00205B] to-[#003d7a] px-6 py-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white rounded-full p-2">
                        <svg className="w-6 h-6 text-[#00205B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Refunded Guests</h3>
                        <p className="text-blue-100 text-sm">Individual guests who received refunds</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-blue-100 text-sm">Total Refunded</p>
                        <p className="text-2xl font-bold text-white">¥{totalRefundAmount.toFixed(2)}</p>
                      </div>
                      <div className="bg-white text-[#00205B] px-4 py-2 rounded-lg font-bold text-xl shadow-lg">
                        {filteredGuests.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
                      <input
                        type="text"
                        value={refundFilters.search}
                        onChange={(e) => setRefundFilters({...refundFilters, search: e.target.value})}
                        placeholder="Name, event, reason..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00205B] focus:border-[#00205B]"
                      />
                    </div>

                    {/* Year Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                      <select
                        value={refundFilters.year}
                        onChange={(e) => setRefundFilters({...refundFilters, year: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00205B] focus:border-[#00205B]"
                      >
                        <option value="all">All Years</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Month Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Month</label>
                      <select
                        value={refundFilters.month}
                        onChange={(e) => setRefundFilters({...refundFilters, month: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00205B] focus:border-[#00205B]"
                      >
                        <option value="all">All Months</option>
                        {months.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Event Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Event</label>
                      <select
                        value={refundFilters.event}
                        onChange={(e) => setRefundFilters({...refundFilters, event: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00205B] focus:border-[#00205B]"
                      >
                        <option value="all">All Events</option>
                        {events.map((event: any) => (
                          <option key={event} value={event}>{event}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 flex items-center justify-between">
                    {/* Clear Filters */}
                    {(refundFilters.year !== 'all' || refundFilters.month !== 'all' || refundFilters.event !== 'all' || refundFilters.search.trim()) ? (
                      <button
                        onClick={() => setRefundFilters({ year: 'all', month: 'all', event: 'all', search: '' })}
                        className="text-sm text-[#00205B] hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear all filters
                      </button>
                    ) : <div></div>}

                    {/* Export Button */}
                    <button
                      onClick={() => {
                        const csvContent = [
                          ['Guest Name', 'Event', 'Ticket Holder', 'Contact', 'Refund Reason', 'Amount', 'Refund Date'],
                          ...filteredGuests.map(({ guest, purchase }) => [
                            guest.full_name || '',
                            purchase.events?.title || '',
                            purchase.users?.full_name || '',
                            guest.email || guest.phone || '',
                            guest.refund_reason || '',
                            (guest.refund_amount || guest.amount_paid || 0).toFixed(2),
                            guest.refunded_at ? new Date(guest.refunded_at).toLocaleString() : ''
                          ])
                        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                        
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        link.setAttribute('href', url)
                        link.setAttribute('download', `refunded_guests_${new Date().toISOString().split('T')[0]}.csv`)
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        toast.success(`Exported ${filteredGuests.length} refunded guests`)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00205B] text-white rounded-lg hover:bg-[#003d7a] transition-colors text-sm font-semibold shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to CSV ({filteredGuests.length})
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Guest</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Event</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ticket Holder</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Refund Reason</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredGuests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-500">
                              <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                              <p className="text-sm font-medium">No refunded guests found</p>
                              <p className="text-xs mt-1">Try adjusting your filters</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredGuests.map(({ guest, purchase }, index) => (
                          <tr key={`guest-${guest.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-[#00205B] bg-opacity-10 rounded-full flex items-center justify-center border-2 border-[#00205B]">
                                  <span className="text-[#00205B] font-bold text-sm">
                                    {guest.full_name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-semibold text-gray-900">{guest.full_name}</p>
                                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                    REFUNDED
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                {purchase.events?.title || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {purchase.events?.event_date ? new Date(purchase.events.event_date).toLocaleDateString() : ''}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900">{purchase.users?.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">{purchase.users?.email || ''}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700 truncate max-w-xs">
                                {guest.email || guest.phone || 'N/A'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700 italic max-w-xs truncate" title={guest.refund_reason}>
                                "{guest.refund_reason || 'No reason provided'}"
                              </p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-bold text-orange-600">
                                ¥{(guest.refund_amount || guest.amount_paid || 0).toFixed(2)}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900">
                                {guest.refunded_at ? new Date(guest.refunded_at).toLocaleDateString() : 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {guest.refunded_at ? new Date(guest.refunded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer with stats */}
                {filteredGuests.length > 0 && (
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{filteredGuests.length}</span> of{' '}
                        <span className="font-semibold text-gray-900">{allRefundedGuests.length}</span> refunded guests
                      </p>
                      <p className="text-gray-700">
                        Total: <span className="font-bold text-orange-600">¥{totalRefundAmount.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          }
          return null
        })()}

        {activeTab === 'tshirts' && (
          <div className="space-y-4">
            {pendingTshirts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm text-gray-500">
                No pending T-shirt payments
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingTshirts.map((reg) => (
                  <div key={reg.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{reg.event?.title}</p>
                        <p className="text-sm text-gray-700">{reg.user?.full_name}</p>
                        <p className="text-xs text-gray-500">{reg.user?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ¥{Number(reg.tshirt_amount_paid || reg.event?.tshirt_price || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-indigo-700">Size {reg.tshirt_size || '?'}</p>
                      </div>
                    </div>
                    {reg.tshirt_payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => viewImage(reg.tshirt_payment_proof_url)}
                        className="text-xs text-purple-600 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View payment proof
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={processing === `tshirt-${reg.id}`}
                        onClick={() => handleApproveTshirt(reg.id, 'approve')}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={processing === `tshirt-${reg.id}`}
                        onClick={() => handleApproveTshirt(reg.id, 'reject')}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Purchases List */}
        {activeTab !== 'tshirts' && filteredPurchases.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="max-w-sm mx-auto">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No results found' : `No ${activeTab} purchases`}
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? `No purchases match "${searchQuery}". Try a different search term.`
                  : activeTab === 'pending' 
                    ? 'All caught up! No purchases waiting for approval.' 
                    : `No ${activeTab} ticket purchases found.`
                }
              </p>
            </div>
          </div>
        ) : activeTab !== 'tshirts' ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
              <p>
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {filteredPurchases.length === 0
                    ? 0
                    : `${startIndex + 1}–${Math.min(endIndex, filteredPurchases.length)}`}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{filteredPurchases.length}</span>{' '}
                {activeTab} purchase{filteredPurchases.length === 1 ? '' : 's'}
                {searchQuery ? ` matching “${searchQuery}”` : ''}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="text-purple-700 underline"
                >
                  Clear search
                </button>
              )}
            </div>
            {/* Table View */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Event/Ticket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedPurchases.map((purchase) => {
                      const ticketLine = parseFloat(purchase.tickets?.price || purchase.unit_price || 0) * purchase.quantity
                      const shirtAmt = purchase.tshirt_wanted
                        ? (parseFloat(String(purchase.tshirt_amount ?? 0)) || 0)
                        : 0
                      const storedTotal = parseFloat(String(purchase.total_price ?? '')) || 0
                      const totalAmount = storedTotal > 0 ? storedTotal : ticketLine + shirtAmt
                      const isProcessing = processing === purchase.id
                      
                      return (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          {/* Event/Ticket */}
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {purchase.events?.title || `Event #${purchase.event_id || '—'}`}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {purchase.tickets?.name || 'Ticket'}
                              </p>
                              {purchase.tshirt_wanted && (
                                <p className="text-xs text-indigo-700">
                                  T-shirt {purchase.tshirt_size} (
                                  {formatTshirtPaymentStatus(purchase.tshirt_payment_status)})
                                </p>
                              )}
                            </div>
                          </td>
                          
                          {/* Member */}
                          <td className="px-4 py-3">
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-900 truncate">
                                {purchase.users?.full_name}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{purchase.users?.email}</p>
                            </div>
                          </td>
                          
                          {/* Quantity */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{purchase.quantity}</span>
                          </td>
                          
                          {/* Amount */}
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900">¥{totalAmount.toFixed(2)}</span>
                          </td>
                          
                          {/* Payment Method + Screenshot */}
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm capitalize text-gray-900">{purchase.payment_method}</p>
                              {purchase.payment_proof_url && (
                                <button
                                  onClick={() => viewImage(purchase.payment_proof_url)}
                                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center mt-0.5"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Screenshot
                                </button>
                              )}
                            </div>
                          </td>
                          
                          {/* Date */}
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{formatDateTime(purchase.created_at)}</span>
                          </td>
                          
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              purchase.payment_status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : purchase.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : purchase.payment_status === 'refunded'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {purchase.payment_status?.toUpperCase()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            {purchase.payment_status === 'pending' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleApprove(purchase.id)}
                                  disabled={isProcessing}
                                  className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openRejectModal(purchase)}
                                  disabled={isProcessing}
                                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : purchase.payment_status === 'paid' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openViewModal(purchase)}
                                  className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <SimpleGuestManagementModal
                                  eventId={purchase.event_id}
                                  eventTitle={purchase.events?.title}
                                  eventType={purchase.events?.event_type || 'ticket_only'}
                                  ticketPurchaseId={purchase.id}
                                  ticketNumber={purchase.ticket_number}
                                  memberName={purchase.users?.full_name}
                                  maxGuests={purchase.events?.max_total_guests_per_member || 0}
                                  doorGuestPrice={purchase.tickets?.price || purchase.unit_price || purchase.events?.door_guest_price || 0}
                                  allowDoorAddition={purchase.events?.allow_door_guest_addition !== false}
                                  allowAfterPurchase={purchase.events?.allow_guest_addition_after_purchase !== false}
                                  isAdmin={true}
                                  isSecretary={true}
                                  onGuestClick={(guest) => {
                                    setSelectedPurchase(purchase)
                                    setSelectedGuest(guest)
                                    setGuestEditForm({
                                      full_name: guest.full_name,
                                      email: guest.email || '',
                                      phone: guest.phone || '',
                                      relationship: (guest.relationship as any) || 'friend',
                                      payment_proof_url: guest.payment_proof_url || '',
                                    })
                                    setGuestRefundAmount(guest.amount_paid || 0)
                                    setShowEditGuestModal(true)
                                  }}
                                  trigger={
                                    <button
                                      className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                      title="Manage Guests"
                                    >
                                      <Users className="w-4 h-4" />
                                    </button>
                                  }
                                />
                                <button
                                  onClick={() => openRefundModal(purchase)}
                                  disabled={isProcessing}
                                  className="p-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Refund Ticket"
                                >
                                  {isProcessing && processing === purchase.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ) : purchase.payment_status === 'refunded' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openViewModal(purchase)}
                                  className="p-1.5 bg-orange-600 text-white rounded hover:bg-orange-700"
                                  title="View Refund Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRefundedTicket(purchase.id)}
                                  disabled={isProcessing}
                                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete Refund Record"
                                >
                                  {isProcessing && processing === purchase.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ) : purchase.payment_status === 'rejected' || purchase.payment_status === 'cancelled' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openViewModal(purchase)}
                                  className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center text-gray-400">
                                <span className="text-xs">-</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Cards Section - Below Table */}
            {paginatedPurchases.some((p: any) => p.payment_status === 'refunded') && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Refunded Tickets Details
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event & Attendee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refunded At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Purchase Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedPurchases.filter((p: any) => p.payment_status === 'refunded').map((purchase: any) => {
                        const totalAmount = parseFloat(purchase.tickets?.price || 0) * purchase.quantity
                        const isProcessing = processing === purchase.id
                        
                        return (
                          <tr key={`refund-row-${purchase.id}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{purchase.events?.title || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{purchase.users?.full_name || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {purchase.rejection_reason || 'No reason provided'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {purchase.refunded_at ? formatDateTime(purchase.refunded_at) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDateTime(purchase.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-mono text-gray-900">
                                {formatOrGenerateTicketNumber(
                                  purchase.ticket_number,
                                  purchase.events?.title,
                                  purchase.events?.event_date,
                                  purchase.id
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                              ¥{totalAmount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openViewModal(purchase)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Details"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRefundedTicket(purchase.id)}
                                  disabled={isProcessing}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete Record"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredPurchases.length)} of {filteredPurchases.length} purchases
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          currentPage === page
                            ? 'bg-purple-600 text-white'
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
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Reject Purchase</h2>
              <p className="text-sm text-gray-600 mt-1">Provide a clear reason for rejection</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ The member will see your rejection reason. Please be specific and helpful.
                </p>
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Example: Payment amount doesn't match the ticket price. Expected ¥200 but screenshot shows ¥180. Please verify and resubmit."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                autoFocus
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || processing === selectedPurchase?.id}
                  className="flex-1 bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow"
                >
                  {processing === selectedPurchase?.id ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Rejecting...
                    </span>
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedPurchase(null)
                    setRejectionReason('')
                  }}
                  disabled={processing === selectedPurchase?.id}
                  className="px-5 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - Full Screen */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowImageModal(false)}
        >
          <div className="max-w-6xl max-h-[95vh] overflow-auto">
            <img
              src={selectedImage}
              alt="Payment proof full size"
              className="w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-3 transition-all shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
            Click anywhere to close
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedPurchase && (() => {
        const guestList = Array.isArray(selectedPurchase.guests) ? selectedPurchase.guests : []
        const storedTotal = parseFloat(String(selectedPurchase.total_price ?? '')) || 0
        const ticketLine =
          (parseFloat(String(selectedPurchase.tickets?.price || selectedPurchase.unit_price || 0)) || 0) *
          (selectedPurchase.quantity || 1)
        const shirtLine = selectedPurchase.tshirt_wanted
          ? parseFloat(String(selectedPurchase.tshirt_amount ?? 0)) || 0
          : 0
        const guestLine = guestList.reduce(
          (sum: number, g: any) => sum + (parseFloat(String(g.amount_paid ?? 0)) || 0),
          0
        )
        const displayTotal = storedTotal > 0 ? storedTotal : ticketLine + shirtLine + guestLine

        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Purchase Details</h2>
              <p className="text-xs text-gray-600">Complete ticket purchase information</p>
            </div>
            
            {/* Two Column Layout - No external scroll */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
              {/* LEFT SIDE - Ticket Card with Flip */}
              <div className="space-y-3 overflow-y-auto pr-2">
                {/* Flippable Ticket Card */}
                <div 
                  className="relative cursor-pointer"
                  style={{ perspective: '1000px', minHeight: '300px' }}
                  onClick={() => setIsTicketFlipped(!isTicketFlipped)}
                >
                  <div 
                    className="relative w-full transition-transform duration-700"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isTicketFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* FRONT - Ticket Card */}
                    <div 
                      className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg p-4 text-white shadow-lg"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="text-xs opacity-75 mb-1">EVENT TICKET</p>
                          <h3 className="text-lg font-bold mb-0.5 line-clamp-1">{selectedPurchase.events?.title}</h3>
                          <p className="text-sm opacity-90 line-clamp-1">{selectedPurchase.tickets?.name}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          selectedPurchase.payment_status === 'paid' ? 'bg-green-500' :
                          selectedPurchase.payment_status === 'pending' ? 'bg-yellow-500 text-gray-900' :
                          selectedPurchase.payment_status === 'refunded' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}>
                          {selectedPurchase.payment_status?.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="border-t border-white/20 pt-3 mb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs opacity-75 mb-1">Attendee</p>
                            <p className="text-sm font-semibold">{selectedPurchase.users?.full_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75 mb-1">Party</p>
                            <p className="text-sm font-semibold">
                              {selectedPurchase.quantity} Ticket
                              {selectedPurchase.quantity > 1 ? 's' : ''}
                              {guestList.length > 0
                                ? ` + ${guestList.length} Guest${guestList.length > 1 ? 's' : ''}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        {guestList.length > 0 && (
                          <p className="mt-2 text-xs opacity-80 line-clamp-2">
                            Guests:{' '}
                            {guestList
                              .map((g: any) => g.full_name)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="border-t border-white/20 pt-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs opacity-75">Total Amount</p>
                            <p className="text-2xl font-bold">¥{displayTotal.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs opacity-75">Ticket No.</p>
                            <p className="text-lg font-bold font-mono tracking-wider">
                              {formatOrGenerateTicketNumber(
                                selectedPurchase.ticket_number,
                                selectedPurchase.events?.title,
                                selectedPurchase.events?.event_date,
                                selectedPurchase.id
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-white/20 pt-2 mt-2">
                        <p className="text-xs opacity-75">
                          Purchased: {new Date(selectedPurchase.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      {/* Tap to flip indicator */}
                      <div className="absolute bottom-2 right-2 text-xs opacity-50 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Tap to flip</span>
                      </div>
                    </div>

                    {/* BACK - QR Code */}
                    <div 
                      className="absolute top-0 left-0 w-full bg-white rounded-lg p-6 shadow-lg flex flex-col items-center justify-center"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        minHeight: '300px'
                      }}
                    >
                      <p className="text-sm font-semibold text-gray-700 mb-4">Scan QR Code</p>
                      {selectedPurchase.qr_code_url ? (
                        <img
                          src={selectedPurchase.qr_code_url}
                          alt="QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                          <p className="text-sm text-gray-500">No QR Code</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-4">
                        {formatOrGenerateTicketNumber(
                          selectedPurchase.ticket_number,
                          selectedPurchase.events?.title,
                          selectedPurchase.events?.event_date,
                          selectedPurchase.id
                        )}
                      </p>
                      {guestList.length > 0 && (
                        <p className="mt-2 text-center text-[11px] text-gray-500 max-w-xs">
                          Member check-in QR. Guests ({guestList.length}) are listed on this purchase
                          and checked in under this ticket — they do not have a separate QR.
                        </p>
                      )}
                      
                      {/* Tap to flip back indicator */}
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Tap to flip back</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Screenshot - Compact */}
                {selectedPurchase.payment_proof_url && (
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Payment Screenshot</p>
                    <img
                      src={selectedPurchase.payment_proof_url}
                      alt="Payment proof"
                      className="w-full h-40 object-cover rounded cursor-pointer hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewImage(selectedPurchase.payment_proof_url)
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Click to enlarge</p>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE - Detailed Information */}
              <div className="space-y-3 overflow-y-auto pr-2">
                {/* Member Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Member Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Full Name</p>
                      <p className="font-semibold text-gray-900">{selectedPurchase.users?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email Address</p>
                      <p className="text-sm text-gray-700">{selectedPurchase.users?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payment Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Method</span>
                      <span className="font-semibold text-gray-900 capitalize">{selectedPurchase.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`font-semibold uppercase text-sm ${
                        selectedPurchase.payment_status === 'paid' ? 'text-green-600' :
                        selectedPurchase.payment_status === 'pending' ? 'text-yellow-600' :
                        selectedPurchase.payment_status === 'refunded' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {selectedPurchase.payment_status}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Purchase Date</span>
                        <span className="text-sm font-medium text-gray-900">{formatDateTime(selectedPurchase.created_at)}</span>
                      </div>
                      {selectedPurchase.paid_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Approved Date</span>
                          <span className="text-sm font-medium text-gray-900">{formatDateTime(selectedPurchase.paid_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guest Information */}
                {selectedPurchase.guests && selectedPurchase.guests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Guest Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Total Guests</span>
                        <span className="text-sm font-bold text-gray-900">{selectedPurchase.guests.length}</span>
                      </div>
                      {selectedPurchase.guests.map((guest: any, index: number) => {
                        console.log('Guest:', guest)
                        return (
                          <div key={index} className="bg-white rounded-md p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">{guest.full_name}</span>
                            {guest.payment_status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                guest.payment_status === 'waived' || guest.payment_status === 'complimentary' || guest.payment_status === 'paid_online' || guest.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : guest.payment_status === 'refunded' ? 'bg-orange-100 text-orange-700'
                                  : guest.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {guest.payment_status.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs">
                            {guest.email && (
                              <div className="flex items-center text-gray-600">
                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {guest.email}
                              </div>
                            )}
                            {guest.phone && (
                              <div className="flex items-center text-gray-600">
                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {guest.phone}
                              </div>
                            )}
                            {guest.relationship && (
                              <div className="flex items-center text-gray-500">
                                <span className="text-gray-400 mr-1.5">•</span>
                                {guest.relationship}
                              </div>
                            )}
                            {guest.payment_status === 'paid' && guest.amount_paid && (
                              <div className="flex flex-col text-green-600 mt-1 pt-1 border-t border-gray-100">
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-[10px] font-semibold">Paid ¥{guest.amount_paid}</span>
                                </div>
                                {guest.amount_paid > 0 && (
                                  <span className="text-[9px] text-green-500">
                                    {guest.created_at && (
                                      `on ${new Date(guest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(guest.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                            {guest.payment_status === 'refunded' && (
                              <div className="flex flex-col text-orange-600 mt-1 pt-1 border-t border-gray-100">
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 mr-1.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  <span className="text-[10px] font-semibold">Refunded ¥{guest.refund_amount || guest.amount_paid}</span>
                                </div>
                                {guest.refunded_at && (
                                  <span className="text-[9px] text-orange-500">
                                    on {new Date(guest.refunded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(guest.refunded_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {guest.refund_reason && (
                                  <span className="text-[9px] text-orange-600 mt-1">
                                    Reason: {guest.refund_reason}
                                  </span>
                                )}
                                {guest.refund_proof_url ? (
                                  <div className="mt-2">
                                    <p className="text-[10px] text-orange-700 font-medium mb-1">Refund Proof:</p>
                                    <div
                                      className="cursor-pointer rounded border border-orange-200 overflow-hidden hover:border-orange-400 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        viewImage(guest.refund_proof_url)
                                      }}
                                    >
                                      <img
                                        src={guest.refund_proof_url}
                                        alt={`${guest.full_name} refund proof`}
                                        className="w-full h-24 object-cover"
                                      />
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-1">Click to enlarge</p>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    <label className="text-[10px] text-orange-700 font-medium block mb-1">
                                      Upload refund proof
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="w-full text-[10px] file:mr-2 file:rounded file:border-0 file:bg-orange-50 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-orange-800"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const url = await uploadGuestRefundProof(file)
                                        if (url) await saveGuestRefundProof(guest, url)
                                        e.target.value = ''
                                      }}
                                      disabled={uploadingGuestRefundProof}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Guest Payment Proof */}
                            {guest.payment_proof_url && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-[10px] text-gray-600 font-medium mb-1">Payment Proof:</p>
                                <div 
                                  className="cursor-pointer rounded border border-gray-200 overflow-hidden hover:border-blue-400 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    viewImage(guest.payment_proof_url)
                                  }}
                                >
                                  <img
                                    src={guest.payment_proof_url}
                                    alt={`${guest.full_name} payment proof`}
                                    className="w-full h-24 object-cover"
                                  />
                                </div>
                                <p className="text-[9px] text-gray-500 mt-1">Click to enlarge</p>
                              </div>
                            )}
                            {/* Payment Notes */}
                            {guest.payment_notes && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-[10px] text-gray-600 font-medium">Payment Notes:</p>
                                <p className="text-[10px] text-gray-700 mt-0.5 bg-blue-50 rounded px-2 py-1">
                                  {guest.payment_notes}
                                </p>
                              </div>
                            )}
                            {/* Action buttons for guest */}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log('Edit clicked for guest:', guest)
                                    openEditGuestModal(guest)
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center hover:underline"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit Guest
                                </button>
                                {guestCanBeRefunded(guest) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openRefundGuestModal(guest)
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center hover:underline"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    Refund Guest
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Member Notes */}
                {selectedPurchase.notes && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Member Notes
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedPurchase.notes}</p>
                    </div>
                  </div>
                )}

                {/* Rejection/Refund Reason */}
                {selectedPurchase.rejection_reason && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {selectedPurchase.payment_status === 'refunded' ? 'Refund Reason' : 'Rejection Reason'}
                    </h3>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedPurchase.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex-shrink-0">
              <div className="flex gap-3">
                {/* Refund Member Ticket Button - Only show for paid/approved tickets */}
                {selectedPurchase.payment_status === 'paid' && (
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      openRefundModal(selectedPurchase)
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition-colors text-sm flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Refund Member
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedPurchase(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Edit Guest Modal */}
      {showEditGuestModal && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Edit Guest</h2>
              <p className="text-sm text-gray-600 mt-1">Update guest information</p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN - Guest Details Form */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-2">Guest Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      value={guestEditForm.full_name}
                      onChange={(e) => setGuestEditForm({ ...guestEditForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="text"
                      value={guestEditForm.email}
                      onChange={(e) => setGuestEditForm({ ...guestEditForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="guest@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={guestEditForm.phone}
                      onChange={(e) => setGuestEditForm({ ...guestEditForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+86 138 0013 8000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship
                    </label>
                    <select
                      value={guestEditForm.relationship}
                      onChange={(e) => setGuestEditForm({ ...guestEditForm, relationship: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="friend">Friend</option>
                      <option value="family">Family</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Payment Proof Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Proof
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // Convert to base64
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setGuestEditForm({ ...guestEditForm, payment_proof_url: reader.result as string })
                            toast.success('Image uploaded')
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload payment or refund proof screenshot</p>
                    
                    {/* Image Preview */}
                    {(guestEditForm.payment_proof_url || selectedGuest.payment_proof_url) && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                        <div 
                          className="relative cursor-pointer rounded-lg overflow-hidden border-2 border-purple-300 hover:border-purple-500 transition-all"
                          onClick={() => viewImage(guestEditForm.payment_proof_url || selectedGuest.payment_proof_url)}
                        >
                          <img
                            src={guestEditForm.payment_proof_url || selectedGuest.payment_proof_url}
                            alt="Payment proof preview"
                            className="w-full h-40 object-contain bg-gray-50"
                          />
                          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                            Click to enlarge
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN - Payment Information & Proofs */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 border-b pb-2">Payment Information</h3>
                  
                  {/* Payment Status Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Current Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Status:</span>
                        <span className={`font-bold ${
                          selectedGuest.payment_status === 'paid' || selectedGuest.payment_status === 'paid_at_door' || selectedGuest.payment_status === 'paid_online' ? 'text-green-600' :
                          selectedGuest.payment_status === 'pending' ? 'text-yellow-600' :
                          selectedGuest.payment_status === 'refunded' ? 'text-orange-600' :
                          selectedGuest.payment_status === 'complimentary' ? 'text-purple-600' :
                          'text-gray-600'
                        }`}>
                          {selectedGuest.payment_status === 'paid' || selectedGuest.payment_status === 'paid_at_door' || selectedGuest.payment_status === 'paid_online' ? '✓ Paid' :
                           selectedGuest.payment_status === 'pending' ? '⏳ Pending' :
                           selectedGuest.payment_status === 'refunded' ? '↩ Refunded' :
                           selectedGuest.payment_status === 'complimentary' ? '🎁 Complimentary' :
                           'No Status'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Amount:</span>
                        <span className="font-bold text-gray-900">¥{selectedGuest.amount_paid || 0}</span>
                      </div>
                      {selectedGuest.payment_method && (
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">Method:</span>
                          <span className="font-medium capitalize text-gray-900">{selectedGuest.payment_method.replace('_', ' ')}</span>
                        </div>
                      )}
                      {selectedGuest.payment_notes && (
                        <div className="pt-2 border-t border-blue-200">
                          <span className="text-xs text-blue-700 font-medium">Payment Notes:</span>
                          <p className="text-xs text-gray-700 mt-1 bg-white rounded px-2 py-1">{selectedGuest.payment_notes}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t border-blue-200 space-y-1">
                        {selectedGuest.created_at && (
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-600">Guest Added:</span>
                            <span className="font-medium text-gray-700">{formatDateTime(selectedGuest.created_at)}</span>
                          </div>
                        )}
                        {selectedGuest.updated_at && selectedGuest.updated_at !== selectedGuest.created_at && (
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-600">Last Updated:</span>
                            <span className="font-medium text-gray-700">{formatDateTime(selectedGuest.updated_at)}</span>
                          </div>
                        )}
                        {selectedGuest.refunded_at && (
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-600">Refunded:</span>
                            <span className="font-medium text-gray-700">{formatDateTime(selectedGuest.refunded_at)}</span>
                          </div>
                        )}
                      </div>
                      {selectedGuest.refund_reason && (
                        <div className="pt-2 border-t border-blue-200">
                          <span className="text-xs text-orange-700 font-medium">Refund Reason:</span>
                          <p className="text-xs text-gray-700 mt-1 bg-white rounded px-2 py-1">{selectedGuest.refund_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              {/* All Action Buttons in One Row */}
              <div className="flex gap-2">
                {/* Refund Button - Orange, for paid / paid_online / paid_at_door guests */}
                {guestCanBeRefunded(selectedGuest) && (
                  <button
                    onClick={() => openRefundGuestModal(selectedGuest)}
                    style={{
                      backgroundColor: '#FF5722',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E64A19'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
                  >
                    ↩ Refund
                  </button>
                )}

                {/* Mark as Paid Button - Green, only for unpaid/pending guests */}
                {['pending', 'unpaid', null, undefined, ''].includes(
                  selectedGuest.payment_status
                ) && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/tickets/${selectedPurchase.id}/guests`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            guest_id: selectedGuest.id,
                            payment_status: 'paid_at_door',
                            amount_paid: selectedGuest.amount_paid || doorGuestPrice
                          })
                        })
                        if (response.ok) {
                          toast.success('Guest marked as paid!')
                          setShowEditGuestModal(false)
                          fetchPurchases()
                        }
                      } catch (error) {
                        toast.error('Failed to update payment')
                      }
                    }}
                    style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
                  >
                    ✓ Mark as Paid
                  </button>
                )}

                {/* Cancel Button - Gray */}
                <button
                  onClick={() => {
                    setShowEditGuestModal(false)
                    setSelectedGuest(null)
                  }}
                  style={{
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                >
                  Cancel
                </button>

                {/* Save Changes Button - Purple, takes remaining space */}
                <button
                  onClick={handleEditGuest}
                  style={{
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    flex: '1',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7B1FA2'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#9C27B0'}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Guest Modal */}
      {showRefundGuestModal && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Refund Guest</h2>
              <p className="text-sm text-gray-600 mt-1">Process refund for guest payment</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Guest Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">{selectedGuest.full_name}</p>
                <div className="space-y-1 text-xs text-gray-600">
                  {selectedGuest.email && <p>Email: {selectedGuest.email}</p>}
                  {selectedGuest.phone && <p>Phone: {selectedGuest.phone}</p>}
                  <p className="font-semibold text-green-700 mt-2">
                    Amount Paid: ¥{selectedGuest.amount_paid || guestRefundAmount || 0}
                  </p>
                  <p className="text-[11px] text-gray-500 capitalize">
                    Status: {(selectedGuest.payment_status || '').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    value={guestRefundAmount}
                    onChange={(e) => setGuestRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: ¥{selectedGuest.amount_paid || guestRefundAmount || 0} (guest share of the payment)
                </p>
              </div>

              {/* Refund Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Reason *
                </label>
                <textarea
                  value={guestRefundReason}
                  onChange={(e) => setGuestRefundReason(e.target.value)}
                  rows={3}
                  placeholder="Example: Guest unable to attend due to emergency. Full refund issued."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Refund Proof */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Proof (receipt / transfer screenshot)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingGuestRefundProof}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadGuestRefundProof(file)
                  }}
                  className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-red-700"
                />
                {uploadingGuestRefundProof && (
                  <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                  </p>
                )}
                {guestRefundProofUrl && !uploadingGuestRefundProof && (
                  <div className="relative mt-2 h-32 overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                    <img
                      src={guestRefundProofUrl}
                      alt="Refund proof"
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setGuestRefundProofUrl('')}
                      className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Optional now — you can also upload it later on the guest card.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ This will mark the guest as refunded. The member will see this in their ticket details.
                </p>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowRefundGuestModal(false)
                  setSelectedGuest(null)
                  setGuestRefundReason('')
                  setGuestRefundAmount(0)
                  setGuestRefundProofUrl('')
                }}
                className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundGuest}
                disabled={!guestRefundReason.trim() || uploadingGuestRefundProof}
                className="flex-1 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Refund Ticket</h2>
              <p className="text-sm text-gray-600 mt-1">This will cancel the ticket and mark it for refund</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Purchase Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700"><strong>Event:</strong> {selectedPurchase.events?.title}</p>
                <p className="text-sm text-gray-700"><strong>Member:</strong> {selectedPurchase.users?.full_name}</p>
                <p className="text-sm text-gray-700"><strong>Amount:</strong> ¥{(parseFloat(selectedPurchase.tickets?.price || 0) * selectedPurchase.quantity).toFixed(2)}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  ⚠️ This action will cancel the ticket. Please provide a reason for the refund.
                </p>
              </div>

              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
                placeholder="Example: Event cancelled. Full refund will be processed within 5-7 business days."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                autoFocus
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRefund}
                  disabled={!refundReason.trim() || processing === selectedPurchase?.id}
                  className="flex-1 bg-orange-600 text-white px-5 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow"
                >
                  {processing === selectedPurchase?.id ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    'Confirm Refund'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRefundModal(false)
                    setSelectedPurchase(null)
                    setRefundReason('')
                  }}
                  disabled={processing === selectedPurchase?.id}
                  className="px-5 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Generation Modal */}
      {showQRGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            {/* Header */}
            <div className="bg-gray-900 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-full p-3 shadow-lg">
                  <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Generate QR Codes</h2>
                  <p className="text-sm text-gray-300 mt-1">Batch QR code creation</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Info Box */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-3">What will happen:</h3>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <span className="text-gray-600 mr-3 mt-0.5">•</span>
                        <p className="text-sm text-gray-700">Find all approved tickets without QR codes</p>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-600 mr-3 mt-0.5">•</span>
                        <p className="text-sm text-gray-700">Generate unique QR codes for each ticket</p>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-600 mr-3 mt-0.5">•</span>
                        <p className="text-sm text-gray-700">Save QR codes to database automatically</p>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-600 mr-3 mt-0.5">•</span>
                        <p className="text-sm text-gray-700">Process completes in a few seconds</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Note */}
              <div className="bg-gray-50 rounded-lg p-5">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Safe operation</p>
                    <p className="text-sm text-gray-700">Only generates QR codes for tickets that don't have them yet. Existing QR codes won't be affected.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-8 py-6 rounded-b-2xl flex gap-4">
              <button
                onClick={async () => {
                  setIsGeneratingQR(true)
                  try {
                    const response = await fetch('/api/tickets/generate-qr', { method: 'POST' })
                    const data = await response.json()
                    if (response.ok) {
                      if (data.success > 0) {
                        toast.success(`✅ Generated ${data.success} QR code${data.success > 1 ? 's' : ''}!`, { duration: 5000 })
                        fetchPurchases()
                      } else {
                        toast('ℹ️ No tickets needed QR codes', { duration: 3000 })
                      }
                    } else {
                      toast.error(data.error || 'Failed to generate QR codes')
                    }
                  } catch (error) {
                    toast.error('Error generating QR codes')
                  } finally {
                    setIsGeneratingQR(false)
                    setShowQRGenerateModal(false)
                  }
                }}
                disabled={isGeneratingQR}
                className="flex-1 bg-gray-900 text-white px-6 py-4 rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
              >
                {isGeneratingQR ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Generate QR Codes</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowQRGenerateModal(false)}
                disabled={isGeneratingQR}
                className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}