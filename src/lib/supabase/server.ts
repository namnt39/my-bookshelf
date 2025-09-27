import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/db"

import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "./env"

export interface ServerClientOptions {
  serviceRole?: boolean
}

export function createServerClient(options: ServerClientOptions = {}): SupabaseClient<Database> {
  const { serviceRole = true } = options
  const key = serviceRole ? getSupabaseServiceRoleKey() ?? getSupabaseAnonKey() : getSupabaseAnonKey()

  return createClient<Database>(getSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "X-Client-Info": "my-bookshelf-server",
      },
    },
  })
}
