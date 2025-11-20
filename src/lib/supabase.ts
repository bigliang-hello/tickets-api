import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ENV } from './env'

let client: SupabaseClient | null = null

export function getSupabase() {
  if (!client) {
    client = createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_SERVICE_ROLE_KEY(), {
      auth: { persistSession: false },
    })
  }
  return client
}