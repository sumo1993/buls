import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Testing Supabase admin connection...')
    console.log('URL:', supabaseUrl)
    console.log('Service key:', serviceRoleKey ? 'SET (' + serviceRoleKey.substring(0, 20) + '...)' : 'MISSING')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          url: !!supabaseUrl,
          key: !!serviceRoleKey
        }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test 1: List users (requires admin access)
    console.log('Test 1: Listing users...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })

    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json({
        success: false,
        error: 'Failed to list users',
        details: listError
      })
    }

    console.log('Users listed successfully, count:', users?.users?.length || 0)

    // Test 2: Query database
    console.log('Test 2: Querying database...')
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: dbError
      })
    }

    console.log('Database query successful')

    return NextResponse.json({
      success: true,
      message: 'Supabase admin connection working!',
      tests: {
        auth: 'OK',
        database: 'OK',
        userCount: users?.users?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}
