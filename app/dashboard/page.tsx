'use client'

import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Loader2, 
  CreditCard, 
  Banknote, 
  Calendar, 
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface DashboardData {
  user: any
  profile: any
  payments: any[]
  loans: any[]
  meetings: any[]
  events: any[]
  announcements: any[]
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      const role = (clerkUser.publicMetadata?.role as string) || 'member'
      // Embassy staff use the consular desk — not the member dashboard
      if (role === 'embassy') {
        router.replace('/embassy/desk')
        return
      }

      // Use Clerk data directly for UI
      setUser({
        clerk_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        full_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.emailAddresses[0]?.emailAddress,
        role,
        status: (clerkUser.publicMetadata?.status as string) || 'active'
      })
      
      // Fetch dashboard data
      fetchDashboardData()
    }
  }, [isLoaded, isSignedIn, clerkUser, router])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-data', {
        // Increased timeout to 10 seconds
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        console.error('Dashboard data fetch failed:', response.status)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn('Dashboard data request timed out - continuing with limited data')
        // Set empty data to still show the page
        setDashboardData({
          user: null,
          payments: [],
          loans: [],
          events: [],
          announcements: []
        })
      } else {
        console.error('Failed to fetch dashboard data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <DashboardLayout userRole="member">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isSignedIn) {
    return (
      <DashboardLayout userRole="member">
        <div className="p-8">
          <p>Please sign in to access the dashboard.</p>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate statistics
  const totalPayments = dashboardData?.payments?.length || 0
  const totalLoans = dashboardData?.loans?.length || 0
  const activeLoans = dashboardData?.loans?.filter((loan: any) => loan.status === 'approved').length || 0
  const upcomingMeetings = dashboardData?.meetings?.length || 0
  const upcomingEvents = dashboardData?.events?.length || 0
  const recentAnnouncements = dashboardData?.announcements?.length || 0

  return (
    <DashboardLayout userRole={user?.role || 'member'}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || clerkUser?.fullName || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your account
          </p>
        </div>

        {/* Overview Cards — Status card hidden for regular members */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
            user?.role && user.role !== 'member' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          }`}
        >
          {/* Total Payments Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-blue-600">{totalPayments}</p>
                <p className="text-xs text-gray-500 mt-1">All time payments</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Active Loans Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold text-green-600">{activeLoans}</p>
                <p className="text-xs text-gray-500 mt-1">{totalLoans} total loans</p>
              </div>
              <Banknote className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Upcoming Events Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Events</p>
                <p className="text-2xl font-bold text-purple-600">{upcomingEvents}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Membership Status — staff roles only */}
          {user?.role && user.role !== 'member' && (
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-2xl font-bold text-red-600 capitalize">{user?.status || 'Active'}</p>
                  <p className="text-xs text-gray-500 mt-1">{user.role} role</p>
                </div>
                <CheckCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Meetings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Meetings</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            {upcomingMeetings > 0 ? (
              <div className="space-y-3">
                {dashboardData?.meetings?.map((meeting: any) => (
                  <div key={meeting.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 hover:shadow-md transition-all border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">{meeting.title}</p>
                        {meeting.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{meeting.description}</p>
                        )}
                        <div className="flex items-center mt-3 space-x-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                            {new Date(meeting.meeting_date).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                          {meeting.meeting_type === 'zoom' && meeting.zoom_link && (
                            <a
                              href={meeting.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
                            >
                              Join Zoom
                            </a>
                          )}
                          {meeting.meeting_type === 'hybrid' && meeting.zoom_link && (
                            <a
                              href={meeting.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full hover:bg-purple-700 transition-colors"
                            >
                              Join Online
                            </a>
                          )}
                          {(meeting.meeting_type === 'in_person' || meeting.meeting_type === 'hybrid') && meeting.location && (
                            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                              📍 {meeting.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No upcoming meetings</p>
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Announcements</h2>
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            {recentAnnouncements > 0 ? (
              <div className="space-y-3">
                {dashboardData?.announcements?.slice(0, 3).map((announcement: any) => (
                  <div key={announcement.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <p className="font-medium text-gray-900">{announcement.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No announcements</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            {upcomingEvents > 0 ? (
              <div className="space-y-3">
                {dashboardData?.events?.slice(0, 3).map((event: any) => (
                  <div key={event.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
