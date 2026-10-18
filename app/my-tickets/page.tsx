'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Download, Calendar, MapPin, Clock, QrCode, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatOrGenerateTicketNumber } from '@/lib/ticket-utils'
import { SimpleGuestManagementModal } from '@/components/SimpleGuestManagementModal'

export default function MyTicketsPage() {
  const { userId } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showQRView, setShowQRView] = useState<{[key: string]: boolean}>({}) // Track which tickets show QR vs details
  const [enlargedQR, setEnlargedQR] = useState<string | null>(null) // Track which QR is enlarged
  
  // Guest management state
  const [showGuestModal, setShowGuestModal] = useState<{[key: string]: boolean}>({})
  const [guestCounts, setGuestCounts] = useState<{[key: string]: number}>({})

  useEffect(() => {
    if (userId) {
      fetchUser()
      fetchMyPurchases()
    }
  }, [userId])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchMyPurchases = async () => {
    setLoading(true)
    try {
      console.log('Fetching purchases...')
      const response = await fetch('/api/tickets/purchase')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Purchases data:', data)
        const fetchedPurchases = data.purchases || []
        setPurchases(fetchedPurchases)
        
        // Initialize QR view state - show QR code by default for all tickets
        const initialQRView: {[key: string]: boolean} = {}
        fetchedPurchases.forEach((p: any) => {
          initialQRView[p.id] = true // true = show QR code, false = show details
        })
        setShowQRView(initialQRView)
        
        // Load guest counts for each paid purchase
        const paidPurchases = fetchedPurchases.filter((p: any) => p.payment_status === 'paid')
        for (const purchase of paidPurchases) {
          await loadGuestCount(purchase.id)
        }
        
        // Auto-generate QR codes for paid tickets without QR codes
        const paidWithoutQR = fetchedPurchases.filter(
          (p: any) => p.payment_status === 'paid' && !p.qr_code_url
        )
        
        if (paidWithoutQR.length > 0) {
          console.log(`🔄 Auto-generating ${paidWithoutQR.length} missing QR codes...`)
          
          // Generate QR codes in parallel
          const generatePromises = paidWithoutQR.map((purchase: any) =>
            fetch('/api/tickets/generate-my-qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ purchase_id: purchase.id })
            })
              .then(res => res.json())
              .then(data => {
                if (data.qr_code_url) {
                  console.log(`✅ Generated QR for ticket ${purchase.id}`)
                  return { id: purchase.id, qr_code_url: data.qr_code_url }
                }
                return null
              })
              .catch(err => {
                console.error(`❌ Failed to generate QR for ${purchase.id}:`, err)
                return null
              })
          )
          
          const results = await Promise.all(generatePromises)
          const successful = results.filter(r => r !== null)
          
          if (successful.length > 0) {
            // Update purchases with new QR codes
            setPurchases(prev => prev.map(p => {
              const updated = successful.find(s => s && s.id === p.id)
              return updated ? { ...p, qr_code_url: updated.qr_code_url } : p
            }))
            
            toast.success(`✅ Generated ${successful.length} QR code${successful.length > 1 ? 's' : ''}!`)
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error response:', errorData)
        console.error('Response status:', response.status, response.statusText)
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}` || 'Failed to load your tickets'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
      toast.error('Failed to load your tickets')
    } finally {
      setLoading(false)
    }
  }

  // Load guest count for a specific purchase
  const loadGuestCount = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/tickets/${purchaseId}/guests`)
      if (response.ok) {
        const data = await response.json()
        setGuestCounts(prev => ({
          ...prev,
          [purchaseId]: data.guests?.length || 0
        }))
      }
    } catch (error) {
      console.error(`Error loading guest count for purchase ${purchaseId}:`, error)
    }
  }

  // Handle guest updates
  const handleGuestsUpdated = (purchaseId: string, guests: any[]) => {
    setGuestCounts(prev => ({
      ...prev,
      [purchaseId]: guests.length
    }))
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

  const downloadTicket = (purchase: any) => {
    // Create a simple ticket image with QR code
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 400
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 400)

    // Header
    ctx.fillStyle = '#8b5cf6'
    ctx.fillRect(0, 0, 800, 100)

    // Event title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px Arial'
    ctx.fillText(purchase.events?.title || 'Event Ticket', 20, 55)

    // Ticket type
    ctx.font = '20px Arial'
    ctx.fillText(purchase.tickets?.name || 'Ticket', 20, 85)

    // Body
    ctx.fillStyle = '#000000'
    ctx.font = '18px Arial'
    ctx.fillText(`Attendee: ${user?.full_name}`, 20, 140)
    ctx.fillText(`Quantity: ${purchase.quantity}`, 20, 170)
    ctx.fillText(`Date: ${formatDateTime(purchase.events?.event_date)}`, 20, 200)
    ctx.fillText(`Location: ${purchase.events?.location || 'TBA'}`, 20, 230)

    // QR Code placeholder
    if (purchase.qr_code_url) {
      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 550, 120, 200, 200)
        
        // Download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ticket-${purchase.id}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        })
      }
      qrImg.src = purchase.qr_code_url
    } else {
      // Download without QR
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `ticket-${purchase.id}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    }
  }

  const toggleQRView = (purchaseId: string) => {
    setShowQRView(prev => ({
      ...prev,
      [purchaseId]: !prev[purchaseId]
    }))
  }

  const filteredPurchases = purchases.filter(p => {
    if (activeTab === 'all') return true
    if (activeTab === 'approved') return p.payment_status === 'paid'
    return p.payment_status === activeTab
  })

  const renderPurchaseCard = (purchase: any) => {
    const totalAmount = parseFloat(purchase.tickets?.price || 0) * purchase.quantity
    const isPastEvent = new Date(purchase.events?.event_date) < new Date()

    return (
      <div key={purchase.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{purchase.events?.title}</h3>
            <p className="text-xs text-gray-600 truncate">{purchase.tickets?.name}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
            purchase.payment_status === 'paid' 
              ? 'bg-green-100 text-green-800'
              : purchase.payment_status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {purchase.payment_status === 'paid' ? 'PAID' : purchase.payment_status?.toUpperCase()}
          </span>
        </div>

        <div className="p-3 space-y-2">
          {/* Event Details */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center text-gray-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{new Date(purchase.events?.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {purchase.events?.location && (
              <div className="flex items-start text-gray-700">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs line-clamp-2">{purchase.events.location}</span>
              </div>
            )}
          </div>

          {/* Ticket Info */}
          <div className="flex items-center justify-between py-1.5 border-y border-gray-100 text-xs">
            <div>
              <span className="text-gray-500">Qty</span>
              <span className="ml-1 font-semibold text-gray-900">{purchase.quantity}</span>
            </div>
            <div>
              <span className="text-gray-500">Total</span>
              <span className="ml-1 font-semibold text-gray-900">¥{totalAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Method:</span>
              <span className="ml-1 text-gray-900 capitalize">{purchase.payment_method}</span>
            </div>
          </div>

          {/* Status-specific content */}
          {purchase.payment_status === 'pending' && (
            <div className="bg-gray-50 rounded px-2 py-2">
              <p className="text-xs text-gray-700">⏳ Awaiting approval</p>
            </div>
          )}

          {purchase.payment_status === 'rejected' && (
            <div className="bg-gray-50 rounded px-2 py-2">
              <p className="text-xs font-medium text-gray-900 mb-0.5">Rejected</p>
              <p className="text-xs text-gray-600 line-clamp-2">{purchase.rejection_reason}</p>
            </div>
          )}

          {purchase.payment_status === 'paid' && (
            <>
              {/* QR Section */}
              {purchase.qr_code_url ? (
                <div 
                  className="bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleQRView(purchase.id)}
                >
                  {showQRView[purchase.id] ? (
                    // QR VIEW
                    <div className="py-2 text-center">
                      <div className="bg-white p-2 rounded inline-block border border-gray-200">
                        <img
                          src={purchase.qr_code_url}
                          alt="QR Code"
                          className="w-32 h-32 mx-auto"
                        />
                      </div>
                      <div className="mt-2 text-xs space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEnlargedQR(purchase.qr_code_url)
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium block w-full"
                        >
                          🔍 Enlarge
                        </button>
                        <span className="text-gray-400 block">or tap for info</span>
                      </div>
                    </div>
                  ) : (
                    // INFO VIEW
                    <div className="py-2 px-2 space-y-2">
                      <div className="bg-white rounded p-2 border border-gray-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Attendee</span>
                          <span className="font-medium text-gray-900 truncate ml-2">{user?.full_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Ticket No.</span>
                          <span className="font-mono text-gray-900 text-xs font-semibold">
                            {formatOrGenerateTicketNumber(
                              purchase.ticket_number,
                              purchase.events?.title,
                              purchase.events?.event_date,
                              purchase.id
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {/* Payment Proof */}
                      {purchase.payment_proof_url && (
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1.5">Payment Proof:</p>
                          <img
                            src={purchase.payment_proof_url}
                            alt="Payment Proof"
                            className="w-full rounded border border-gray-200 cursor-pointer hover:opacity-90"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(purchase.payment_proof_url, '_blank')
                            }}
                          />
                          <p className="text-xs text-gray-400 mt-1 text-center">Click to view full size</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 text-center">Tap for QR</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 rounded py-2 px-2 text-center">
                  <p className="text-xs text-yellow-800 mb-1.5">⚠️ Generating QR code...</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Refresh
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓ Approved</span>
                  {purchase.events?.event_type !== 'free' && purchase.payment_status === 'paid' && (
                    <SimpleGuestManagementModal
                      eventId={purchase.event_id}
                      eventTitle={purchase.events?.title}
                      eventType={purchase.events?.event_type || 'ticket_only'}
                      ticketPurchaseId={purchase.id}
                      memberName={user?.full_name}
                      ticketNumber={purchase.ticket_number}
                      maxGuests={purchase.events?.max_total_guests_per_member || 0}
                      doorGuestPrice={purchase.tickets?.price || purchase.unit_price || purchase.events?.door_guest_price || 0}
                      allowDoorAddition={purchase.events?.allow_door_guest_addition !== false}
                      allowAfterPurchase={purchase.events?.allow_guest_addition_after_purchase !== false}
                      isAdmin={user?.role === 'admin'}
                      isSecretary={user?.role === 'secretary'}
                      readonly={false}
                      onGuestsUpdated={(guests) => handleGuestsUpdated(purchase.id, guests)}
                      trigger={
                        <button 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                          style={{
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          <Users className="w-4 h-4" />
                          <span>Guests ({guestCounts[purchase.id] || 0})</span>
                        </button>
                      }
                    />
                  )}
                </div>
                <button
                  onClick={() => downloadTicket(purchase)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download</span>
                </button>
              </div>
            </>
          )}
        </div>
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

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎫 My Tickets</h1>
          <p className="text-gray-600 mt-1">View and manage your event tickets</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'approved'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({purchases.filter(p => p.payment_status === 'paid').length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({purchases.filter(p => p.payment_status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'rejected'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected ({purchases.filter(p => p.payment_status === 'rejected' || p.payment_status === 'cancelled').length})
          </button>
        </div>

        {/* Tickets List */}
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No tickets found</p>
            <p className="text-gray-400 text-sm mt-2">
              {activeTab === 'all' 
                ? 'Purchase tickets from the Events page'
                : `No ${activeTab} tickets`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPurchases.map(renderPurchaseCard)}
          </div>
        )}
      </div>

      {/* Enlarged QR Code Modal */}
      {enlargedQR && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedQR(null)}
        >
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Scan QR Code</h3>
              <div className="bg-gray-50 p-4 rounded-xl inline-block">
                <img
                  src={enlargedQR}
                  alt="Enlarged QR Code"
                  className="w-80 h-80 mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4">Show this at the event entrance</p>
              <button
                onClick={() => setEnlargedQR(null)}
                className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
              >
                Close
              </button>
            </div>
          </div>
          <button
            onClick={() => setEnlargedQR(null)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}
