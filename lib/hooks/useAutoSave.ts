import { useEffect, useRef, useState } from 'react'

interface UseAutoSaveOptions {
  data: any
  onSave: (data: any) => Promise<void>
  delay?: number // milliseconds to wait before saving
  enabled?: boolean // whether auto-save is enabled
}

export function useAutoSave(options?: UseAutoSaveOptions | null) {
  const {
    data,
    onSave,
    delay = 2000,
    enabled = true,
  } = options ?? {
    data: null,
    onSave: async () => {},
    enabled: false,
  }
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const previousDataRef = useRef<any>(undefined)
  const isFirstRender = useRef<boolean>(true)

  useEffect(() => {
    // Skip on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      previousDataRef.current = data
      return
    }

    // Skip if disabled
    if (!enabled) {
      return
    }

    // Check if data actually changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      setSaveError(null)

      try {
        await onSave(data)
        setLastSaved(new Date())
        previousDataRef.current = data
      } catch (error: any) {
        console.error('Auto-save error:', error)
        setSaveError(error?.message || 'Failed to save')
      } finally {
        setIsSaving(false)
      }
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, enabled, delay, onSave])

  // Manual save function
  const saveNow = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(data)
      setLastSaved(new Date())
      previousDataRef.current = data
    } catch (error: any) {
      console.error('Manual save error:', error)
      setSaveError(error?.message || 'Failed to save')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isSaving,
    lastSaved,
    saveError,
    saveNow
  }
}
