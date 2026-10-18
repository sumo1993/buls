import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { viewMode } = await request.json()

    if (!viewMode || !['role', 'member'].includes(viewMode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid view mode' },
        { status: 400 }
      )
    }

    // Set cookie to persist view mode across page reloads
    const response = NextResponse.json({ success: true })
    response.cookies.set('viewMode', viewMode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch (error) {
    console.error('Error setting view mode:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
