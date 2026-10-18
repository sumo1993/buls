import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Testing Supabase connection...')
    console.log('URL:', url)
    console.log('Key exists:', !!key)
    console.log('Key length:', key?.length)
    console.log('Key preview:', key?.substring(0, 50) + '...')
    
    if (!url || !key) {
      return NextResponse.json({
        error: 'Missing environment variables',
        url: !!url,
        key: !!key
      }, { status: 500 })
    }
    
    // Try to create client
    const supabase = createClient(url, key)
    
    // Try a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: error.hint
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connected successfully!',
      data
    })
    
  } catch (error: any) {
    console.error('Connection test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
