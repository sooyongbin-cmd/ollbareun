import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase admin environment variables are missing.");
    }

    supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        experimental: { passkey: true },
      },
    });
  }

  return supabaseAdmin;
}
