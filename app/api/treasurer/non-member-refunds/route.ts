import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details to verify role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only treasurer and admin can process refunds
    if (!['treasurer', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      registration_id, 
      refund_amount, 
      refund_reason,
      refund_proof_url 
    } = body

    // Validate required fields
    if (!registration_id || !refund_amount || !refund_reason) {
      return NextResponse.json(
        { error: 'Missing required fields: registration_id, refund_amount, refund_reason' },
        { status: 400 }
      )
    }

    // Get the registration to verify it exists and is refundable
    const { data: registration, error: regError } = await supabase
      .from('non_member_registrations')
      .select('id, status, amount_paid, refunded_at')
      .eq('id', registration_id)
      .single()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Check if already refunded
    if (registration.refunded_at || registration.status === 'refunded') {
      return NextResponse.json({ error: 'Registration already refunded' }, { status: 400 })
    }

    // Check if refund amount is valid
    if (refund_amount > registration.amount_paid) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed amount paid' },
        { status: 400 }
      )
    }

    // Process the refund
    const { data: refundData, error: refundError } = await supabase
      .from('non_member_registrations')
      .update({
        status: 'refunded',
        refunded_by: userData.id,
        refunded_at: new Date().toISOString(),
        refund_amount: refund_amount,
        refund_reason: refund_reason,
        refund_proof_url: refund_proof_url || null
      })
      .eq('id', registration_id)
      .select()
      .single()

    if (refundError) {
      console.error('Refund error:', refundError)
      return NextResponse.json(
        { error: 'Failed to process refund' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      data: refundData
    })

  } catch (error: any) {
    console.error('Refund processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
