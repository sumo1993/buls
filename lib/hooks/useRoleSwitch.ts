'use client'

import { useState, useEffect } from 'react'

export type ViewMode = 'role' | 'member'

interface UseRoleSwitchProps {
  userRole?: string
}

export function useRoleSwitch({ userRole }: UseRoleSwitchProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('role')
  const [isLoading, setIsLoading] = useState(false) // Changed from true to false

  // Check if user has an executive role (not just 'member')
  const hasExecutiveRole = userRole && userRole !== 'member'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load saved preference from localStorage
      const savedMode = localStorage.getItem('viewMode') as ViewMode
      if (savedMode && hasExecutiveRole) {
        setViewMode(savedMode)
      } else if (!hasExecutiveRole) {
        // Force member view if no executive role
        setViewMode('member')
      }
    }
  }, [hasExecutiveRole])

  const switchToRoleView = async () => {
    if (!hasExecutiveRole) return
    setViewMode('role')
    localStorage.setItem('viewMode', 'role')
    
    try {
      await fetch('/api/set-view-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewMode: 'role' })
      })
    } catch (error) {
      console.error('Error syncing view mode:', error)
    }
  }

  const switchToMemberView = async () => {
    setViewMode('member')
    localStorage.setItem('viewMode', 'member')
    
    try {
      await fetch('/api/set-view-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewMode: 'member' })
      })
    } catch (error) {
      console.error('Error syncing view mode:', error)
    }
  }

  const toggleView = () => {
    if (!hasExecutiveRole) return
    
    const newMode: ViewMode = viewMode === 'role' ? 'member' : 'role'
    
    console.log(`🔄 TOGGLE VIEW: ${viewMode} → ${newMode}`)
    
    setViewMode(newMode)
    localStorage.setItem('viewMode', newMode)
    
    // Force a page refresh to clear any cached state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'))
    }
    
    // Sync with server cookie (non-blocking)
    fetch('/api/set-view-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewMode: newMode })
    }).catch(error => {
      console.error('Error syncing view mode:', error)
    })
  }

  // Get the effective role based on current view mode
  const getEffectiveRole = (): string => {
    if (!userRole) return 'member'
    if (!hasExecutiveRole) return 'member'
    return viewMode === 'member' ? 'member' : userRole
  }

  return {
    viewMode,
    setViewMode,
    switchToRoleView,
    switchToMemberView,
    toggleView,
    hasExecutiveRole,
    effectiveRole: getEffectiveRole(),
    isLoading
  }
}
