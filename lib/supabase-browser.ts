import { createClient } from '@supabase/supabase-js'
import { viewAsClientId, viewAsSupabaseFetch } from '@/lib/portal/view-as'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function getSupabaseBrowser() {
  // Staff previewing a client: table reads go through the pinned proxy.
  const viewAs = viewAsClientId()
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    ...(viewAs ? { global: { fetch: viewAsSupabaseFetch(supabaseUrl, viewAs) } } : {}),
  })
}
