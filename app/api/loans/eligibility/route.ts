import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user ID from Supabase users table
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, clerk_id, created_at, status')
      .eq('clerk_id', user.id)
      .single()

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (dbUser.status !== 'active') {
      return NextResponse.json({
        eligible: false,
        reason: 'Account not active',
        details: 'Your account must be activated by an administrator before you can apply for loans.'
      })
    }

    // Call the eligibility check function
    const { data: eligibility, error } = await supabase
      .rpc('check_member_loan_eligibility', { p_user_id: dbUser.id })

    if (error) {
      console.error('Error checking eligibility:', error)
      // Fallback to manual check if function doesn't exist yet
      return await manualEligibilityCheck(supabase, dbUser.id)
    }

    if (!eligibility || eligibility.length === 0) {
      return await manualEligibilityCheck(supabase, dbUser.id)
    }

    const result = eligibility[0]

    // Get loan settings for display
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'loan_min_amount',
        'loan_max_amount',
        'loan_max_total_per_member',
        'loan_max_active_per_member',
        'loan_default_interest_rate',
        'loan_default_period_months'
      ])

    const settingsMap = settings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {}) || {}

    return NextResponse.json({
      eligible: result.eligible,
      reason: result.reason,
      details: result.details,
      settings: settingsMap
    })
  } catch (error) {
    console.error('Error in GET eligibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback manual eligibility check
async function manualEligibilityCheck(supabase: any, userId: string) {
  try {
    // Get settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'loan_max_active_per_member',
        'loan_max_total_per_member',
        'loan_requires_dues_clear',
        'loan_minimum_months'
      ])

    const settingsMap = settings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {}) || {}

    const maxActive = parseInt(settingsMap.loan_max_active_per_member || '2')
    const maxTotal = parseFloat(settingsMap.loan_max_total_per_member || '100000')
    const requiresDues = settingsMap.loan_requires_dues_clear === 'true'
    const minMonths = parseInt(settingsMap.loan_minimum_months || '3')

    // Check active loans
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id, remaining_balance')
      .eq('user_id', userId)
      .in('status', ['pending', 'secretary_approved', 'finance_approved', 'disbursed'])
      .neq('repayment_status', 'completed')

    if (activeLoans && activeLoans.length >= maxActive) {
      return NextResponse.json({
        eligible: false,
        reason: 'Maximum active loans reached',
        details: {
          active_loans: activeLoans.length,
          max_allowed: maxActive
        }
      })
    }

    // Check total borrowed
    const totalBorrowed = activeLoans?.reduce((sum, loan) => {
      return sum + (parseFloat(loan.remaining_balance) || 0)
    }, 0) || 0

    if (totalBorrowed >= maxTotal) {
      return NextResponse.json({
        eligible: false,
        reason: 'Maximum borrowing limit reached',
        details: {
          current_total: totalBorrowed,
          max_allowed: maxTotal
        }
      })
    }

    // Check dues if required
    if (requiresDues) {
      const { data: unpaidDues } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (unpaidDues && unpaidDues.length > 0) {
        return NextResponse.json({
          eligible: false,
          reason: 'Unpaid monthly dues',
          details: {
            unpaid_months: unpaidDues.length
          }
        })
      }
    }

    // Check membership duration
    if (minMonths > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', userId)
        .single()

      if (user) {
        const monthsSince = Math.floor(
          (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )

        if (monthsSince < minMonths) {
          return NextResponse.json({
            eligible: false,
            reason: 'Minimum membership duration not met',
            details: {
              months_as_member: monthsSince,
              required_months: minMonths
            }
          })
        }
      }
    }

    // All checks passed
    return NextResponse.json({
      eligible: true,
      reason: 'Eligible to apply for loan',
      details: {
        active_loans: activeLoans?.length || 0,
        total_borrowed: totalBorrowed
      }
    })
  } catch (error) {
    console.error('Error in manual eligibility check:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    )
  }
}
