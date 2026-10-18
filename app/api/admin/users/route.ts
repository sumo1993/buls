import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

/** List all users — admin (full) / finance (view). Uses service role so RLS never hides rows. */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await getUserOrSync(userId)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select(`
        id,
        clerk_id,
        full_name,
        email,
        role,
        status,
        phone_number,
        passport_number,
        created_at,
        updated_at,
        members_profile (
          member_id,
          university,
          phone,
          passport_number
        )
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const normalized = (users || []).map((u: any) => {
      const profile = Array.isArray(u.members_profile)
        ? u.members_profile[0]
        : u.members_profile
      return {
        ...u,
        member_id: profile?.member_id || null,
        university: profile?.university || null,
        profile_phone: profile?.phone || u.phone_number || null,
        members_profile: profile || null,
      }
    })

    return NextResponse.json({
      users: normalized,
      total: normalized.length,
      can_manage: currentUser.role === 'admin',
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
