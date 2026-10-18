'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SyncClerkUsersPage() {
  const { userId } = useAuth()
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  const syncUsers = async () => {
    setSyncing(true)
    setResult(null)

    try {
      // First verify admin access
      const { supabase } = await import('@/lib/supabase/client-browser')
      
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', userId)
        .single()

      if (!userData || userData.role !== 'admin') {
        toast.error('Only admins can sync users')
        router.push('/dashboard')
        return
      }

      setUser(userData)

      // Call the sync API
      const response = await fetch('/api/admin/sync-clerk-users', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast.success(`Synced ${data.synced} users successfully!`)
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to sync users')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <DashboardLayout userRole={user?.role}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sync Clerk Users</h1>
          <p className="text-gray-600">Import all Clerk users to Supabase database</p>
        </div>

        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">What does this do?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Fetches all users from Clerk authentication system</li>
                <li>• Creates user records in Supabase database for any missing users</li>
                <li>• Skips users that already exist in the database</li>
                <li>• Sets all new users to "pending" status by default</li>
              </ul>
            </div>
          </div>
        </div>

        {!result && (
          <div className="card">
            <div className="text-center py-8">
              <RefreshCw className="w-16 h-16 mx-auto text-[#D62828] mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Sync</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to sync all Clerk users to your Supabase database
              </p>
              
              <button
                onClick={syncUsers}
                disabled={syncing}
                className="btn-primary inline-flex items-center space-x-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Start Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="card border-2 border-green-200 bg-green-50">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-green-900">Sync Complete!</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{result.total}</p>
                <p className="text-sm text-gray-600">Total in Clerk</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{result.synced}</p>
                <p className="text-sm text-gray-600">Newly Synced</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-600">{result.skipped}</p>
                <p className="text-sm text-gray-600">Already Existed</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>

            {result.details && result.details.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-bold mb-3 text-gray-900">Synced Users:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.details.map((detail: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{detail.name}</p>
                        <p className="text-gray-600 text-xs">{detail.email}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Synced
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => router.push('/admin')}
                className="btn-primary flex-1"
              >
                Go to Admin Dashboard
              </button>
              
              <button
                onClick={() => {
                  setResult(null)
                }}
                className="btn-outline flex-1"
              >
                Sync Again
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
