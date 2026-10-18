import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// Get all payments for current user
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists
    const userData = await getUserOrSync(userId)

    if (!userData) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Personal member view — always filter by own user_id (join user once, no N+1)
    const { data: payments, error: paymentsError } = await adminClient
      .from('payments')
      .select(`
        id, user_id, amount, status, payment_method, payment_source,
        payment_month, payment_year, created_at, proof_url, reference_code,
        users:user_id (full_name, email)
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (paymentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch payments: ' + paymentsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ payments: payments || [] })
  } catch (error: any) {
    console.error('Error in GET /api/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// Create a new payment
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      month,
      year,
      amount,
      payment_method,
      proof_url,
      user_id,
      reference_code,
      payment_source,
      collection_notes,
      collected_by,
      status,
      batch_id,
      batch_size,
      batch_sequence,
    } = body

    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: submittingUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !submittingUser) {
      // Fallback admin lookup
      const { data: adminUser } = await adminClient
        .from('users')
        .select('id, role')
        .eq('clerk_id', userId)
        .maybeSingle()

      if (!adminUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const targetUserId = user_id || adminUser.id
      const { data: payment, error: insertError } = await adminClient
        .from('payments')
        .insert({
          user_id: targetUserId,
          payment_month: month,
          payment_year: year,
          amount,
          payment_method,
          proof_url: proof_url || null,
          reference_code: reference_code || null,
          payment_source: payment_source || 'student_upload',
          collection_notes: collection_notes || null,
          collected_by: collected_by || null,
          status: status || 'pending',
          batch_id: batch_id || null,
          batch_size: batch_size || null,
          batch_sequence: batch_sequence || null,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json({ payment })
    }

    const targetUserId = user_id || submittingUser.id
    const { data: payment, error: insertError } = await adminClient
      .from('payments')
      .insert({
        user_id: targetUserId,
        payment_month: month,
        payment_year: year,
        amount,
        payment_method,
        proof_url: proof_url || null,
        reference_code: reference_code || null,
        payment_source: payment_source || 'student_upload',
        collection_notes: collection_notes || null,
        collected_by: collected_by || null,
        status: status || 'pending',
        batch_id: batch_id || null,
        batch_size: batch_size || null,
        batch_sequence: batch_sequence || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ payment })
  } catch (error: any) {
    console.error('Error in POST /api/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
