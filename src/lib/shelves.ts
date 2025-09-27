import { createServerSupabaseClient, isSupabaseConfigured } from "./supabaseClient"

export interface Shelf {
  id: string
  name: string
}

export interface ShelfLevel {
  id: string
  shelf_id: string
  name: string
}

export interface ShelfWithLevels extends Shelf {
  levels: ShelfLevel[]
}

export async function listShelvesWithLevels(): Promise<ShelfWithLevels[]> {
  if (!isSupabaseConfigured()) {
    return []
  }
  const supabase = createServerSupabaseClient()
  try {
    const { data, error } = await supabase
      .from("shelves")
      .select("id,name,shelf_levels(id,name)")
      .order("name", { ascending: true })
    if (error) {
      console.warn("Failed to fetch shelves", error)
      return []
    }
    return (data ?? []).map((shelf) => ({
      id: shelf.id,
      name: shelf.name,
      levels: (shelf.shelf_levels ?? []).map((level) => ({
        id: level.id,
        shelf_id: shelf.id,
        name: level.name,
      })),
    }))
  } catch (error) {
    console.warn("Failed to load shelves", error)
    return []
  }
}

export interface EnsureShelfLevelInput {
  shelfName: string
  levelName?: string | null
}

export interface EnsureShelfLevelResult {
  shelf_id: string
  shelf_level_id?: string | null
}

export async function ensureShelfLevel(
  input: EnsureShelfLevelInput,
): Promise<EnsureShelfLevelResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }
  const supabase = createServerSupabaseClient()
  const { shelfName, levelName } = input

  const { data: existingShelf, error: shelfError } = await supabase
    .from("shelves")
    .select("id")
    .eq("name", shelfName)
    .maybeSingle()
  if (shelfError && shelfError.code !== "PGRST116") {
    throw new Error(shelfError.message)
  }

  let shelfId = existingShelf?.id

  if (!shelfId) {
    const { data: createdShelf, error: createShelfError } = await supabase
      .from("shelves")
      .insert({ name: shelfName })
      .select("id")
      .single()
    if (createShelfError) {
      throw new Error(createShelfError.message)
    }
    shelfId = createdShelf.id
  }

  if (!levelName) {
    return { shelf_id: shelfId, shelf_level_id: null }
  }

  const { data: existingLevel, error: levelError } = await supabase
    .from("shelf_levels")
    .select("id")
    .eq("shelf_id", shelfId)
    .eq("name", levelName)
    .maybeSingle()
  if (levelError && levelError.code !== "PGRST116") {
    throw new Error(levelError.message)
  }

  if (existingLevel?.id) {
    return { shelf_id: shelfId, shelf_level_id: existingLevel.id }
  }

  const { data: createdLevel, error: createLevelError } = await supabase
    .from("shelf_levels")
    .insert({ shelf_id: shelfId, name: levelName })
    .select("id")
    .single()

  if (createLevelError) {
    throw new Error(createLevelError.message)
  }

  return { shelf_id: shelfId, shelf_level_id: createdLevel.id }
}
