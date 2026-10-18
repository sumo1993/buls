import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

// GET single loan
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    
    console.log('🔍 GET loan:', id)
    
    const { data: loan, error } = await supabase
      .from('loans')
      .select(`
        *,
        users!loans_user_id_fkey(full_name, email),
        approver:users!loans_approved_by_fkey(full_name),
        secretary:users!loans_secretary_approved_by_fkey(full_name),
        finance:users!loans_finance_approved_by_fkey(full_name),
        treasurer:users!loans_treasurer_disbursed_by_fkey(full_name)
      `)
      .eq('id', id)
      .single()

    if (error || !loan) {
      console.error('❌ Loan not found:', error)
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Members can only view their own loans
    if (user.role === 'member' && loan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ loan })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// UPDATE loan (Recheck)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const supabase = createAdminClient()
    
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    console.log('🔄 UPDATE loan:', id, 'by user:', user.id)

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

    // Verify ownership
    if (loan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to update this loan' }, { status: 403 })
    }

    // Only pending loans can be updated
    if (loan.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending loans can be updated. Once reviewed, you cannot edit the application.' 
      }, { status: 400 })
    }

    // Update loan
    const updateData: any = {
      amount: parseFloat(amount),
      reason,
      expected_repayment_date,
      guarantor_name,
      guarantor_phone,
      guarantor_relationship,
      university,
      updated_at: new Date().toISOString()
    }

    // Only update document if provided
    if (application_document_url) {
      updateData.application_document_url = application_document_url
      updateData.application_document_name = application_document_name
      updateData.application_document_uploaded_at = new Date().toISOString()
    }

    const { data: updatedLoan, error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating loan:', updateError)
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
    }

    console.log('✅ Loan updated:', { 
      loan_id: updatedLoan.id, 
      user_id: updatedLoan.user_id,
      amount: updatedLoan.amount
    })

    return NextResponse.json({ loan: updatedLoan })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE loan
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    console.log('🗑️ DELETE loan:', id, 'by user:', user.id)

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

    // Verify ownership
    if (loan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this loan' }, { status: 403 })
    }

    // Only pending loans can be deleted
    if (loan.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending loans can be deleted. Use withdraw instead for reviewed loans.' 
      }, { status: 400 })
    }

    // Delete the loan
    const { error: deleteError } = await supabase
      .from('loans')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting loan:', deleteError)
      return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
    }

    console.log('✅ Loan deleted:', { loan_id: id })

    return NextResponse.json({ message: 'Loan deleted successfully' })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
