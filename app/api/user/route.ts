import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserOrSync } from '@/lib/server/auto-sync-user'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Automatically sync user if not exists (server-side)
    const user = await getUserOrSync(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 })
    }

    // Return user data
    return NextResponse.json(user)
    
  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const isNetworkError = /fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(message)
    return NextResponse.json(
      { error: message },
      { status: isNetworkError ? 503 : 500 }
    )
  }
}
