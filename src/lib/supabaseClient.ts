import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type TokenStore = {
  access_token?: string
  refresh_token?: string
}

function normalizeEnv(value: string | undefined) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return undefined
  }
  return trimmed
}

export function isSupabaseConfigured(): boolean {
  return Boolean(normalizeEnv(SUPABASE_URL) && normalizeEnv(SUPABASE_ANON_KEY))
}

function resolveEnv() {
  const url = normalizeEnv(SUPABASE_URL)
  const key = normalizeEnv(SUPABASE_ANON_KEY)
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured")
  }
  return { url, key }
}

export function createSupabaseClient(tokenStore?: TokenStore): SupabaseClient {
  const { url, key } = resolveEnv()
  return createClient(url, key, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      ...(tokenStore?.access_token
        ? {
            autoRefreshToken: true,
            storage: {
              getItem(key) {
                if (key === "sb-access-token") {
                  return tokenStore.access_token ?? null
                }
                if (key === "sb-refresh-token") {
                  return tokenStore.refresh_token ?? null
                }
                return null
              },
              setItem() {
                return
              },
              removeItem() {
                return
              },
            },
          }
        : {}),
    },
  })
}

export function createServerSupabaseClient(tokenStore?: TokenStore): SupabaseClient {
  if (tokenStore?.access_token || tokenStore?.refresh_token) {
    return createSupabaseClient(tokenStore)
  }
  return createSupabaseClient()
}

export function createBrowserSupabaseClient(): SupabaseClient {
  return createSupabaseClient()
}
