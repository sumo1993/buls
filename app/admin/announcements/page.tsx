'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  Megaphone, 
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  X,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function AdminAnnouncementsPage() {
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    expires_at: ''
  })

  useEffect(() => {
    console.log('🔵 useEffect - userId:', userId)
    if (userId) {
      fetchData()
    } else {
      console.log('⚠️ Waiting for userId from Clerk...')
    }
  }, [userId])

  const fetchData = async () => {
    console.log('🔵 fetchData called')
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      console.log('🔵 Fetching user data for clerk_id:', userId)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      console.log('🔵 User data result:', { userData, userError })

      if (userError || !userData) {
        console.error('❌ Failed to load user data:', userError)
        throw new Error('Failed to load user data')
      }

      // Check permissions
      console.log('🔵 User role:', userData.role)
      if (!['admin', 'secretary'].includes(userData.role)) {
        console.error('❌ Insufficient permissions. Role:', userData.role)
        toast.error('Insufficient permissions')
        return
      }

      setUser(userData)

      // Fetch all announcements (including expired ones for admin view)
      console.log('🔵 Fetching announcements...')
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('🔵 Announcements result:', { 
        count: announcementsData?.length, 
        error: announcementsError 
      })

      if (announcementsError) throw announcementsError

      setAnnouncements(announcementsData || [])
      console.log('✅ Data fetch completed successfully')
    } catch (error) {
      console.error('💥 Error fetching data:', error)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔵 handleSubmit called')
    
    if (!formData.title || !formData.content) {
      console.log('❌ Validation failed: missing title or content')
      toast.error('Please fill in all required fields')
      return
    }

    // Check if user is authenticated
    if (!userId) {
      console.log('❌ No userId found - user not authenticated')
      toast.error('You must be logged in to create announcements')
      return
    }

    console.log('🔵 User authenticated, userId:', userId)

    setLoading(true)
    try {
      const url = '/api/announcements'
      const method = editingAnnouncement ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        ...(editingAnnouncement && { id: editingAnnouncement.id }),
        expires_at: formData.expires_at || null
      }

      console.log('🔵 About to submit announcement:', { 
        method, 
        url,
        payload,
        userId 
      })

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('🔵 Fetch completed')
      console.log('🔵 Response status:', response.status)
      console.log('🔵 Response ok:', response.ok)

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Server error response:', error)
        throw new Error(error.error || 'Failed to save announcement')
      }

      const result = await response.json()
      console.log('✅ Success result:', result)

      toast.success(editingAnnouncement ? 'Announcement updated!' : 'Announcement created!')
      setShowCreateModal(false)
      setEditingAnnouncement(null)
      setFormData({ title: '', content: '', priority: 'normal', expires_at: '' })
      await fetchData()
    } catch (error: any) {
      console.error('💥 Error saving announcement:', error)
      console.error('💥 Error stack:', error.stack)
      toast.error(error.message || 'Failed to save announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete announcement')
      }

      toast.success('Announcement deleted!')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error('Failed to delete announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
    })
    setShowCreateModal(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const isExpired = (expiresAt: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading && !showCreateModal) {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Megaphone className="w-8 h-8 mr-3 text-[#D62828]" />
              Manage Announcements
            </h1>
            <p className="text-gray-600">Create and manage announcements for BULS Beijing</p>
          </div>
          <button
            onClick={() => {
              setEditingAnnouncement(null)
              setFormData({ title: '', content: '', priority: 'normal', expires_at: '' })
              setShowCreateModal(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Announcement
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-gray-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
          <div className="card bg-green-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">
                {announcements.filter(a => !isExpired(a.expires_at)).length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>
          <div className="card bg-red-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700">
                {announcements.filter(a => a.priority === 'urgent').length}
              </p>
              <p className="text-sm text-gray-600">Urgent</p>
            </div>
          </div>
          <div className="card bg-yellow-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-700">
                {announcements.filter(a => isExpired(a.expires_at)).length}
              </p>
              <p className="text-sm text-gray-600">Expired</p>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="card text-center py-12">
              <Megaphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
              <p className="text-gray-600 mb-4">Create your first announcement to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Announcement
              </button>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`card ${isExpired(announcement.expires_at) ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.toUpperCase()}
                      </span>
                      {isExpired(announcement.expires_at) && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created: {formatDate(announcement.created_at)}
                      </div>
                      {announcement.expires_at && (
                        <div className={isExpired(announcement.expires_at) ? 'text-red-600' : ''}>
                          Expires: {formatDate(announcement.expires_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingAnnouncement(null)
                    setFormData({ title: '', content: '', priority: 'normal', expires_at: '' })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Debug Info */}
                <div className="bg-gray-100 p-3 rounded-lg text-xs space-y-1">
                  <div><strong>Debug Info:</strong></div>
                  <div>• Clerk User ID: {userId || 'Not loaded'}</div>
                  <div>• Database User: {user ? `${user.full_name} (${user.role})` : 'Not loaded'}</div>
                  <div>• Can Submit: {userId && user ? '✅ Yes' : '❌ No'}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input-field"
                    rows={5}
                    placeholder="Enter announcement content"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty for announcements that don't expire
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !userId || !user}
                    className="btn-primary flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        {editingAnnouncement ? 'Update' : 'Create'} Announcement
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingAnnouncement(null)
                      setFormData({ title: '', content: '', priority: 'normal', expires_at: '' })
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
