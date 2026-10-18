import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    console.log('Creating Supabase client...')
    console.log('URL:', supabaseUrl)
    console.log('Key length:', supabaseKey?.length)
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    
    console.log('Querying users table...')
    
    // Simple query to test connection
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Connected to Supabase successfully!',
      userCount: count,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      type: error.constructor.name
    }, { status: 500 })
  }
}
