import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET /api/user/certificates - Get all certificates for current user
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Get user's certificates
    const { data: certificates, error } = await adminClient
      .from('event_certificates')
      .select(`
        *,
        event:events(id, title, event_date, location)
      `)
      .eq('user_id', userData.id)
      .order('issued_at', { ascending: false })

    if (error) {
      console.error('Error fetching user certificates:', error)
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 })
    }

    const stats = {
      total_certificates: certificates.length,
      total_hours: certificates.reduce((sum, c) => sum + parseFloat(c.hours_credited || 0), 0),
      by_type: {
        attendance: certificates.filter(c => c.certificate_type === 'attendance').length,
        participation: certificates.filter(c => c.certificate_type === 'participation').length,
        achievement: certificates.filter(c => c.certificate_type === 'achievement').length,
        speaker: certificates.filter(c => c.certificate_type === 'speaker').length,
      }
    }

    return NextResponse.json({ certificates, stats })
  } catch (error: any) {
    console.error('Error in GET /api/user/certificates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
