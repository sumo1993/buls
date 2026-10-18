import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Debug endpoint to check Clerk session status
 */
export async function GET() {
  try {
    const { userId, sessionId, getToken } = await auth()
    
    console.log('Clerk auth result:', { userId, sessionId })
    
    // Try to get a token
    let token = null
    try {
      token = await getToken({ template: 'slug' })
    } catch (e) {
      console.log('Token error:', e)
    }

    return NextResponse.json({
      userId,
      sessionId,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      isSignedIn: !!userId
    })
  } catch (error) {
    console.error('Clerk status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
