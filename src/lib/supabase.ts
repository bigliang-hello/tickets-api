import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ENV } from './env'
import type { Database } from './db.types'

let client: SupabaseClient<Database> | null = null

export function getSupabase() {
  if (!client) {
    client = createClient<Database>(ENV.SUPABASE_URL(), ENV.SUPABASE_SERVICE_ROLE_KEY(), {
      auth: { persistSession: false },
    })
  }
  return client
}