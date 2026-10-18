import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOrSyncUser } from '@/lib/sync-user'

export async function POST() {
  try {
    console.log('🔄 Manual sync requested')
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 Syncing user:', userId)
    const result = await getOrSyncUser(userId)
    
    console.log('📊 Sync result:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Manual sync error:', error)
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
