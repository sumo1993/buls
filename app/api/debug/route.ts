import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  try {
    console.log('DEBUG: Checking auth...')
    const { userId } = await auth()
    console.log('DEBUG: userId:', userId)
    
    if (!userId) {
      console.log('DEBUG: No userId found, returning 401')
      return NextResponse.json({ 
        error: 'Unauthorized', 
        hasUserId: false,
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    console.log('DEBUG: User authenticated:', userId)
    return NextResponse.json({ 
      success: true,
      userId,
      timestamp: new Date().toISOString(),
      hasClerkKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkKeyLength: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV
    })
  } catch (error) {
    console.error('DEBUG: Error in auth check:', error)
    return NextResponse.json({ 
      error: 'Auth check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}