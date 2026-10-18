import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { age, phone, university, address, photo_url } = body

    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('members_profile')
      .select('id, member_id')
      .eq('user_id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { data: profile, error: profileError } = await adminClient
        .from('members_profile')
        .update({
          age: parseInt(age),
          phone,
          university,
          address,
          photo_url
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (profileError) {
        console.error('Error updating profile:', profileError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      return NextResponse.json({ profile }, { status: 200 })
    }

    // Generate member ID using admin client (only for new profiles)
    const { data: memberIdData, error: memberIdError } = await adminClient
      .rpc('generate_member_id')

    if (memberIdError) {
      console.error('Error generating member ID:', memberIdError)
      return NextResponse.json({ error: 'Failed to generate member ID' }, { status: 500 })
    }

    const member_id = memberIdData as string

    // Create new profile
    const { data: profile, error: profileError } = await adminClient
      .from('members_profile')
      .insert({
        user_id: user.id,
        member_id,
        age: parseInt(age),
        phone,
        university,
        address,
        photo_url,
        monthly_due_amount: 100.00 // Default amount
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile, member_id }, { status: 201 })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
