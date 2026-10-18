import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  console.log('Webhook POST received')
  
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET not found in environment')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    console.log('Webhook secret found, reading headers...')

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    console.log('Svix headers:', { svix_id, svix_timestamp, has_signature: !!svix_signature })

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers')
      return new Response('Error occurred -- no svix headers', {
        status: 400,
      })
    }

    // Get the body
    console.log('Reading request body...')
    const payload = await req.json()
    const body = JSON.stringify(payload)
    console.log('Payload type:', payload.type)

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
      console.log('Verifying webhook signature...')
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
      console.log('Webhook verified successfully')
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return new Response('Error occurred - invalid signature', {
        status: 400,
      })
    }

    // Handle the webhook
    const eventType = evt.type

    console.log(`Webhook received: ${eventType}`)

  if (eventType === 'user.created') {
      console.log('Handling user.created event')
      const { id, email_addresses, first_name, last_name } = evt.data

      const email = email_addresses[0]?.email_address
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || email?.split('@')[0] || 'User'

      console.log('Creating user in Supabase:', { id, email, fullName })

      // Validate environment variables
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('NEXT_PUBLIC_SUPABASE_URL not found')
        return new Response('Supabase URL not configured', { status: 500 })
      }
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('SUPABASE_SERVICE_ROLE_KEY not found')
        return new Response('Supabase service key not configured', { status: 500 })
      }

      // Create Supabase admin client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      console.log('Supabase client created, inserting user...')

      // Create user in Supabase
      const { data, error } = await supabase.from('users').insert({
        clerk_id: id,
        email: email,
        full_name: fullName,
        role: 'member',
        status: 'pending',
      }).select()

      if (error) {
        console.error('Error creating user in Supabase:', error)
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log('User created successfully in Supabase:', data)
    }

  if (eventType === 'user.updated') {
      console.log('Handling user.updated event')
      const { id, email_addresses, first_name, last_name } = evt.data

      const email = email_addresses[0]?.email_address
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || email?.split('@')[0] || 'User'

      console.log('Updating user in Supabase:', { id, email, fullName })

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      const { error } = await supabase
        .from('users')
        .update({
          email: email,
          full_name: fullName,
        })
        .eq('clerk_id', id)

      if (error) {
        console.error('Error updating user in Supabase:', error)
      } else {
        console.log('User updated successfully')
      }
    }

    if (eventType === 'user.deleted') {
      console.log('Handling user.deleted event')
      const { id } = evt.data

      console.log('Deleting user from Supabase:', id)

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      const { error } = await supabase.from('users').delete().eq('clerk_id', id)

      if (error) {
        console.error('Error deleting user from Supabase:', error)
      } else {
        console.log('User deleted successfully')
      }
    }

    console.log('Webhook processed successfully')
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Unexpected error in webhook handler:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
