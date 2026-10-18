import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startDate, endDate, reportType } = await req.json()

    const adminClient = createAdminClient()

    // Get user role
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .maybeSingle()

    if (!userData || !['admin', 'treasurer'].includes(userData.role)) {
      return NextResponse.json({ error: 'Unauthorized - Treasurer access required' }, { status: 403 })
    }

    // Fetch all payments within date range with user details
    // Convert dates to include full timestamp for proper comparison
    const startDateTime = new Date(startDate).toISOString()
    const endDateTime = new Date(endDate + 'T23:59:59').toISOString()
    
    console.log('🔍 Report request:', { startDate, endDate, startDateTime, endDateTime, reportType })
    
    const { data: payments, error: paymentsError } = await adminClient
      .from('payments')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          members_profile (
            member_id,
            university,
            wechat_id,
            phone,
            chinese_phone_number
          )
        ),
        collector:collected_by (
          full_name
        )
      `)
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: false })

    console.log('📊 Payments fetched:', payments?.length || 0)

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments: ' + paymentsError.message }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      
      byStatus: {
        pending: payments.filter(p => p.status === 'pending').length,
        collected: payments.filter(p => p.status === 'collected').length,
        approved: payments.filter(p => p.status === 'approved').length,
        rejected: payments.filter(p => p.status === 'rejected').length,
      },
      
      amountByStatus: {
        pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0),
        collected: payments.filter(p => p.status === 'collected').reduce((sum, p) => sum + parseFloat(p.amount), 0),
        approved: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + parseFloat(p.amount), 0),
      },
      
      byPaymentMethod: {
        wechat: payments.filter(p => p.payment_method === 'wechat').length,
        alipay: payments.filter(p => p.payment_method === 'alipay').length,
        bank: payments.filter(p => p.payment_method === 'bank').length,
      },
      
      bySource: {
        student_upload: payments.filter(p => p.payment_source === 'student_upload' || !p.payment_source).length,
        cash: payments.filter(p => p.payment_source === 'cash').length,
      },
      
      // Monthly breakdown
      byMonth: {} as Record<string, { count: number; amount: number }>,
      
      // Batch statistics
      batchPayments: payments.filter(p => p.batch_id).length,
      uniqueBatches: new Set(payments.filter(p => p.batch_id).map(p => p.batch_id)).size,
      
      // Top collectors
      topCollectors: [] as any[],
    }

    // Calculate monthly breakdown
    payments.forEach(payment => {
      const key = `${payment.month} ${payment.year}`
      if (!stats.byMonth[key]) {
        stats.byMonth[key] = { count: 0, amount: 0 }
      }
      stats.byMonth[key].count++
      stats.byMonth[key].amount += parseFloat(payment.amount)
    })

    // Calculate top collectors
    const collectorMap = new Map<string, { name: string; count: number; amount: number }>()
    payments.filter(p => p.collected_by).forEach(payment => {
      const collectorId = payment.collected_by!
      const collectorName = payment.collector?.full_name || 'Unknown'
      
      if (!collectorMap.has(collectorId)) {
        collectorMap.set(collectorId, { name: collectorName, count: 0, amount: 0 })
      }
      
      const collector = collectorMap.get(collectorId)!
      collector.count++
      collector.amount += parseFloat(payment.amount)
    })
    
    stats.topCollectors = Array.from(collectorMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      reportType,
      dateRange: { startDate, endDate },
      stats,
      payments: reportType === 'detailed' ? payments : payments.slice(0, 100), // Limit for summary
      generatedAt: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
