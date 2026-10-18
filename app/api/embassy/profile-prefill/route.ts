import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

/** Prefill passport / contact fields from members_profile for new cases. */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)
    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('members_profile')
      .select(
        'date_of_birth, passport_number, passport_issue_date, passport_expiration_date, phone, beijing_address, address, university'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    // HTML date inputs need YYYY-MM-DD
    const toDateInput = (value: string | null | undefined) => {
      if (!value) return ''
      const s = String(value)
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().slice(0, 10)
    }

    return NextResponse.json({
      full_name: user.full_name || '',
      passport_number: profile?.passport_number || '',
      passport_issue_date: toDateInput(profile?.passport_issue_date),
      passport_expiration_date: toDateInput(profile?.passport_expiration_date),
      date_of_birth: toDateInput(profile?.date_of_birth),
      phone: profile?.phone || '',
      china_address: profile?.beijing_address || profile?.address || '',
      university: profile?.university || '',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
