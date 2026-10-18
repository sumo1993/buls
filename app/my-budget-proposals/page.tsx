'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import DashboardLayout from '@/components/DashboardLayout'
import BudgetProposalsPanel from '@/components/BudgetProposalsPanel'
import { Loader2 } from 'lucide-react'

export default function MyBudgetProposalsPage() {
  const { isLoaded, userId } = useAuth()
  const [userRole, setUserRole] = useState('member')
  const [canAccess, setCanAccess] = useState(false)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) {
      setLoadingRole(false)
      return
    }
    ;(async () => {
      try {
        const [userRes, accessRes] = await Promise.all([
          fetch('/api/user', { credentials: 'same-origin' }),
          fetch('/api/my-budget-proposals', { credentials: 'same-origin' }),
        ])
        if (userRes.ok) {
          const data = await userRes.json()
          setUserRole(data.role || 'member')
        }
        if (accessRes.ok) {
          const data = await accessRes.json()
          setCanAccess(!!data.canAccess)
        }
      } catch {
        // keep defaults
      } finally {
        setLoadingRole(false)
      }
    })()
  }, [isLoaded, userId])

  if (!isLoaded || loadingRole) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!userId) {
    return (
      <DashboardLayout userRole="member">
        <div className="card text-center py-12">
          <p className="text-gray-700">Please sign in to view budget proposals.</p>
          <a href="/auth/signin" className="btn-primary inline-block mt-4">
            Sign in
          </a>
        </div>
      </DashboardLayout>
    )
  }

  const isStaff = ['admin', 'secretary', 'treasurer', 'finance'].includes(userRole)

  if (!isStaff && !canAccess) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="card text-center py-12">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Budget Proposals</h1>
          <p className="text-gray-600">
            Only committee heads, assigned budget heads, and staff (secretary, treasurer, finance, admin) can access this page.
          </p>
          <a href="/dashboard" className="btn-primary inline-block mt-4">
            Back to Dashboard
          </a>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Proposals</h1>
          <p className="text-gray-600 mt-1">
            {isStaff
              ? 'Manage committee budget proposals across the union'
              : 'Proposals for committees you lead, or assigned to you as budget head'}
          </p>
        </div>

        <BudgetProposalsPanel
          mode={isStaff ? 'staff' : 'member'}
          canManage={userRole === 'admin' || userRole === 'secretary'}
          canPay={userRole === 'admin' || userRole === 'treasurer'}
          title={isStaff ? 'All Budget Proposals' : 'My Committee Budget Proposals'}
          subtitle={
            isStaff
              ? 'Assign, review, approve, and record payments'
              : 'Shows proposals for committees you head and any assigned to you as budget head'
          }
        />
      </div>
    </DashboardLayout>
  )
}
