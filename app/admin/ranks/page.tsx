'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Plus, Edit, Trash2, Users, Award } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ManageRanksPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [ranks, setRanks] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRank, setEditingRank] = useState<any>(null)
  const [formData, setFormData] = useState({
    rank_name: '',
    rank_level: 10,
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ranksPerPage = 6

  useEffect(() => {
    if (userId) {
      checkAccessAndFetchData()
    }
  }, [userId])

  const checkAccessAndFetchData = async () => {
    if (!userId) return

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      // Fetch user and check permissions
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      if (userError || !userData) {
        toast.error('Access denied')
        router.push('/dashboard')
        return
      }

      setUser(userData)

      // Only admin and secretary can manage ranks
      if (userData.role !== 'admin' && userData.role !== 'secretary') {
        toast.error('Only Admin and Secretary can manage union ranks')
        router.push('/dashboard')
        return
      }

      // Fetch all ranks
      const { data: ranksData, error: ranksError } = await supabase
        .from('union_ranks')
        .select('*')
        .order('rank_level', { ascending: false })

      if (ranksError) {
        console.error('Error fetching ranks:', ranksError)
        toast.error('Failed to load ranks')
      } else {
        setRanks(ranksData || [])
      }

    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const createRank = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.rank_name.trim()) {
      toast.error('Rank name is required')
      return
    }

    setSubmitting(true)

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('union_ranks')
        .insert({
          rank_name: formData.rank_name,
          rank_level: formData.rank_level,
          description: formData.description,
          created_by: user.id
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('A rank with this name already exists')
        } else {
          throw error
        }
        return
      }

      toast.success('Rank created successfully!')
      setShowCreateModal(false)
      setFormData({ rank_name: '', rank_level: 10, description: '' })
      checkAccessAndFetchData()

    } catch (error) {
      console.error('Error creating rank:', error)
      toast.error('Failed to create rank')
    } finally {
      setSubmitting(false)
    }
  }

  const updateRank = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingRank || !formData.rank_name.trim()) {
      toast.error('Rank name is required')
      return
    }

    setSubmitting(true)

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('union_ranks')
        .update({
          rank_name: formData.rank_name,
          rank_level: formData.rank_level,
          description: formData.description
        })
        .eq('id', editingRank.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('A rank with this name already exists')
        } else {
          throw error
        }
        return
      }

      toast.success('Rank updated successfully!')
      setEditingRank(null)
      setFormData({ rank_name: '', rank_level: 10, description: '' })
      checkAccessAndFetchData()

    } catch (error) {
      console.error('Error updating rank:', error)
      toast.error('Failed to update rank')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteRank = async (rankId: string, rankName: string) => {
    // Check if any users have this rank
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { data: usersWithRank, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('union_rank_id', rankId)
        .limit(1)

      if (checkError) throw checkError

      if (usersWithRank && usersWithRank.length > 0) {
        toast.error('Cannot delete rank: Members are currently assigned to this rank')
        return
      }

      if (!confirm(`Are you sure you want to delete the "${rankName}" rank?`)) {
        return
      }

      const { error } = await supabase
        .from('union_ranks')
        .delete()
        .eq('id', rankId)

      if (error) throw error

      toast.success('Rank deleted successfully!')
      checkAccessAndFetchData()

    } catch (error) {
      console.error('Error deleting rank:', error)
      toast.error('Failed to delete rank')
    }
  }

  const openEditModal = (rank: any) => {
    setEditingRank(rank)
    setFormData({
      rank_name: rank.rank_name,
      rank_level: rank.rank_level,
      description: rank.description || ''
    })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Union Ranks</h1>
            <p className="text-gray-600">Create and manage union positions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Rank</span>
          </button>
        </div>

        {/* Ranks List */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <Award className="w-5 h-5 mr-2" />
              <span>Union Ranks (by hierarchy)</span>
            </div>
            {ranks.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ranksPerPage) + 1} to {Math.min(currentPage * ranksPerPage, ranks.length)} of {ranks.length} ranks
              </div>
            )}
          </div>

          {ranks.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No ranks created yet</p>
              <p className="text-gray-500">Create your first union rank</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {ranks
                  .slice((currentPage - 1) * ranksPerPage, currentPage * ranksPerPage)
                  .map((rank, index) => {
                    const actualIndex = (currentPage - 1) * ranksPerPage + index + 1
                    return (
                      <div 
                        key={rank.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D62828] text-white font-bold">
                            {actualIndex}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-lg">{rank.rank_name}</h3>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Level: {rank.rank_level}
                              </span>
                            </div>
                            {rank.description && (
                              <p className="text-sm text-gray-600 mt-1">{rank.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(rank.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(rank)}
                            className="btn-outline flex items-center space-x-1"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          
                          {!['President', 'Vice President', 'Treasurer', 'Finance Secretary', 'General Secretary', 'Secretary', 'Member'].includes(rank.rank_name) && (
                            <button
                              onClick={() => deleteRank(rank.id, rank.rank_name)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Pagination */}
              {ranks.length > ranksPerPage && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(ranks.length / ranksPerPage) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-[#D62828] text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(ranks.length / ranksPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(ranks.length / ranksPerPage)}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Rank Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Award className="w-6 h-6 mr-2 text-[#D62828]" />
              Create New Rank
            </h2>

            <form onSubmit={createRank} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rank Name *
                </label>
                <input
                  type="text"
                  value={formData.rank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_name: e.target.value }))}
                  placeholder="e.g., Assistant Secretary"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rank Level (Higher = More Authority)
                </label>
                <input
                  type="number"
                  value={formData.rank_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_level: parseInt(e.target.value) }))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  President=100, VP=90, Treasurer=80, Secretary=60, Member=10
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this position's responsibilities..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? 'Creating...' : 'Create Rank'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({ rank_name: '', rank_level: 10, description: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rank Modal */}
      {editingRank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Rank</h2>

            <form onSubmit={updateRank} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rank Name *
                </label>
                <input
                  type="text"
                  value={formData.rank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rank Level
                </label>
                <input
                  type="number"
                  value={formData.rank_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_level: parseInt(e.target.value) }))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? 'Updating...' : 'Update Rank'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRank(null)
                    setFormData({ rank_name: '', rank_level: 10, description: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
