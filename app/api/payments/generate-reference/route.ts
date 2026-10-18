import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Generate a reference code for a payment (without creating the payment record)
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.error('Unauthorized: No userId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { month, year } = body

    console.log('Generating reference code request:', { month, year, userId })

    if (!month || !year) {
      console.error('Missing required fields:', { month, year })
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    
    // Generate reference code
    const { data: referenceCode, error: refError } = await adminClient
      .rpc('generate_reference_code', {
        p_year: parseInt(year),
        p_month: month
      })

    console.log('RPC result:', { referenceCode, refError })

    if (refError) {
      console.error('Error generating reference code:', refError)
      return NextResponse.json({ error: refError.message || 'Failed to generate reference code' }, { status: 500 })
    }

    console.log('Reference code generated successfully:', referenceCode)
    return NextResponse.json({ reference_code: referenceCode }, { status: 200 })
  } catch (error) {
    console.error('Error in generate-reference route:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
