import { NextResponse } from 'next/server'
import { query } from '@/lib/db/postgres'

export async function GET() {
  try {
    console.log('Testing direct database connection...')
    
    // Test simple query
    const result = await query('SELECT NOW() as current_time, version() as pg_version')
    
    // Test if users table exists
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    const tables = tableCheck.rows.map((row: any) => row.table_name)
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].pg_version,
      tables: tables,
      tablesCount: tables.length
    })
    
  } catch (error: any) {
    console.error('Database connection test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}
