import { createClient } from "@supabase/supabase-js";

// Server-only. The secret key bypasses Row Level Security, so this client
// must never be imported into a component that runs in the browser.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
