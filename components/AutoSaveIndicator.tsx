'use client'

import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react'

interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  saveError: string | null
}

export default function AutoSaveIndicator({ isSaving, lastSaved, saveError }: AutoSaveIndicatorProps) {
  const getTimeSince = (date: Date | null) => {
    if (!date) return ''
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (saveError) {
    return (
      <div className="flex items-center space-x-2 text-red-600 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Save failed: {saveError}</span>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className="flex items-center space-x-2 text-blue-600 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Saved {getTimeSince(lastSaved)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-gray-500 text-sm">
      <Clock className="w-4 h-4" />
      <span>Auto-save enabled</span>
    </div>
  )
}
