'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, ArrowLeft, TrendingUp, Users, DollarSign, Star, Award } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EventAnalyticsPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [overallAnalytics, setOverallAnalytics] = useState<any>(null)

  useEffect(() => {
    if (userId) {
      fetchAnalytics()
    }
  }, [userId, eventId])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      if (eventId) {
        // Fetch single event analytics
        const response = await fetch(`/api/events/${eventId}/analytics`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data.analytics)
        }
      } else {
        // Fetch overall analytics
        const response = await fetch('/api/events/analytics')
        if (response.ok) {
          const data = await response.json()
          setOverallAnalytics(data)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
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

  // Single Event Analytics View
  if (eventId && analytics) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Event Analytics</h1>

          {/* Event Info */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900">{analytics.title}</h2>
            <p className="text-gray-600 mt-1">{new Date(analytics.event_date).toLocaleDateString()}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${
              analytics.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              analytics.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
              analytics.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {analytics.status}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Registered</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.registration_count}</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Attendance Rate</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.attendance_rate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">¥{analytics.total_revenue}</p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.average_rating || 'N/A'}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Registration Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Registration Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Confirmed</span>
                  <span className="font-medium">{analytics.confirmed_registrations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waitlist</span>
                  <span className="font-medium">{analytics.waitlist_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets Sold</span>
                  <span className="font-medium">{analytics.total_tickets_sold}</span>
                </div>
                {analytics.capacity && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity</span>
                    <span className="font-medium">{analytics.capacity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Feedback</span>
                  <span className="font-medium">{analytics.feedback_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Rating</span>
                  <span className="font-medium flex items-center">
                    {analytics.average_rating ? (
                      <>
                        <span className="text-yellow-500 mr-1">⭐</span>
                        {analytics.average_rating}
                      </>
                    ) : (
                      'No ratings yet'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Certificates Issued</span>
                  <span className="font-medium">{analytics.certificates_issued}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Overall Analytics View
  if (overallAnalytics) {
    const summary = overallAnalytics.summary
    const byStatus = overallAnalytics.events_by_status

    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Overall Event Analytics</h1>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_events}</p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Attendees</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_registrations}</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">¥{summary.total_revenue}</p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Attendance</p>
                  <p className="text-2xl font-bold text-green-600">{summary.avg_attendance_rate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Events by Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Events by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {byStatus.map((status: any) => (
                <div key={status.status} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                  <p className="text-sm text-gray-600 capitalize mt-1">{status.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Events */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Events</h3>
            <div className="space-y-3">
              {overallAnalytics.top_events?.map((event: any, index: number) => (
                <div key={event.event_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.registration_count} attendees</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">¥{event.total_revenue}</p>
                    <p className="text-sm text-gray-600">{event.attendance_rate}% attended</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    </DashboardLayout>
  )
}
