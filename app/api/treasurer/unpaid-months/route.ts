import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Get unpaid months for a student based on their join date
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify user is treasurer or admin
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'treasurer', 'finance'].includes(userData.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get student_id from query params
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }

    // Get student's join date (created_at)
    const { data: student, error: studentError } = await adminClient
      .from('users')
      .select('created_at, full_name')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const joinDate = new Date(student.created_at)
    const currentDate = new Date()

    // Get all existing payments for this student
    const { data: existingPayments, error: paymentsError } = await adminClient
      .from('payments')
      .select('month, year')
      .eq('user_id', studentId)

    if (paymentsError) {
      console.error('Error fetching existing payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Create a set of paid months for quick lookup
    const paidMonths = new Set(
      (existingPayments || []).map(p => `${p.month}-${p.year}`)
    )

    // Generate list of months from join date to current date
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    
    const unpaidMonths: Array<{ month: string; year: number; status: string }> = []
    const paidMonthsList: Array<{ month: string; year: number }> = []
    
    let iterDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

    // Only include months from join date up to current month
    while (iterDate <= currentMonth) {
      const month = months[iterDate.getMonth()]
      const year = iterDate.getFullYear()
      const key = `${month}-${year}`

      if (paidMonths.has(key)) {
        paidMonthsList.push({ month, year })
      } else {
        // Categorize unpaid months
        const isPast = iterDate < currentMonth
        const isCurrent = iterDate.getTime() === currentMonth.getTime()
        
        unpaidMonths.push({
          month,
          year,
          status: isCurrent ? 'current' : (isPast ? 'overdue' : 'future')
        })
      }

      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1)
    }

    return NextResponse.json({
      studentName: student.full_name,
      joinDate: student.created_at,
      unpaidMonths,
      paidMonths: paidMonthsList,
      totalUnpaid: unpaidMonths.length,
      totalPaid: paidMonthsList.length
    })
  } catch (error: any) {
    console.error('Error in unpaid months API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
