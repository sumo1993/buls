'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Megaphone, 
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function AnnouncementsPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    try {
      // Fetch user data
      const { supabase } = await import('@/lib/supabase/client-browser')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      if (userError || !userData) {
        throw new Error('Failed to load user data')
      }

      setUser(userData)

      // Fetch announcements via API (works for all users)
      const response = await fetch('/api/announcements')
      if (!response.ok) {
        throw new Error('Failed to fetch announcements')
      }
      
      const result = await response.json()
      setAnnouncements(result.announcements || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Megaphone className="w-8 h-8 mr-3 text-[#D62828]" />
            Announcements
          </h1>
          <p className="text-gray-600">Important updates and notices from BULS Beijing</p>
        </div>

        {/* Announcements List - Clean & Simple */}
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
            <p className="text-gray-600">No active announcements at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <Megaphone className={`w-4 h-4 mt-1 flex-shrink-0 ${
                    announcement.priority === 'urgent' ? 'text-red-600' :
                    announcement.priority === 'high' ? 'text-orange-600' :
                    announcement.priority === 'low' ? 'text-gray-500' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {announcement.title}
                    </h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap mb-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDate(announcement.created_at)}</span>
                      {announcement.expires_at && (
                        <span>Expires: {formatDate(announcement.expires_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
