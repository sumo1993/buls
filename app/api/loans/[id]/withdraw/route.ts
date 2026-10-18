import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { reason } = body

    const { id } = await params
    const supabase = createAdminClient()
    
    // Get user from database
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    console.log('🚫 WITHDRAW loan:', id, 'by user:', user.id)

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single()

    if (loanError || !loan) {
      console.error('❌ Loan not found:', loanError)
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Verify the loan belongs to the user
    if (loan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to withdraw this loan' }, { status: 403 })
    }

    // Only pending and secretary_approved loans can be withdrawn
    if (!['pending', 'secretary_approved'].includes(loan.status)) {
      return NextResponse.json({ 
        error: 'Only pending or secretary-approved loans can be withdrawn' 
      }, { status: 400 })
    }

    // Update loan to withdrawn status
    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        withdrawn_reason: reason || 'No reason provided'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error withdrawing loan:', updateError)
      return NextResponse.json({ error: 'Failed to withdraw loan' }, { status: 500 })
    }

    console.log('✅ Loan withdrawn:', { 
      loan_id: updatedLoan.id, 
      user_id: updatedLoan.user_id,
      amount: updatedLoan.amount,
      reason: updatedLoan.withdrawn_reason
    })

    return NextResponse.json({ 
      message: 'Loan application withdrawn successfully',
      loan: updatedLoan 
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
