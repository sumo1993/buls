'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

type TshirtOrder = {
  id: string
  source: 'ticket' | 'guest' | 'registration'
  name: string
  email: string | null
  phone: string | null
  size: string
  payment_label: string
  picked_up: boolean
  host_name: string | null
  ticket_number: string | null
}

export default function EventTshirtOrdersPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [orders, setOrders] = useState<TshirtOrder[]>([])
  const [bySize, setBySize] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!userId || !eventId) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/events/${eventId}/tshirt-orders`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load T-shirt orders')
        setEvent(data.event)
        setOrders(data.orders || [])
        setBySize(data.by_size || {})
      } catch (error: any) {
        toast.error(error.message || 'Failed to load T-shirt orders')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, eventId])

  const sizes = useMemo(() => Object.keys(bySize).sort((a, b) => {
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  }), [bySize])

  const downloadCsv = () => {
    const header = ['Size', 'Name', 'Type', 'Host', 'Phone', 'Email', 'Ticket', 'Shirt payment', 'Picked up']
    const rows = orders.map((o) => [
      o.size,
      o.name,
      o.source === 'guest' ? 'Guest' : o.source === 'ticket' ? 'Ticket member' : 'Registration',
      o.host_name || '',
      o.phone || '',
      o.email || '',
      o.ticket_number || '',
      o.payment_label,
      o.picked_up ? 'Yes' : 'No',
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tshirts-${event?.title || eventId}.csv`.replace(/[^\w.-]+/g, '_')
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl p-6 print:max-w-none print:p-0">
        <div className="mb-6 print:hidden">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">T-shirt orders</h1>
              <p className="mt-1 text-gray-600">{event?.title}</p>
              {event?.event_date && (
                <p className="text-sm text-gray-500">{formatDate(event.event_date)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadCsv}
                disabled={orders.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={orders.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print list
              </button>
            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="mb-4 hidden print:block">
          <h1 className="text-xl font-bold">{event?.title}</h1>
          <p className="text-sm">T-shirt packing list · {orders.length} shirts</p>
        </div>

        {/* Size summary */}
        <div className="mb-6 p-4 print:bg-white">
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Totals by size ({orders.length} shirts)
          </p>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-600">No T-shirt orders for this event yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <span
                  key={size}
                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-900 print:border print:border-gray-400"
                >
                  {size}: {bySize[size]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grouped by size */}
        {sizes.map((size) => {
          const rows = orders.filter((o) => o.size === size)
          return (
            <div key={size} className="mb-8 break-inside-avoid">
              <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-bold text-gray-900">
                Size {size} ({rows.length})
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Phone</th>
                    <th className="py-2 pr-2">Shirt</th>
                    <th className="py-2">Picked up</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o, idx) => (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-gray-500">{idx + 1}</td>
                      <td className="py-2 pr-2 font-medium text-gray-900">
                        {o.name}
                        {o.host_name && (
                          <span className="block text-xs font-normal text-gray-500">
                            Guest of {o.host_name}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 capitalize text-gray-700">
                        {o.source === 'guest' ? 'Guest' : o.source === 'ticket' ? 'Member' : 'Registration'}
                      </td>
                      <td className="py-2 pr-2 text-gray-700">{o.phone || '—'}</td>
                      <td className="py-2 pr-2 text-gray-700">{o.payment_label}</td>
                      <td className="py-2">{o.picked_up ? 'Yes' : '☐'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
