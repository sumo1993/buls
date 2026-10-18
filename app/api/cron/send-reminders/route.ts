import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/cron/send-reminders - Cron job to send pending reminders
// This endpoint should be called by a cron service (like Vercel Cron or external cron)
export async function POST(req: Request) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const now = new Date()

    // Get all pending reminders that should be sent now
    const { data: reminders, error: fetchError } = await adminClient
      .from('event_reminders')
      .select(`
        *,
        event:events(title, event_date, location),
        user:users(full_name, email)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(100) // Process 100 at a time

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ 
        message: 'No reminders to send',
        processed: 0
      })
    }

    console.log(`📧 Processing ${reminders.length} reminders...`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each reminder
    for (const reminder of reminders) {
      try {
        // TODO: Implement actual email/SMS sending
        // For now, we'll just mark as sent
        
        const emailSubject = getReminderSubject(reminder.reminder_type, reminder.event.title)
        const emailBody = getReminderBody(reminder)

        // Simulate email sending
        console.log(`📨 Sending reminder to ${reminder.user.email}`)
        console.log(`Subject: ${emailSubject}`)
        
        // In production, you would call your email service here:
        // await sendEmail(reminder.user.email, emailSubject, emailBody)

        // Mark as sent
        const { error: updateError } = await adminClient
          .from('event_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id)

        if (updateError) {
          throw updateError
        }

        results.sent++
      } catch (error: any) {
        console.error(`❌ Failed to send reminder ${reminder.id}:`, error)
        
        // Mark as failed
        await adminClient
          .from('event_reminders')
          .update({ status: 'failed' })
          .eq('id', reminder.id)

        results.failed++
        results.errors.push(`${reminder.id}: ${error.message}`)
      }
    }

    console.log(`✅ Processed ${reminders.length} reminders: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      processed: reminders.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (error: any) {
    console.error('Error in POST /api/cron/send-reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function getReminderSubject(type: string, eventTitle: string): string {
  switch (type) {
    case '7_days_before':
      return `Reminder: ${eventTitle} in 7 Days`
    case '1_day_before':
      return `Reminder: ${eventTitle} Tomorrow`
    case '2_hours_before':
      return `Reminder: ${eventTitle} Starts Soon`
    case 'registration_deadline':
      return `Last Chance: Register for ${eventTitle}`
    default:
      return `Event Reminder: ${eventTitle}`
  }
}

function getReminderBody(reminder: any): string {
  const { event, user, reminder_type } = reminder
  const eventDate = new Date(event.event_date)
  
  let timeMessage = ''
  switch (reminder_type) {
    case '7_days_before':
      timeMessage = 'in 7 days'
      break
    case '1_day_before':
      timeMessage = 'tomorrow'
      break
    case '2_hours_before':
      timeMessage = 'in 2 hours'
      break
  }

  return `
Hello ${user.full_name},

This is a friendly reminder that "${event.title}" is coming up ${timeMessage}!

Event Details:
📅 Date: ${eventDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
🕐 Time: ${eventDate.toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit' 
})}
📍 Location: ${event.location || 'TBA'}

We're looking forward to seeing you there!

Best regards,
BULS Beijing Team
  `.trim()
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Event Reminders Cron Job',
    info: 'Use POST with Authorization header to trigger reminder sending',
    setup: 'Add CRON_SECRET to environment variables and configure cron schedule'
  })
}
