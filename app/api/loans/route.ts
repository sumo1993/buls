import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// Get all loans
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists (server-side)
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    console.log('🔍 GET /api/loans - User:', { 
      id: user.id, 
      clerk_id: userId, 
      role: user.role,
      name: user.full_name 
    })

    const adminClient = createAdminClient()

    // Use * for loan columns (schema varies) — omit loan_repayments for list speed
    let query = adminClient
      .from('loans')
      .select(`
        *,
        users!loans_user_id_fkey(
          full_name,
          email,
          members_profile(scholarship_status, university, university_campus, year_of_study)
        ),
        approver:users!loans_approved_by_fkey(full_name),
        secretary:users!loans_secretary_approved_by_fkey(full_name),
        finance:users!loans_finance_approved_by_fkey(full_name),
        treasurer:users!loans_treasurer_disbursed_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    // IMPORTANT: Main /loans page shows ONLY user's own loans
    // Staff members (treasurer, finance, secretary) see ALL loans in their PANELS, not here
    // This page is for personal loan management, not administrative viewing
    console.log('🔒 Loans page: Filtering for user\'s OWN loans only:', {
      user_id: user.id,
      user_name: user.full_name,
      user_role: user.role
    })
    
    // Everyone sees only their own loans on this page
    // (Staff see all loans in their respective admin panels, not here)
    query = query.eq('user_id', user.id)

    const { data: loans, error: loansError } = await query

    if (loansError) {
      console.error('❌ Error fetching loans:', loansError)
      // Fallback without optional nested profile if relation fails
      let fallback = adminClient
        .from('loans')
        .select(`
          *,
          users!loans_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (user.role === 'member') {
        console.log('🔒 FALLBACK: Filtering loans for member:', user.id)
        fallback = fallback.eq('user_id', user.id)
      } else {
        console.log('🔒 FALLBACK: Filtering loans for user (own loans only):', user.id)
        fallback = fallback.eq('user_id', user.id)
      }

      const { data: fallbackLoans, error: fallbackError } = await fallback
      if (fallbackError) {
        console.error('❌ Fallback loans fetch failed:', fallbackError)
        return NextResponse.json(
          { error: 'Failed to fetch loans', details: fallbackError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        loans: (fallbackLoans || []).map((loan) => ({
          ...loan,
          last_payment_proof_url: null,
        })),
      })
    }

    // Proofs are loaded on loan detail / repayments endpoints (keeps list fast)
    const loansWithProofs = (loans || []).map((loan) => ({
      ...loan,
      last_payment_proof_url: null as string | null,
    }))

    console.log(`✅ Returning ${loansWithProofs.length} loans for user:`, {
      user_id: user.id,
      user_role: user.role,
      loan_ids: loansWithProofs.map(l => l.id).slice(0, 3),
      loan_user_ids: loansWithProofs.map(l => l.user_id).slice(0, 3)
    })

    return NextResponse.json({ loans: loansWithProofs })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new loan request
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      amount, 
      reason, 
      expected_repayment_date, 
      guarantor_name, 
      guarantor_phone, 
      guarantor_relationship,
      application_document_url,
      application_document_name,
      university
    } = body

    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Automatically sync user if not exists (server-side)
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    // Check if user is active
    if (user.status !== 'active') {
      return NextResponse.json({ 
        error: 'Only active members can request loans. Please wait for admin approval.' 
      }, { status: 403 })
    }

    // Check loan settings from system_settings table
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['loan_requires_dues_clear', 'loan_minimum_months'])

    const requiresDuesClear = settings?.find(s => s.setting_key === 'loan_requires_dues_clear')?.setting_value === 'true'
    const minimumMonths = parseInt(settings?.find(s => s.setting_key === 'loan_minimum_months')?.setting_value || '0')

    // Only check for unpaid dues if the setting is enabled
    if (requiresDuesClear) {
      const { data: hasUnpaid, error: unpaidError } = await adminClient
        .rpc('has_unpaid_months', { p_user_id: user.id })

      if (unpaidError) {
        console.error('Error checking unpaid months:', unpaidError)
        return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
      }

      if (hasUnpaid) {
        return NextResponse.json({ 
          error: 'You have unpaid monthly dues. Please clear all dues before requesting a loan.' 
        }, { status: 403 })
      }
    }

    // Check minimum membership duration if required
    if (minimumMonths > 0) {
      // Check based on actual months paid, not registration date
      const { data: paidMonths, error: paymentsError } = await adminClient
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
      
      if (paymentsError) {
        console.error('Error checking payment history:', paymentsError)
        return NextResponse.json({ error: 'Failed to check payment history' }, { status: 500 })
      }
      
      const totalPaidMonths = paidMonths?.length || 0
      
      if (totalPaidMonths < minimumMonths) {
        return NextResponse.json({ 
          error: `You must have paid dues for at least ${minimumMonths} ${minimumMonths === 1 ? 'month' : 'months'} before applying for a loan. You have paid for ${totalPaidMonths} ${totalPaidMonths === 1 ? 'month' : 'months'}.` 
        }, { status: 403 })
      }
    }

    // Create loan request
    console.log('🎯 Creating loan for user:', { 
      user_id: user.id, 
      clerk_id: userId, 
      amount: parseFloat(amount),
      reason,
      expected_repayment_date,
      guarantor_name,
      university,
      has_document: !!application_document_url
    })
    
    const { data: loan, error: loanError } = await adminClient
      .from('loans')
      .insert({
        user_id: user.id,
        amount: parseFloat(amount),
        reason,
        expected_repayment_date,
        guarantor_name,
        guarantor_phone,
        guarantor_relationship,
        university,
        application_document_url,
        application_document_name,
        application_document_uploaded_at: application_document_url ? new Date().toISOString() : null,
        status: 'pending'
      })
      .select()
      .single()

    if (loanError) {
      console.error('Error creating loan:', loanError)
      return NextResponse.json({ error: 'Failed to create loan request' }, { status: 500 })
    }

    console.log('✅ Loan created successfully:', { 
      loan_id: loan.id, 
      user_id: loan.user_id,
      amount: loan.amount,
      guarantor: loan.guarantor_name,
      document_uploaded: !!loan.application_document_url
    })

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
