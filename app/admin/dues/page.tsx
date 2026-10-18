'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, DollarSign, Edit, CheckCircle, XCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface DuesStructure {
  id: string
  category_type: string
  category_value: string
  amount: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ManageDuesPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [duesStructures, setDuesStructures] = useState<DuesStructure[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [updating, setUpdating] = useState(false)

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

      // Only admin can manage dues structure
      if (userData.role !== 'admin') {
        toast.error('Only Admin can manage dues structure')
        router.push('/dashboard')
        return
      }

      // Fetch all dues structures
      const { data: duesData, error: duesError } = await supabase
        .from('dues_structure')
        .select('*')
        .order('category_type')
        .order('category_value')

      if (duesError) {
        console.error('Error fetching dues:', duesError)
        toast.error('Failed to load dues structure')
      } else {
        setDuesStructures(duesData || [])
      }

    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (dues: DuesStructure) => {
    setEditingId(dues.id)
    setEditAmount(dues.amount.toString())
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditAmount('')
  }

  const handleSave = async (duesId: string) => {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setUpdating(true)

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('dues_structure')
        .update({
          amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', duesId)

      if (error) throw error

      toast.success('Dues structure updated successfully!')
      handleCancelEdit()
      checkAccessAndFetchData()
    } catch (error) {
      console.error('Error updating dues:', error)
      toast.error('Failed to update dues structure')
    } finally {
      setUpdating(false)
    }
  }

  const toggleActive = async (duesId: string, currentStatus: boolean) => {
    try {
      const { supabase } = await import('@/lib/supabase/client-browser')

      const { error } = await supabase
        .from('dues_structure')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', duesId)

      if (error) throw error

      toast.success(`Dues structure ${!currentStatus ? 'activated' : 'deactivated'}`)
      checkAccessAndFetchData()
    } catch (error) {
      console.error('Error toggling dues:', error)
      toast.error('Failed to update status')
    }
  }

  const formatScholarshipType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
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

  // Group by category type
  const groupedDues = duesStructures.reduce((acc, dues) => {
    if (!acc[dues.category_type]) {
      acc[dues.category_type] = []
    }
    acc[dues.category_type].push(dues)
    return acc
  }, {} as Record<string, DuesStructure[]>)

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Dues Structure</h1>
            <p className="text-gray-600">Configure monthly dues based on scholarship and rank</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 mb-1">How Dues Are Calculated</h3>
              <p className="text-sm text-blue-800">
                Monthly dues are calculated based on <strong>two factors</strong>:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>1. <strong>Scholarship Type</strong> (CSC, Government, Self-support, etc.)</li>
                <li>2. <strong>Union Rank</strong> (Executive vs Regular Member)</li>
              </ul>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Executive positions:</strong> President, VP, Treasurer, Finance Secretary, General Secretary, Secretary (Rank level ≥ 60)
              </p>
            </div>
          </div>
        </div>

        {/* Dues Matrix */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-green-600" />
            Dues Matrix (Scholarship × Rank)
          </h2>

          {Object.keys(groupedDues).length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No dues structure found</p>
              <p className="text-gray-500">Run the migration to set up default dues</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDues).map(([scholarshipType, duesList]) => (
                <div key={scholarshipType} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-bold text-lg">{formatScholarshipType(scholarshipType)}</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {duesList.map((dues) => (
                      <div key={dues.id} className={`p-4 ${!dues.is_active ? 'bg-gray-100' : ''}`}>
                        {editingId === dues.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                                dues.category_type === 'rank' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {dues.category_type === 'rank' ? '👑 Rank' : '📚 Scholarship'}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {dues.category_value}
                              </span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Monthly Amount (¥)
                              </label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828]"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSave(dues.id)}
                                disabled={updating}
                                className="btn-primary text-sm"
                              >
                                {updating ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                                dues.category_type === 'rank' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {dues.category_type === 'rank' ? '👑 Rank' : '📚 Scholarship'}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {dues.category_value}
                              </span>
                              
                              <div>
                                <p className="text-2xl font-bold text-green-600">
                                  ¥{dues.amount.toFixed(2)}
                                  <span className="text-sm text-gray-500 font-normal">/month</span>
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {!dues.is_active && (
                                <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  Inactive
                                </span>
                              )}
                              
                              <button
                                onClick={() => handleEdit(dues)}
                                className="btn-outline flex items-center space-x-1"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              
                              <button
                                onClick={() => toggleActive(dues.id, dues.is_active)}
                                className={`px-3 py-2 rounded-lg flex items-center space-x-1 ${
                                  dues.is_active
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {dues.is_active ? (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Example Calculations */}
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <h2 className="text-xl font-bold mb-4">📖 Example Calculations</h2>
          <div className="space-y-3 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <p className="font-medium">President with CSC Scholarship:</p>
              <p className="text-gray-600 mt-1">
                Rank = President (level 100) → Executive = TRUE<br/>
                Scholarship = CSC<br/>
                <strong>Result: ¥25/month</strong> (from CSC + Executive row)
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <p className="font-medium">Regular Member with CSC Scholarship:</p>
              <p className="text-gray-600 mt-1">
                Rank = Member (level 10) → Executive = FALSE<br/>
                Scholarship = CSC<br/>
                <strong>Result: ¥15/month</strong> (from CSC + Regular Member row)
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <p className="font-medium">Treasurer with Self-support:</p>
              <p className="text-gray-600 mt-1">
                Rank = Treasurer (level 80) → Executive = TRUE<br/>
                Scholarship = Self-support<br/>
                <strong>Result: ¥110/month</strong> (from Self-support + Executive row)
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
