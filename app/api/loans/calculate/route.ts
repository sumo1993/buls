import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, interest_rate, months } = body

    // Validate inputs
    if (!amount || !months) {
      return NextResponse.json(
        { error: 'Amount and months are required' },
        { status: 400 }
      )
    }

    const principal = parseFloat(amount)
    const rate = parseFloat(interest_rate || '0')
    const period = parseInt(months)

    if (principal <= 0 || period <= 0) {
      return NextResponse.json(
        { error: 'Amount and months must be positive numbers' },
        { status: 400 }
      )
    }

    let monthlyPayment: number
    let totalPayment: number
    let totalInterest: number

    // If no interest, simple division
    if (rate === 0) {
      monthlyPayment = Math.round((principal / period) * 100) / 100
      totalPayment = principal
      totalInterest = 0
    } else {
      // Calculate using loan formula: P * [r(1+r)^n] / [(1+r)^n - 1]
      const monthlyRate = rate / 100 / 12
      const denominator = Math.pow(1 + monthlyRate, period) - 1

      if (denominator === 0) {
        monthlyPayment = Math.round((principal / period) * 100) / 100
        totalPayment = principal
        totalInterest = 0
      } else {
        monthlyPayment =
          Math.round(
            (principal * (monthlyRate * Math.pow(1 + monthlyRate, period))) /
              denominator *
              100
          ) / 100

        totalPayment = Math.round(monthlyPayment * period * 100) / 100
        totalInterest = Math.round((totalPayment - principal) * 100) / 100
      }
    }

    // Calculate repayment dates
    const today = new Date()
    const firstPaymentDate = new Date(today)
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1)
    firstPaymentDate.setDate(1) // First day of next month

    const finalPaymentDate = new Date(firstPaymentDate)
    finalPaymentDate.setMonth(finalPaymentDate.getMonth() + period - 1)

    // Generate payment schedule
    const schedule = []
    for (let i = 0; i < period; i++) {
      const paymentDate = new Date(firstPaymentDate)
      paymentDate.setMonth(paymentDate.getMonth() + i)

      const isLast = i === period - 1
      const paymentAmount = isLast
        ? Math.round((totalPayment - monthlyPayment * (period - 1)) * 100) / 100
        : monthlyPayment

      schedule.push({
        month: i + 1,
        date: paymentDate.toISOString().split('T')[0],
        amount: paymentAmount,
        principal: Math.round((paymentAmount - (totalInterest / period)) * 100) / 100,
        interest: Math.round((totalInterest / period) * 100) / 100
      })
    }

    return NextResponse.json({
      success: true,
      calculation: {
        principal_amount: principal,
        interest_rate: rate,
        period_months: period,
        monthly_payment: monthlyPayment,
        total_payment: totalPayment,
        total_interest: totalInterest,
        first_payment_date: firstPaymentDate.toISOString().split('T')[0],
        final_payment_date: finalPaymentDate.toISOString().split('T')[0]
      },
      schedule
    })
  } catch (error) {
    console.error('Error in loan calculation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
