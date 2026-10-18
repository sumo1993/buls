import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'
import { isEmbassyStaff } from '@/lib/embassy'

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgency(days: number | null): 'expired' | 'critical' | 'soon' | 'ok' | 'unknown' {
  if (days == null) return 'unknown'
  if (days < 0) return 'expired'
  if (days <= 90) return 'critical'
  if (days <= 180) return 'soon'
  return 'ok'
}

function helpHint(passportDays: number | null, visaDays: number | null): string {
  const parts: string[] = []
  if (passportDays != null && passportDays < 0) {
    parts.push('Passport expired — renew / replacement')
  } else if (passportDays != null && passportDays <= 90) {
    parts.push('Passport renew soon (≤90 days)')
  } else if (passportDays != null && passportDays <= 180) {
    parts.push('Passport renew within 6 months')
  }
  if (visaDays != null && visaDays < 0) {
    parts.push('Visa/residence expired — T-visa or cancellation help')
  } else if (visaDays != null && visaDays <= 90) {
    parts.push('Visa/residence expiring soon')
  } else if (visaDays != null && visaDays <= 180) {
    parts.push('Visa check within 6 months')
  }
  if (parts.length === 0) {
    if (passportDays == null && visaDays == null) {
      return 'No expiry dates on file — ask member to update profile'
    }
    return 'OK for now'
  }
  return parts.join(' · ')
}

/**
 * Embassy staff: member passport + Chinese visa expiry for proactive help.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)
    if (!user || !isEmbassyStaff(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: profiles, error: profileError } = await supabase
      .from('members_profile')
      .select(
        'user_id, passport_number, passport_expiration_date, chinese_visa_expiration_date, phone, university'
      )
      .limit(3000)

    if (profileError) {
      console.error('members-expiry profiles:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const userIds = [...new Set((profiles || []).map((p: any) => p.user_id).filter(Boolean))]
    if (userIds.length === 0) {
      return NextResponse.json({ members: [], count: 0 })
    }

    // Chunk .in() for large lists
    const users: any[] = []
    for (let i = 0; i < userIds.length; i += 200) {
      const chunk = userIds.slice(i, i + 200)
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number, status, role')
        .in('id', chunk)
      if (error) {
        console.error('members-expiry users:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      users.push(...(data || []))
    }

    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]))

    const members = (profiles || [])
      .map((p: any) => {
        const u = usersMap[p.user_id]
        if (!u) return null
        if (u.role === 'embassy') return null

        const passportDays = daysUntil(p.passport_expiration_date)
        const visaDays = daysUntil(p.chinese_visa_expiration_date)

        return {
          user_id: p.user_id,
          full_name: u.full_name || '—',
          email: u.email || '',
          phone: p.phone || u.phone_number || '',
          university: p.university || '',
          status: u.status || '',
          passport_number: p.passport_number || '',
          passport_expiration_date: p.passport_expiration_date || null,
          chinese_visa_expiration_date: p.chinese_visa_expiration_date || null,
          passport_days: passportDays,
          visa_days: visaDays,
          passport_urgency: urgency(passportDays),
          visa_urgency: urgency(visaDays),
          help_hint: helpHint(passportDays, visaDays),
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aMin = Math.min(
          a.passport_days ?? Number.POSITIVE_INFINITY,
          a.visa_days ?? Number.POSITIVE_INFINITY
        )
        const bMin = Math.min(
          b.passport_days ?? Number.POSITIVE_INFINITY,
          b.visa_days ?? Number.POSITIVE_INFINITY
        )
        if (aMin !== bMin) return aMin - bMin
        return String(a.full_name).localeCompare(String(b.full_name))
      })

    return NextResponse.json({ members, count: members.length })
  } catch (error: any) {
    console.error('GET /api/embassy/members-expiry:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
