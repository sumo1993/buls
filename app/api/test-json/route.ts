import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple JSON test',
    success: true,
    timestamp: new Date().toISOString()
  })
}