import { PostgrestMaybeSingleResponse, PostgrestSingleResponse } from "@supabase/supabase-js"

import { isSupabaseConfigured } from "./supabase/env"
import { createServerClient } from "./supabase/server"

import type { Database, ShelfTier as ShelfTierRow } from "@/types/db"

export interface Shelf {
  id: string
  name: string
}

export interface ShelfTier {
  id: string
  shelf_id: string
  tier_name: string
  position: number
}

export interface ShelfWithTiers extends Shelf {
  tiers: ShelfTier[]
  /**
   * @deprecated Use `tiers` instead. Kept for backwards compatibility with legacy components.
   */
  levels?: (ShelfTier & { name: string })[]
}

type SupabaseShelfRow = Database["public"]["Tables"]["shelves"]["Row"] & {
  shelf_tiers: ShelfTierRow[] | null
}

export async function listShelvesWithTiers(): Promise<ShelfWithTiers[]> {
  if (!isSupabaseConfigured()) {
    return []
  }
  const supabase = createServerClient()
  try {
    const { data, error } = await supabase
      .from("shelves")
      .select("id,name,shelf_tiers(id,shelf_id,tier_name,position)")
      .order("name", { ascending: true })
    if (error) {
      console.warn("Failed to fetch shelves", error)
      return []
    }

    return (data as SupabaseShelfRow[] | null ?? []).map((shelf) => {
      const tiers = (shelf.shelf_tiers ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((tier) => ({
          id: tier.id,
          shelf_id: tier.shelf_id,
          tier_name: tier.tier_name,
          position: tier.position,
        }))

      return {
        id: shelf.id,
        name: shelf.name,
        tiers,
        levels: tiers.map((tier) => ({ ...tier, name: tier.tier_name })),
      }
    })
  } catch (error) {
    console.warn("Failed to load shelves", error)
    return []
  }
}

export interface EnsureShelfTierInput {
  shelfName: string
  tierName?: string | null
}

export interface EnsureShelfTierResult {
  shelf_id: string
  shelf_tier_id?: string | null
}

export async function ensureShelfTier(
  input: EnsureShelfTierInput,
): Promise<EnsureShelfTierResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }
  const supabase = createServerClient()
  const { shelfName, tierName } = input

  const shelfResponse = await supabase
    .from("shelves")
    .select("id")
    .eq("name", shelfName)
    .maybeSingle()
  const { data: existingShelf, error: shelfError } = shelfResponse as PostgrestMaybeSingleResponse<
    Pick<Database["public"]["Tables"]["shelves"]["Row"], "id">
  >
  if (shelfError && shelfError.code !== "PGRST116") {
    throw new Error(shelfError.message)
  }

  let shelfId = existingShelf?.id

  if (!shelfId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertShelfResponse = await (supabase.from("shelves") as any)
      .insert({ name: shelfName })
      .select("id")
      .single()
    const { data: createdShelf, error: createShelfError } = insertShelfResponse as PostgrestSingleResponse<
      Pick<Database["public"]["Tables"]["shelves"]["Row"], "id">
    >
    if (createShelfError) {
      throw new Error(createShelfError.message)
    }
    shelfId = createdShelf.id
  }

  if (!tierName) {
    return { shelf_id: shelfId, shelf_tier_id: null }
  }

  const tierResponse = await supabase
    .from("shelf_tiers")
    .select("id")
    .eq("shelf_id", shelfId)
    .eq("tier_name", tierName)
    .maybeSingle()
  const { data: existingTier, error: tierError } = tierResponse as PostgrestMaybeSingleResponse<
    Pick<ShelfTierRow, "id">
  >
  if (tierError && tierError.code !== "PGRST116") {
    throw new Error(tierError.message)
  }

  if (existingTier?.id) {
    return { shelf_id: shelfId, shelf_tier_id: existingTier.id }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertTierResponse = await (supabase.from("shelf_tiers") as any)
    .insert({ shelf_id: shelfId, tier_name: tierName })
    .select("id")
    .single()
  const { data: createdTier, error: createTierError } = insertTierResponse as PostgrestSingleResponse<
    Pick<ShelfTierRow, "id">
  >

  if (createTierError) {
    throw new Error(createTierError.message)
  }

  return { shelf_id: shelfId, shelf_tier_id: createdTier.id }
}

// Temporary alias to maintain backwards compatibility with earlier helpers
export const listShelvesWithLevels = listShelvesWithTiers
export type ShelfWithLevels = ShelfWithTiers
export type ShelfLevel = ShelfTier
export const ensureShelfLevel = ensureShelfTier
