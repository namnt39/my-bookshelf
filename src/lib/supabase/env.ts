function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return undefined
  }
  return trimmed
}

export function getSupabaseUrl(): string {
  const value = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  }
  return value
}

export function getSupabaseAnonKey(): string {
  const value = normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  }
  return value
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return normalize(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getCoversBucket(): string {
  return normalize(process.env.NEXT_PUBLIC_SUPABASE_COVERS_BUCKET) ?? "covers"
}

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseUrl()
    getSupabaseAnonKey()
    return true
  } catch {
    return false
  }
}
