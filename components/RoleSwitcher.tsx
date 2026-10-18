'use client'

import { Shield, User } from 'lucide-react'
import { ViewMode } from '@/lib/hooks/useRoleSwitch'
import toast from 'react-hot-toast'

interface RoleSwitcherProps {
  userRole: string
  viewMode: ViewMode
  onToggle: () => void
  hasExecutiveRole: boolean
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  finance: 'Finance Officer',
  treasurer: 'Treasurer',
  secretary: 'General Secretary',
  member: 'Member'
}

export default function RoleSwitcher({ userRole, viewMode, onToggle, hasExecutiveRole }: RoleSwitcherProps) {
  if (!hasExecutiveRole) return null

  const roleLabel = roleLabels[userRole] || userRole

  const handleToggle = () => {
    onToggle()
    
    // Show notification
    if (viewMode === 'role') {
      toast.success('Switched to Member View', {
        icon: '👤',
        duration: 2000,
      })
    } else {
      toast.success(`Switched to ${roleLabel} View`, {
        icon: '🛡️',
        duration: 2000,
      })
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {/* View Mode Indicator */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
        {viewMode === 'role' ? (
          <>
            <Shield className="w-4 h-4 text-[#D62828]" />
            <span className="text-sm font-medium text-gray-700">{roleLabel} Mode</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Member Mode</span>
          </>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="relative inline-flex items-center h-9 rounded-full w-16 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D62828]"
        style={{
          backgroundColor: viewMode === 'role' ? '#D62828' : '#3B82F6'
        }}
        aria-label="Toggle view mode"
        title={`Switch to ${viewMode === 'role' ? 'Member' : roleLabel} Mode`}
      >
        <span
          className={`inline-block w-7 h-7 transform transition-transform bg-white rounded-full shadow-lg ${
            viewMode === 'role' ? 'translate-x-1' : 'translate-x-8'
          }`}
        >
          {viewMode === 'role' ? (
            <Shield className="w-4 h-4 m-1.5 text-[#D62828]" />
          ) : (
            <User className="w-4 h-4 m-1.5 text-blue-600" />
          )}
        </span>
      </button>

      {/* Mobile Label */}
      <div className="md:hidden">
        <span className="text-xs font-medium text-gray-600">
          {viewMode === 'role' ? roleLabel : 'Member'}
        </span>
      </div>
    </div>
  )
}
