"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabasePasskey: SupabaseClient | null = null;

export function getSupabasePasskeyClient() {
  if (!supabasePasskey) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase environment variables are missing.");
    }

    supabasePasskey = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        experimental: { passkey: true },
      },
    });
  }

  return supabasePasskey;
}
