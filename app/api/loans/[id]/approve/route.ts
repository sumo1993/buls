import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission (finance or admin)
    if (user.role !== 'finance' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Check if already processed
    if (loan.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Loan has already been processed' 
      }, { status: 400 })
    }

    // Approve loan
    const { data: updatedLoan, error: updateError } = await adminClient
      .from('loans')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving loan:', updateError)
      return NextResponse.json({ error: 'Failed to approve loan' }, { status: 500 })
    }

    // Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        action_type: 'loan_approved',
        performed_by: user.id,
        target_id: id,
        details: {
          amount: loan.amount,
          reason: loan.reason
        }
      })

    return NextResponse.json({ loan: updatedLoan })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
