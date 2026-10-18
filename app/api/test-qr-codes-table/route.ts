import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    console.log('Creating Supabase client...')
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    
    // Check if qr_codes table exists
    const { data: tableData, error: tableError } = await supabase
      .from('qr_codes')
      .select('id, role, qr_code_url, payment_method, title, description, created_by', { count: 'exact', head: true })
      .limit(1)
    
    if (tableError) {
      console.error('Table check error:', tableError)
      
      // Check if table doesn't exist
      if (tableError.code === '42P01') {
        return NextResponse.json({
          exists: false,
          error: tableError.message,
          hint: tableError.hint,
          code: tableError.code
        }, { status: 404 })
      }
      
      return NextResponse.json({
        exists: true,
        error: 'Query failed: ' + tableError.message,
        hint: tableError.hint,
        code: tableError.code
      }, { status: 500 })
    }
    
    // Table exists, check row count
    const { count } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      exists: true,
      row_count: count || 0,
      sample: tableData ? tableData[0] : null
    })
    
  } catch (error: any) {
    console.error('Test failed:', error)
    return NextResponse.json({
      exists: false,
      error: error.message,
      type: error.constructor.name
    }, { status: 500 })
  }
}
