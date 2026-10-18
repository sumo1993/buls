import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('union_ranks')
      .select('*')
      .order('rank_level', { ascending: false })

    if (error) {
      console.error('Error fetching ranks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching ranks:', error)
    return NextResponse.json({ error: 'Failed to fetch ranks' }, { status: 500 })
  }
}
