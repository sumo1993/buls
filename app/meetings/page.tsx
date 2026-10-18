'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Calendar, 
  Video, 
  MapPin, 
  Loader2,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MeetingsPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const meetingsPerPage = 10
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (userId) {
      fetchMeetings()
    }
  }, [userId])

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/meetings')
      
      if (!response.ok) {
        throw new Error('Failed to load meetings')
      }

      const result = await response.json()
      
      // Filter only public meetings for members and sort newest to oldest
      const publicMeetings = result.meetings
        ?.filter((m: any) => m.is_public !== false)
        .sort((a: any, b: any) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()) || []
      
      setMeetings(publicMeetings)
    } catch (error) {
      console.error('Error fetching meetings:', error)
      toast.error('Failed to load meetings')
    } finally {
      setLoading(false)
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

  const isPastMeeting = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  // Pagination
  const indexOfLastMeeting = currentPage * meetingsPerPage
  const indexOfFirstMeeting = indexOfLastMeeting - meetingsPerPage
  const currentMeetings = meetings.slice(indexOfFirstMeeting, indexOfLastMeeting)
  const totalPages = Math.ceil(meetings.length / meetingsPerPage)

  if (loading) {
    return (
      <DashboardLayout userRole={user?.role}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600 mt-1">View all upcoming and past meetings</p>
        </div>

        {/* Meetings Table */}
        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No meetings scheduled</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for new meetings</p>
          </div>
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Location / Link</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMeetings.map((meeting) => {
                    const isPast = isPastMeeting(meeting.meeting_date)
                    const descriptionLimit = 80
                    const needsReadMore = meeting.description && meeting.description.length > descriptionLimit
                    const isExpanded = expandedDescriptions[meeting.id] || false
                    
                    return (
                      <tr key={meeting.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isPast ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{meeting.title}</span>
                        </td>
                        <td className="py-3 px-4">
                          {meeting.description ? (
                            <div className="text-sm text-gray-600">
                              {needsReadMore && !isExpanded ? (
                                <>
                                  {meeting.description.substring(0, descriptionLimit)}...
                                  <button
                                    onClick={() => setExpandedDescriptions(prev => ({ ...prev, [meeting.id]: true }))}
                                    className="text-blue-600 hover:text-blue-700 ml-1 font-medium"
                                  >
                                    Read More
                                  </button>
                                </>
                              ) : (
                                <>
                                  {meeting.description}
                                  {needsReadMore && (
                                    <button
                                      onClick={() => setExpandedDescriptions(prev => ({ ...prev, [meeting.id]: false }))}
                                      className="text-blue-600 hover:text-blue-700 ml-1 font-medium"
                                    >
                                      Show Less
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm text-gray-700">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDateTime(meeting.meeting_date)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {meeting.meeting_type === 'zoom' && (
                            <div className="flex items-center text-sm">
                              <Video className="w-4 h-4 mr-1 text-blue-600" />
                              <span className="text-blue-600 font-medium">Online</span>
                            </div>
                          )}
                          {meeting.meeting_type === 'hybrid' && (
                            <div className="flex items-center text-sm">
                              <Video className="w-4 h-4 mr-1 text-purple-600" />
                              <MapPin className="w-4 h-4 mr-1 text-purple-600" />
                              <span className="text-purple-600 font-medium">Hybrid</span>
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
                            <div className="space-y-1">
                              <a
                                href={meeting.zoom_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:underline text-sm font-medium"
                              >
                                <Video className="w-4 h-4 mr-1" />
                                Join Meeting
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                              {meeting.zoom_meeting_id && (
                                <p className="text-xs text-gray-500">ID: {meeting.zoom_meeting_id}</p>
                              )}
                            </div>
                          ) : meeting.location ? (
                            <span className="text-sm text-gray-600">{meeting.location}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isPast ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              Upcoming
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meetings.length > meetingsPerPage && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstMeeting + 1} to {Math.min(indexOfLastMeeting, meetings.length)} of {meetings.length} meetings
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
    </DashboardLayout>
  )
}
