import { createClient } from '@supabase/supabase-js'

// Singleton pattern for Supabase client to avoid creating multiple connections
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          headers: {
            'x-application-name': 'buls-management'
          }
        }
      }
    )
  }
  return supabaseClient
}
