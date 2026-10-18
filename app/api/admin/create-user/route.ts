import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

const ALLOWED_ROLES = [
  'member',
  'secretary',
  'treasurer',
  'finance',
  'embassy',
  'admin',
] as const

/**
 * Admin provisions a Clerk account + Supabase user.
 * Option B for Embassy: Admin creates account and shares login details once.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await import('@clerk/nextjs/server').then((m) => m.auth())

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, firstName, lastName, role, status } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    const assignedRole = role || 'member'
    if (!ALLOWED_ROLES.includes(assignedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Embassy / staff: always active unless explicitly set
    const assignedStatus = status || 'active'
    const tempPassword = password || generateTempPassword()
    const passwordWasGenerated = !password

    const client = await clerkClient()

    try {
      const user = await client.users.createUser({
        emailAddress: [email],
        password: tempPassword,
        firstName,
        lastName,
        publicMetadata: {
          role: assignedRole,
          status: assignedStatus,
          provisioned_by_admin: true,
          must_change_password: passwordWasGenerated,
        },
        // Allow admin-generated temp passwords that still meet length
        skipPasswordChecks: passwordWasGenerated,
        skipPasswordRequirement: false,
      })

      console.log('✅ User created in Clerk:', user.id)

      const userEmail = user.emailAddresses[0]?.emailAddress || email
      const fullName = `${firstName} ${lastName}`.trim()

      const { data: inserted, error: syncError } = await supabase
        .from('users')
        .insert({
          clerk_id: user.id,
          email: userEmail,
          full_name: fullName,
          role: assignedRole,
          status: assignedStatus,
        })
        .select('id')
        .single()

      if (syncError) {
        // Race with webhook sync — try update by clerk_id
        const { data: existing } = await supabase
          .from('users')
          .update({
            email: userEmail,
            full_name: fullName,
            role: assignedRole,
            status: assignedStatus,
          })
          .eq('clerk_id', user.id)
          .select('id')
          .maybeSingle()

        if (!existing) {
          console.error('⚠️ Failed to sync to Supabase:', syncError)
          return NextResponse.json({
            success: true,
            warning:
              'User created in Clerk but database sync failed. Assign role manually after Sync Clerk.',
            temporaryPassword: tempPassword,
            loginUrl: '/auth/signin',
            user: {
              id: user.id,
              email: userEmail,
              firstName: user.firstName,
              lastName: user.lastName,
              role: assignedRole,
              status: assignedStatus,
            },
          })
        }
      }

      return NextResponse.json({
        success: true,
        temporaryPassword: tempPassword,
        passwordGenerated: passwordWasGenerated,
        loginUrl: '/auth/signin',
        message:
          assignedRole === 'embassy'
            ? 'Embassy account created. Share the login details securely once, then ask them to change the password.'
            : 'User created successfully.',
        user: {
          id: user.id,
          dbId: inserted?.id || null,
          email: userEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          role: assignedRole,
          status: assignedStatus,
        },
      })
    } catch (clerkError: any) {
      console.error('Clerk user creation error:', clerkError)

      if (clerkError.errors?.[0]?.code === 'form_identifier_exists') {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        )
      }

      if (clerkError.errors?.[0]?.code === 'form_password_length') {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error:
            clerkError.errors?.[0]?.message || 'Failed to create user in Clerk',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateTempPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
