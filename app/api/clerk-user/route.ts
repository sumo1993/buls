import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = user.emailAddresses[0]?.emailAddress || ''
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0] || 'User'

    return NextResponse.json({
      id: user.id,
      email,
      fullName,
      firstName: user.firstName,
      lastName: user.lastName,
    })
  } catch (error) {
    console.error('Error fetching Clerk user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
