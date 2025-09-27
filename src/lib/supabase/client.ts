import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/db"

import { getSupabaseAnonKey, getSupabaseUrl } from "./env"

type ClientOptions = {
  accessToken?: string
  refreshToken?: string
}

export function createBrowserClient(options: ClientOptions = {}): SupabaseClient<Database> {
  const client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  if (options.accessToken) {
    void client.auth.setSession({
      access_token: options.accessToken,
      refresh_token: options.refreshToken ?? "",
    })
  }

  return client
}
