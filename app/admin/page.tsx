'use client'

import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Loader2, Users as UsersIcon, UserPlus, QrCode, Upload, Trash2, Edit, File, FileText, Download, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import BudgetProposalsPanel from '@/components/BudgetProposalsPanel'

type AdminTab = 'users' | 'committees' | 'files' | 'qr-codes' | 'budget_proposals'
const ADMIN_TABS: AdminTab[] = ['users', 'committees', 'files', 'qr-codes', 'budget_proposals']

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') as AdminTab | null
    if (tab && ADMIN_TABS.includes(tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      fetchData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const fetchData = async () => {
    if (!clerkUser) {
      setLoading(false)
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase/client-browser')
      const userEmail = clerkUser.primaryEmailAddress?.emailAddress
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle()

      if (userError || !userData) {
        toast.error('Failed to load user data')
        setLoading(false)
        return
      }

      setUser(userData)

      if (userData.role !== 'admin') {
        toast.error('Access denied. Admin panel requires admin role.')
        router.push('/dashboard')
        return
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load admin data')
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

  if (!user) {
    return null
  }

  return (
    <DashboardLayout userRole={user.role}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Manage users and system settings</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('users')
                // Open create modal via query hash consumed by Users panel
                window.dispatchEvent(new CustomEvent('admin-open-create-embassy'))
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D62828] text-white rounded-lg font-medium hover:bg-red-700"
            >
              <UserPlus className="w-5 h-5" />
              Create Embassy Staff
            </button>
            <button
              onClick={() => router.push('/admin/register')}
              className="btn-primary flex items-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Register Student</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-[#D62828] text-[#D62828]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('committees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'committees'
                  ? 'border-[#D62828] text-[#D62828]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Committees
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'files'
                  ? 'border-[#D62828] text-[#D62828]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab('qr-codes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'qr-codes'
                  ? 'border-[#D62828] text-[#D62828]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <QrCode className="w-4 h-4 inline mr-2" />
              QR Codes
            </button>
            <button
              onClick={() => setActiveTab('budget_proposals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'budget_proposals'
                  ? 'border-[#D62828] text-[#D62828]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Budget Proposals
            </button>
          </nav>
        </div>

        {/* QR Codes Tab */}
        {activeTab === 'qr-codes' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">QR Code Management</h2>
            <p className="text-gray-600 mb-4">Upload and manage payment QR codes</p>
            <QRCodeManagement />
          </div>
        )}

        {/* Other tabs */}
        {activeTab === 'users' && (
          <AdminUserRolesPanel />
        )}

        {activeTab === 'committees' && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Committees</h2>
            <p className="text-gray-600">Committee management coming soon.</p>
          </div>
        )}

        {activeTab === 'files' && (
          <FileManagementPanel />
        )}

        {activeTab === 'budget_proposals' && (
          <div className="card">
            <BudgetProposalsPanel
              mode="staff"
              canManage
              canPay
              title="Budget Proposals"
              subtitle="Assign, approve, and record payments for committee budgets"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

const ADMIN_ROLES = [
  'member',
  'secretary',
  'treasurer',
  'finance',
  'embassy',
  'admin',
] as const

const ADMIN_STATUSES = [
  'pending',
  'active',
  'transferred',
  'dropped',
  'graduated',
] as const

/** Admin user management: see all users + role / status / approve + provision Embassy accounts. */
function AdminUserRolesPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateEmbassy, setShowCreateEmbassy] = useState(false)
  const [creatingEmbassy, setCreatingEmbassy] = useState(false)
  const [embassyForm, setEmbassyForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    temporaryPassword: string
    fullName: string
  } | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to load users')
        setUsers([])
        return
      }
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const open = () => {
      setCreatedCredentials(null)
      setShowCreateEmbassy(true)
    }
    window.addEventListener('admin-open-create-embassy', open)
    return () => window.removeEventListener('admin-open-create-embassy', open)
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Change this user's role to "${newRole}"?`)) return
    setBusyId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to update role')
        return
      }
      toast.success(
        newRole === 'embassy'
          ? 'Embassy role assigned. User should sign out and sign back in.'
          : 'Role updated. User may need to sign out and sign back in.'
      )
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    } finally {
      setBusyId(null)
    }
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!confirm(`Change this user's status to "${newStatus}"?`)) return
    setBusyId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to update status')
        return
      }
      toast.success(`Status updated to ${newStatus}`)
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!confirm('Approve this user (set status to active)?')) return
    setBusyId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to approve user')
        return
      }
      toast.success('User approved')
      await fetchUsers()
    } catch (error) {
      console.error('Error approving user:', error)
      toast.error('Failed to approve user')
    } finally {
      setBusyId(null)
    }
  }

  const createEmbassyAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!embassyForm.email || !embassyForm.firstName || !embassyForm.lastName) {
      toast.error('First name, last name, and email are required')
      return
    }
    setCreatingEmbassy(true)
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: embassyForm.email.trim(),
          firstName: embassyForm.firstName.trim(),
          lastName: embassyForm.lastName.trim(),
          password: embassyForm.password.trim() || undefined,
          role: 'embassy',
          status: 'active',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to create Embassy account')
        return
      }
      setCreatedCredentials({
        email: data.user?.email || embassyForm.email,
        temporaryPassword: data.temporaryPassword,
        fullName: `${embassyForm.firstName} ${embassyForm.lastName}`.trim(),
      })
      setEmbassyForm({ firstName: '', lastName: '', email: '', password: '' })
      toast.success('Embassy account created — copy login details now')
      await fetchUsers()
    } catch (error) {
      console.error('Create embassy error:', error)
      toast.error('Failed to create Embassy account')
    } finally {
      setCreatingEmbassy(false)
    }
  }

  const copyCredentials = async () => {
    if (!createdCredentials) return
    const text = [
      'BULS Embassy login',
      `Name: ${createdCredentials.fullName}`,
      `Email: ${createdCredentials.email}`,
      `Temporary password: ${createdCredentials.temporaryPassword}`,
      'Sign in: /auth/signin',
      'Then open Embassy Panel. Please change your password after first login.',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Login details copied')
    } catch {
      toast.error('Could not copy — select and copy manually')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-purple-100 text-purple-800',
      treasurer: 'bg-green-100 text-green-800',
      secretary: 'bg-blue-100 text-blue-800',
      finance: 'bg-orange-100 text-orange-800',
      embassy: 'bg-red-100 text-red-800',
      member: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      transferred: 'bg-blue-100 text-blue-800',
      dropped: 'bg-red-100 text-red-800',
      graduated: 'bg-indigo-100 text-indigo-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.member_id?.toLowerCase().includes(q) ||
      user.university?.toLowerCase().includes(q)

    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const pendingCount = users.filter((u) => u.status === 'pending').length

  return (
    <div className="card space-y-4">
      <div className="rounded-lg border-2 border-[#D62828]/30 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-[#D62828]">Embassy staff accounts</p>
          <p className="text-sm text-gray-700 mt-0.5">
            Create a Clerk login for Embassy staff, then share email + temporary password once.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreatedCredentials(null)
            setShowCreateEmbassy(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D62828] text-white rounded-lg font-medium hover:bg-red-700 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Create Embassy Staff
        </button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            All users · assign roles (incl. Embassy) · change status · approve pending.
            Embassy role is admin-only.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchUsers()}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <a
            href="/admin/sync-clerk"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Sync Clerk
          </a>
          <a
            href="/admin/register"
            className="px-3 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#002244]"
          >
            Register Student
          </a>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
        </div>
      )}

      {showCreateEmbassy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Embassy Staff</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Admin provisions the Clerk account and Embassy role. Share login details
                  securely once — they should change the password after first login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateEmbassy(false)
                  setCreatedCredentials(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {createdCredentials ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm space-y-1">
                  <p className="font-medium text-amber-900">Show this only once</p>
                  <p>
                    <span className="text-gray-600">Name:</span>{' '}
                    {createdCredentials.fullName}
                  </p>
                  <p>
                    <span className="text-gray-600">Email:</span>{' '}
                    <code className="font-mono">{createdCredentials.email}</code>
                  </p>
                  <p>
                    <span className="text-gray-600">Temp password:</span>{' '}
                    <code className="font-mono">{createdCredentials.temporaryPassword}</code>
                  </p>
                  <p className="text-xs text-gray-600 pt-1">
                    Sign in at /auth/signin → Embassy Panel
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="flex-1 px-3 py-2 bg-[#003366] text-white rounded-md text-sm"
                  >
                    Copy login details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateEmbassy(false)
                      setCreatedCredentials(null)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createEmbassyAccount} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      First name *
                    </label>
                    <input
                      required
                      value={embassyForm.firstName}
                      onChange={(e) =>
                        setEmbassyForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Last name *
                    </label>
                    <input
                      required
                      value={embassyForm.lastName}
                      onChange={(e) =>
                        setEmbassyForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={embassyForm.email}
                    onChange={(e) =>
                      setEmbassyForm((p) => ({ ...p, email: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Temporary password (optional)
                  </label>
                  <input
                    type="text"
                    value={embassyForm.password}
                    onChange={(e) =>
                      setEmbassyForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Leave blank to auto-generate"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If blank, a secure temp password is generated for you to share.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={creatingEmbassy}
                    className="flex-1 px-3 py-2 bg-[#D62828] text-white rounded-md text-sm disabled:opacity-50"
                  >
                    {creatingEmbassy ? 'Creating…' : 'Create Embassy account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateEmbassy(false)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="px-2.5 py-1 rounded bg-gray-100">Total: {users.length}</span>
        <span className="px-2.5 py-1 rounded bg-yellow-50 text-yellow-800">
          Pending: {pendingCount}
        </span>
        <span className="px-2.5 py-1 rounded bg-green-50 text-green-800">
          Active: {users.filter((u) => u.status === 'active').length}
        </span>
        <span className="px-2.5 py-1 rounded bg-red-50 text-red-800">
          Embassy: {users.filter((u) => u.role === 'embassy').length}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search name, email, member ID, university…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent w-72 max-w-full"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Roles</option>
          {ADMIN_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Statuses</option>
          {ADMIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No users found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your filters or sync Clerk users</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const busy = busyId === user.id
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{user.full_name || '—'}</div>
                      <div className="text-sm text-gray-500">{user.email || '—'}</div>
                      {user.university && (
                        <div className="text-xs text-gray-400">{user.university}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.member_id || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role || 'member'}
                        disabled={busy}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-[#D62828] disabled:opacity-50 ${getRoleBadgeColor(user.role)}`}
                      >
                        {ADMIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.status || 'pending'}
                        disabled={busy}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-[#D62828] disabled:opacity-50 ${getStatusBadgeColor(user.status)}`}
                      >
                        {ADMIN_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm space-x-2 whitespace-nowrap">
                      {user.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApprove(user.id)}
                          className="text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {user.status === 'active' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleStatusChange(user.id, 'dropped')}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          Drop
                        </button>
                      )}
                      {(user.status === 'dropped' || user.status === 'transferred') && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleStatusChange(user.id, 'active')}
                          className="text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                      {busy && (
                        <Loader2 className="inline w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-gray-500">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  )
}

type QrPaymentMethod = 'wechat' | 'alipay' | 'bank_transfer'
type QrRole = 'admin' | 'treasurer' | 'secretary' | 'finance' | 'embassy'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function FileManagementPanel() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [editingFile, setEditingFile] = useState<any>(null)
  const [form, setForm] = useState({
    file_id: '',
    selectedFile: null as File | null,
    category: 'general' as string,
    visibility: 'members' as string,
    description: ''
  })

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files')
      const data = await response.json()
      if (response.ok) {
        setFiles(data.files || [])
      } else {
        toast.error('Failed to load files')
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.selectedFile && !editingFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      if (editingFile) {
        // Update existing file metadata only
        await updateFileMetadata()
      } else {
        // Convert file to Base64
        const fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve(event.target?.result as string)
          }
          reader.onerror = reject
          reader.readAsDataURL(form.selectedFile!)
        })

        // Create new file
        const response = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `${Date.now()}_${form.selectedFile!.name}`,
            original_filename: form.selectedFile!.name,
            file_url: fileUrl,
            file_type: form.selectedFile!.type,
            file_size: form.selectedFile!.size,
            category: form.category,
            visibility: form.visibility,
            description: form.description
          })
        })

        if (response.ok) {
          toast.success('File uploaded successfully')
          setShowUploadModal(false)
          fetchFiles()
          resetForm()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to upload file')
        }
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const updateFileMetadata = async () => {
    try {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: form.file_id,
          category: form.category,
          visibility: form.visibility,
          description: form.description
        })
      })

      if (response.ok) {
        toast.success('File updated successfully')
        setShowUploadModal(false)
        fetchFiles()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update file')
      }
    } catch (error) {
      console.error('Error updating file:', error)
      toast.error('Failed to update file')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return

    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId })
      })

      if (response.ok) {
        toast.success('File deleted successfully')
        fetchFiles()
      } else {
        toast.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
    }
  }

  const handleEditFile = (file: any) => {
    setEditingFile(file)
    setForm({
      file_id: file.id,
      selectedFile: null,
      category: file.category,
      visibility: file.visibility,
      description: file.description || ''
    })
    setShowUploadModal(true)
  }

  const resetForm = () => {
    setForm({
      file_id: '',
      selectedFile: null,
      category: 'general',
      visibility: 'members',
      description: ''
    })
    setEditingFile(null)
  }

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      documents: 'Documents',
      forms: 'Forms',
      reports: 'Reports',
      minutes: 'Meeting Minutes',
      financial: 'Financial',
      general: 'General'
    }
    return names[category] || category
  }

  const getVisibilityName = (visibility: string) => {
    const names: { [key: string]: string } = {
      public: 'Public',
      members: 'Members Only',
      admin: 'Admin Only'
    }
    return names[visibility] || visibility
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      documents: 'bg-blue-100 text-blue-800',
      forms: 'bg-green-100 text-green-800',
      reports: 'bg-purple-100 text-purple-800',
      minutes: 'bg-orange-100 text-orange-800',
      financial: 'bg-red-100 text-red-800',
      general: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getVisibilityColor = (visibility: string) => {
    const colors: { [key: string]: string } = {
      public: 'bg-green-100 text-green-800',
      members: 'bg-blue-100 text-blue-800',
      admin: 'bg-red-100 text-red-800'
    }
    return colors[visibility] || 'bg-gray-100 text-gray-800'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = searchTerm === '' ||
      file.original_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter
    const matchesVisibility = visibilityFilter === 'all' || file.visibility === visibilityFilter

    return matchesSearch && matchesCategory && matchesVisibility
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#D62828]" />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">File Management</h2>
          <p className="text-gray-600">Upload and manage organizational documents</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowUploadModal(true)
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
        >
          <option value="all">All Categories</option>
          <option value="documents">Documents</option>
          <option value="forms">Forms</option>
          <option value="reports">Reports</option>
          <option value="minutes">Meeting Minutes</option>
          <option value="financial">Financial</option>
          <option value="general">General</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
        >
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="members">Members Only</option>
          <option value="admin">Admin Only</option>
        </select>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No files found</h3>
          <p className="text-gray-500 mt-2">
            {files.length === 0 ? 'Upload your first file to get started' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <File className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{file.original_filename}</div>
                          {file.description && (
                            <div className="text-sm text-gray-500 truncate">{file.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(file.category)}`}>
                        {getCategoryName(file.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getVisibilityColor(file.visibility)}`}>
                        {getVisibilityName(file.visibility)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.uploader?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <a
                          href={file.file_url}
                          download={file.original_filename}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => handleEditFile(file)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit metadata"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredFiles.length} of {files.length} files
          </div>
        </>
      )}

      {/* Upload/Edit Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFile ? 'Edit File Metadata' : 'Upload New File'}
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              {!editingFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File *</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#D62828] transition-colors">
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setForm({ ...form, selectedFile: e.target.files[0] })
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to select file</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, PNG, JPG, etc.</p>
                    </label>
                  </div>
                  {form.selectedFile && (
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                      <span className="mr-2">✓</span>
                      Selected: {form.selectedFile.name} ({formatFileSize(form.selectedFile.size)})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="documents">Documents</option>
                  <option value="forms">Forms</option>
                  <option value="reports">Reports</option>
                  <option value="minutes">Meeting Minutes</option>
                  <option value="financial">Financial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility *</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                >
                  <option value="members">Members Only</option>
                  <option value="public">Public</option>
                  <option value="admin">Admin Only</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {form.visibility === 'public' && 'Anyone can view this file'}
                  {form.visibility === 'members' && 'Only registered members can view this file'}
                  {form.visibility === 'admin' && 'Only admins can view this file'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the file..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!editingFile && !form.selectedFile)}
                  className="flex-1 px-4 py-2 bg-[#D62828] text-white rounded-lg hover:bg-[#B91C1C] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Processing...' : (editingFile ? 'Update File' : 'Upload File')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/** Admin can upload WeChat and/or Alipay (and bank) QR codes for any staff role. */
function QRCodeManagement() {
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingQrCode, setEditingQrCode] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [targetRole, setTargetRole] = useState<QrRole>('treasurer')
  const [description, setDescription] = useState('')
  // Dual upload: WeChat + Alipay (both optional; at least one required when creating)
  const [wechatFile, setWechatFile] = useState<File | null>(null)
  const [wechatUrl, setWechatUrl] = useState('')
  const [wechatPreview, setWechatPreview] = useState<string | null>(null)
  const [alipayFile, setAlipayFile] = useState<File | null>(null)
  const [alipayUrl, setAlipayUrl] = useState('')
  const [alipayPreview, setAlipayPreview] = useState<string | null>(null)
  const [includeBank, setIncludeBank] = useState(false)
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [bankUrl, setBankUrl] = useState('')
  const [bankPreview, setBankPreview] = useState<string | null>(null)
  // Single-edit mode (existing card)
  const [editForm, setEditForm] = useState({
    payment_method: 'wechat' as QrPaymentMethod,
    title: '',
    description: '',
    qr_code_url: '',
    selectedFile: null as File | null,
  })

  const fetchQrCodes = async () => {
    try {
      const response = await fetch('/api/qr-codes')
      const data = await response.json()
      if (response.ok) {
        setQrCodes(data.qrCodes || [])
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error)
      toast.error('Failed to load QR codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQrCodes()
  }, [])

  const resetCreateForm = () => {
    setTargetRole('treasurer')
    setDescription('')
    setWechatFile(null)
    setWechatUrl('')
    setWechatPreview(null)
    setAlipayFile(null)
    setAlipayUrl('')
    setAlipayPreview(null)
    setIncludeBank(false)
    setBankFile(null)
    setBankUrl('')
    setBankPreview(null)
  }

  const openCreateModal = () => {
    setEditingQrCode(null)
    resetCreateForm()
    setShowModal(true)
  }

  const handleEditQrCode = (qrCode: any) => {
    setEditingQrCode(qrCode)
    setEditForm({
      payment_method: qrCode.payment_method,
      title: qrCode.title || '',
      description: qrCode.description || '',
      qr_code_url: qrCode.qr_code_url || '',
      selectedFile: null,
    })
    setShowModal(true)
  }

  const resolveImageUrl = async (file: File | null, url: string, existing?: string) => {
    if (file) return fileToDataUrl(file)
    if (url.trim()) return url.trim()
    return existing || ''
  }

  const postQr = async (payload: {
    role: string
    payment_method: QrPaymentMethod
    qr_code_url: string
    title?: string
    description?: string
  }) => {
    const response = await fetch('/api/qr-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `Failed to save ${payload.payment_method} QR`)
    }
    return data
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    try {
      const wechatImage = await resolveImageUrl(wechatFile, wechatUrl)
      const alipayImage = await resolveImageUrl(alipayFile, alipayUrl)
      const bankImage = includeBank
        ? await resolveImageUrl(bankFile, bankUrl)
        : ''

      if (!wechatImage && !alipayImage && !bankImage) {
        toast.error('Upload at least one QR: WeChat and/or Alipay')
        return
      }

      const saved: string[] = []
      if (wechatImage) {
        await postQr({
          role: targetRole,
          payment_method: 'wechat',
          qr_code_url: wechatImage,
          title: `${getRoleName(targetRole)} WeChat Pay`,
          description: description || undefined,
        })
        saved.push('WeChat')
      }
      if (alipayImage) {
        await postQr({
          role: targetRole,
          payment_method: 'alipay',
          qr_code_url: alipayImage,
          title: `${getRoleName(targetRole)} Alipay`,
          description: description || undefined,
        })
        saved.push('Alipay')
      }
      if (bankImage) {
        await postQr({
          role: targetRole,
          payment_method: 'bank_transfer',
          qr_code_url: bankImage,
          title: `${getRoleName(targetRole)} Bank Transfer`,
          description: description || undefined,
        })
        saved.push('Bank')
      }

      toast.success(`Saved: ${saved.join(' + ')}`)
      setShowModal(false)
      resetCreateForm()
      await fetchQrCodes()
    } catch (error: any) {
      console.error('Error uploading QR codes:', error)
      toast.error(error.message || 'Failed to upload QR codes')
    } finally {
      setUploading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQrCode) return
    setUploading(true)
    try {
      const image = await resolveImageUrl(
        editForm.selectedFile,
        editForm.qr_code_url,
        editingQrCode.qr_code_url
      )
      if (!image) {
        toast.error('Please select a QR image or enter a URL')
        return
      }
      await postQr({
        role: editingQrCode.role,
        payment_method: editForm.payment_method,
        qr_code_url: image,
        title: editForm.title || undefined,
        description: editForm.description || undefined,
      })
      toast.success('QR code updated')
      setShowModal(false)
      setEditingQrCode(null)
      await fetchQrCodes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update QR code')
    } finally {
      setUploading(false)
    }
  }

  const handleQrDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return
    try {
      const response = await fetch('/api/qr-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        toast.success('QR code deleted')
        fetchQrCodes()
      } else {
        toast.error('Failed to delete QR code')
      }
    } catch (error) {
      console.error('Error deleting QR code:', error)
      toast.error('Failed to delete QR code')
    }
  }

  const getPaymentMethodName = (method: string) => {
    const names = { wechat: 'WeChat Pay', alipay: 'Alipay', bank_transfer: 'Bank Transfer' }
    return names[method as keyof typeof names] || method
  }

  const getPaymentBadge = (method: string) => {
    if (method === 'wechat') return 'bg-green-100 text-green-800'
    if (method === 'alipay') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getRoleName = (role: string) => {
    const names = {
      admin: 'Admin',
      treasurer: 'Treasurer',
      secretary: 'Secretary',
      finance: 'Finance',
      embassy: 'Embassy',
    }
    return names[role as keyof typeof names] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      treasurer: 'bg-green-100 text-green-800',
      secretary: 'bg-blue-100 text-blue-800',
      finance: 'bg-orange-100 text-orange-800',
      embassy: 'bg-red-100 text-red-800',
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const methodForRole = (role: string, method: QrPaymentMethod) =>
    qrCodes.find((q) => q.role === role && q.payment_method === method)

  const QR_ROLES: QrRole[] = ['embassy', 'treasurer', 'admin', 'finance', 'secretary']

  const onPickPreview = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    setFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Payment QR Codes</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload <strong>WeChat</strong> and/or <strong>Alipay</strong> for each role. Members can
            pay with either method.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center space-x-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244]"
        >
          <Upload className="w-5 h-5" />
          <span>Add WeChat / Alipay</span>
        </button>
      </div>

      {/* Status by role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['treasurer', 'admin', 'finance', 'secretary', 'embassy'] as QrRole[]).map((role) => {
          const wx = methodForRole(role, 'wechat')
          const ali = methodForRole(role, 'alipay')
          return (
            <div key={role} className="border border-gray-200 rounded-lg p-3 bg-white">
              <p className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${getRoleColor(role)}`}>
                {getRoleName(role)}
              </p>
              <ul className="text-xs space-y-1 text-gray-700">
                <li className="flex justify-between">
                  <span>WeChat</span>
                  <span className={wx ? 'text-green-700 font-medium' : 'text-gray-400'}>
                    {wx ? '✓ Ready' : 'Missing'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Alipay</span>
                  <span className={ali ? 'text-green-700 font-medium' : 'text-gray-400'}>
                    {ali ? '✓ Ready' : 'Missing'}
                  </span>
                </li>
              </ul>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No QR codes yet</h3>
          <p className="text-gray-500 mt-2">Add WeChat and Alipay QR codes for payment collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div
              key={qrCode.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(qrCode.role)}`}>
                      {getRoleName(qrCode.role)}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentBadge(qrCode.payment_method)}`}
                    >
                      {getPaymentMethodName(qrCode.payment_method)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditQrCode(qrCode)}
                      className="text-gray-400 hover:text-blue-600 p-1"
                      title="Edit QR code"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleQrDelete(qrCode.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete QR code"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center mb-4">
                  {qrCode.qr_code_url ? (
                    <img
                      src={qrCode.qr_code_url}
                      alt={`${qrCode.payment_method} QR`}
                      className="max-w-full max-h-48 object-contain"
                    />
                  ) : (
                    <p className="text-sm text-gray-500">No image</p>
                  )}
                </div>

                {qrCode.title && (
                  <p className="text-sm font-medium text-gray-900">{qrCode.title}</p>
                )}
                {qrCode.description && (
                  <p className="text-sm text-gray-600 mt-1">{qrCode.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-4">
                  Updated: {new Date(qrCode.updated_at || qrCode.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingQrCode ? 'Edit QR Code' : 'Add payment QR codes'}
                </h3>
                {!editingQrCode && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    You can upload WeChat, Alipay, or both in one go.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingQrCode(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editingQrCode ? (
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Editing{' '}
                  <span className="font-medium">
                    {getRoleName(editingQrCode.role)} ·{' '}
                    {getPaymentMethodName(editingQrCode.payment_method)}
                  </span>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    rows={2}
                  />
                </div>
                <QrSlot
                  label="Replace image (optional)"
                  file={editForm.selectedFile}
                  url={editForm.qr_code_url}
                  preview={
                    editForm.selectedFile
                      ? null
                      : editForm.qr_code_url || editingQrCode.qr_code_url
                  }
                  onFile={(f) =>
                    setEditForm({ ...editForm, selectedFile: f, qr_code_url: f ? '' : editForm.qr_code_url })
                  }
                  onUrl={(u) => setEditForm({ ...editForm, qr_code_url: u, selectedFile: null })}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingQrCode(null)
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 rounded-md bg-[#003366] px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {uploading ? 'Saving…' : 'Update'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    For which collection role?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['treasurer', 'admin', 'finance', 'secretary', 'embassy'] as QrRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setTargetRole(role)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          targetRole === role
                            ? 'bg-[#003366] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getRoleName(role)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Note (optional, applies to both)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. Monthly dues payment"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-green-900">WeChat Pay</h4>
                      <span className="text-xs text-green-700">Optional</span>
                    </div>
                    <QrSlot
                      label="WeChat QR image"
                      file={wechatFile}
                      url={wechatUrl}
                      preview={wechatPreview || (wechatUrl || null)}
                      onFile={(f) => {
                        onPickPreview(f, setWechatFile, setWechatPreview)
                        if (f) setWechatUrl('')
                      }}
                      onUrl={(u) => {
                        setWechatUrl(u)
                        setWechatFile(null)
                        setWechatPreview(null)
                      }}
                      inputId="wechat-qr-upload"
                    />
                  </div>

                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-blue-900">Alipay</h4>
                      <span className="text-xs text-blue-700">Optional</span>
                    </div>
                    <QrSlot
                      label="Alipay QR image"
                      file={alipayFile}
                      url={alipayUrl}
                      preview={alipayPreview || (alipayUrl || null)}
                      onFile={(f) => {
                        onPickPreview(f, setAlipayFile, setAlipayPreview)
                        if (f) setAlipayUrl('')
                      }}
                      onUrl={(u) => {
                        setAlipayUrl(u)
                        setAlipayFile(null)
                        setAlipayPreview(null)
                      }}
                      inputId="alipay-qr-upload"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeBank}
                    onChange={(e) => setIncludeBank(e.target.checked)}
                  />
                  Also add Bank Transfer QR / screenshot
                </label>

                {includeBank && (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">Bank Transfer</h4>
                    <QrSlot
                      label="Bank QR / details image"
                      file={bankFile}
                      url={bankUrl}
                      preview={bankPreview || (bankUrl || null)}
                      onFile={(f) => {
                        onPickPreview(f, setBankFile, setBankPreview)
                        if (f) setBankUrl('')
                      }}
                      onUrl={(u) => {
                        setBankUrl(u)
                        setBankFile(null)
                        setBankPreview(null)
                      }}
                      inputId="bank-qr-upload"
                    />
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Tip: upload both WeChat and Alipay so members can choose either payment method.
                  Re-upload later to replace an existing code for that role + method.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 rounded-md bg-[#003366] px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {uploading ? 'Saving…' : 'Save QR code(s)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function QrSlot({
  label,
  file,
  url,
  preview,
  onFile,
  onUrl,
  inputId,
}: {
  label: string
  file: File | null
  url: string
  preview: string | null
  onFile: (f: File | null) => void
  onUrl: (u: string) => void
  inputId?: string
}) {
  const id = inputId || `qr-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#003366] transition-colors bg-white">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id={id}
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
        <label htmlFor={id} className="cursor-pointer block">
          <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
          <p className="text-xs text-gray-600">Click to upload image</p>
        </label>
      </div>
      {file && <p className="text-xs text-green-700">✓ {file.name}</p>}
      {preview && !file && preview.startsWith('data:') && (
        <img src={preview} alt="preview" className="max-h-28 mx-auto object-contain rounded" />
      )}
      {preview && !file && !preview.startsWith('data:') && preview.includes('http') && (
        <img src={preview} alt="preview" className="max-h-28 mx-auto object-contain rounded" />
      )}
      <input
        type="text"
        value={url}
        onChange={(e) => onUrl(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        placeholder="Or paste image URL"
      />
    </div>
  )
}
