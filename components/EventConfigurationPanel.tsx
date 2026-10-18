'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarIcon, Loader2, Settings } from 'lucide-react'
import { format } from 'date-fns'

// Define the event configuration schema
const eventConfigurationSchema = z.object({
  event_type: z.enum(['free', 'ticket_only', 'registration_required', 'hybrid']),
  requires_registration: z.boolean().default(false),
  registration_deadline: z.date().nullable().optional(),
  max_guests_per_member: z.number().int().min(0).max(10).default(0),
  allow_guest_registration: z.boolean().default(false),
  is_public: z.boolean().default(true),
  capacity: z.number().int().positive().nullable().optional(),
  waitlist_enabled: z.boolean().default(false),
  ticket_only: z.boolean().default(false),
})

type EventConfiguration = z.infer<typeof eventConfigurationSchema>

interface EventConfigurationPanelProps {
  eventId: string
  eventTitle?: string
  initialConfiguration?: Partial<EventConfiguration>
  onConfigurationUpdate?: (configuration: EventConfiguration) => void
  readonly?: boolean
}

export function EventConfigurationPanel({
  eventId,
  eventTitle,
  initialConfiguration,
  onConfigurationUpdate,
  readonly = false
}: EventConfigurationPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize form with schema
  const form = useForm<EventConfiguration>({
    resolver: zodResolver(eventConfigurationSchema),
    defaultValues: {
      event_type: 'free',
      requires_registration: false,
      registration_deadline: null,
      max_guests_per_member: 0,
      allow_guest_registration: false,
      is_public: true,
      capacity: null,
      waitlist_enabled: false,
      ticket_only: false,
      ...initialConfiguration
    }
  })

  // Watch event_type to conditionally show fields
  const eventType = form.watch('event_type')
  const allowGuestRegistration = form.watch('allow_guest_registration')
  const requiresRegistration = form.watch('requires_registration')

  // Load configuration on mount
  useEffect(() => {
    if (eventId && !initialConfiguration) {
      loadConfiguration()
    }
  }, [eventId])

  const loadConfiguration = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/events/${eventId}/configuration`)
      
      if (!response.ok) {
        throw new Error('Failed to load event configuration')
      }
      
      const data = await response.json()
      
      // Parse date strings to Date objects
      const config = data.configuration
      if (config.registration_deadline) {
        config.registration_deadline = new Date(config.registration_deadline)
      }
      
      form.reset(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
      console.error('Error loading event configuration:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: EventConfiguration) => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Prepare data for API
      const payload = {
        ...data,
        registration_deadline: data.registration_deadline?.toISOString() || null
      }
      
      const response = await fetch(`/api/events/${eventId}/configuration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }
      
      const result = await response.json()
      setSuccess(result.message || 'Configuration updated successfully')
      
      // Notify parent component
      if (onConfigurationUpdate) {
        onConfigurationUpdate(data)
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
      console.error('Error updating event configuration:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle event type change
  const handleEventTypeChange = (value: string) => {
    form.setValue('event_type', value as any)
    
    // Auto-set related fields based on event type
    switch (value) {
      case 'free':
        form.setValue('requires_registration', true)
        form.setValue('ticket_only', false)
        break
      case 'ticket_only':
        form.setValue('requires_registration', false)
        form.setValue('ticket_only', true)
        break
      case 'registration_required':
        form.setValue('requires_registration', true)
        form.setValue('ticket_only', false)
        break
      case 'hybrid':
        form.setValue('requires_registration', true)
        form.setValue('ticket_only', false)
        break
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Event Configuration</h3>
        </div>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-gray-500">Loading configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Event Configuration</h3>
        </div>
        {eventTitle && (
          <p className="text-gray-600 mt-1">
            Configure settings for &quot;{eventTitle}&quot;
          </p>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select 
              value={form.watch('event_type')}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              disabled={readonly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Free Event</option>
              <option value="ticket_only">🎫 Ticket Only</option>
              <option value="registration_required">Registration Required</option>
              <option value="hybrid">Hybrid (Free + Tickets)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {form.watch('event_type') === 'free' && 'Free event with registration'}
              {form.watch('event_type') === 'ticket_only' && (
                <span className="text-purple-700 font-medium">💰 Paid tickets required - Members must purchase tickets to attend</span>
              )}
              {form.watch('event_type') === 'registration_required' && 'Registration required (free)'}
              {form.watch('event_type') === 'hybrid' && 'Free registration + paid ticket options'}
            </p>
          </div>
          
          {/* Event Visibility */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <label className="text-base font-medium text-gray-900">Public Event</label>
              <p className="text-sm text-gray-500">Visible to all members and public</p>
            </div>
            <input
              type="checkbox"
              checked={form.watch('is_public')}
              onChange={(e) => form.setValue('is_public', e.target.checked)}
              disabled={readonly}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Registration Settings */}
        {requiresRegistration && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Registration Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  value={form.watch('registration_deadline') ? format(form.watch('registration_deadline')!, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null
                    form.setValue('registration_deadline', date)
                  }}
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Last date for registration (optional)</p>
              </div>
              
              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Capacity
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={form.watch('capacity') || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    form.setValue('capacity', value === '' ? null : parseInt(value))
                  }}
                  disabled={readonly}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Maximum number of attendees (leave empty for unlimited)</p>
              </div>
            </div>
            
            {/* Waitlist */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <label className="text-base font-medium text-gray-900">Enable Waitlist</label>
                <p className="text-sm text-gray-500">Allow users to join waitlist when event is full</p>
              </div>
              <input
                type="checkbox"
                checked={form.watch('waitlist_enabled')}
                onChange={(e) => form.setValue('waitlist_enabled', e.target.checked)}
                disabled={readonly}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        
        {/* Guest Management */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Guest Management</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Guests per Member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Guests per Member
              </label>
              <input 
                type="number" 
                min="0"
                max="10"
                value={form.watch('max_guests_per_member')}
                onChange={(e) => form.setValue('max_guests_per_member', parseInt(e.target.value))}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">0 = no guests allowed</p>
            </div>
            
            {/* Allow Guest Registration */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <label className="text-base font-medium text-gray-900">Allow Guest Registration</label>
                <p className="text-sm text-gray-500">Members can register guests for this event</p>
              </div>
              <input
                type="checkbox"
                checked={form.watch('allow_guest_registration')}
                onChange={(e) => form.setValue('allow_guest_registration', e.target.checked)}
                disabled={readonly || (form.watch('max_guests_per_member') === 0)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Guest registration note */}
          {allowGuestRegistration && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-600">
              Members will be able to add guests when they register for this event.
              Maximum {form.watch('max_guests_per_member')} guest{form.watch('max_guests_per_member') !== 1 ? 's' : ''} per member.
            </div>
          )}
        </div>
        
        {/* Ticket Only */}
        {eventType === 'hybrid' && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <label className="text-base font-medium text-gray-900">Require Ticket for Attendance</label>
              <p className="text-sm text-gray-500">All attendees must purchase a ticket (no free registration)</p>
            </div>
            <input
              type="checkbox"
              checked={form.watch('ticket_only')}
              onChange={(e) => form.setValue('ticket_only', e.target.checked)}
              disabled={readonly}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        )}
        
        {/* Submit Button */}
        {!readonly && (
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-w-[120px] flex items-center justify-center"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}