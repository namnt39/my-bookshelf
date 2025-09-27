import { chunk } from "./collections"
import { PreparedBookRow } from "./csv"
import { createServerSupabaseClient, isSupabaseConfigured } from "./supabaseClient"

export type BookStatus = "available" | "loaned" | "archived"

export interface BookRecord {
  id: string
  title: string
  author?: string | null
  isbn?: string | null
  cover_url?: string | null
  status?: BookStatus | null
  created_at?: string
  shelf?: { id: string; name: string } | null
  level?: { id: string; name: string } | null
  borrower?: { id: string; full_name?: string | null } | null
  loan?: { id: string; due_at?: string | null } | null
}

export interface ListBooksParams {
  q?: string
  shelf_id?: string
  level_id?: string
  status?: BookStatus
  limit?: number
  offset?: number
}

export interface ListBooksResult {
  books: BookRecord[]
  total: number
}

export async function listBooks(params: ListBooksParams = {}): Promise<ListBooksResult> {
  const { q, shelf_id, level_id, status, limit = 24, offset = 0 } = params
  if (!isSupabaseConfigured()) {
    return { books: [], total: 0 }
  }
  const supabase = createServerSupabaseClient()

  try {
    let query = supabase
      .from("books")
      .select(
        "id,title,author,isbn,cover_url,status,created_at,shelves!books_shelf_id_fkey(id,name),shelf_levels!books_shelf_level_id_fkey(id,name),borrowers!books_borrower_id_fkey(id,full_name),loans(id,due_at)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (q) {
      const escaped = q.replace(/[,]/g, "")
      query = query.or(
        `title.ilike.%${escaped}%,author.ilike.%${escaped}%,isbn.ilike.%${escaped}%`,
        { referencedTable: "books" },
      )
    }

    if (shelf_id) {
      query = query.eq("shelf_id", shelf_id)
    }
    if (level_id) {
      query = query.eq("shelf_level_id", level_id)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query
    if (error) {
      console.warn("Failed to fetch books", error)
      return { books: [], total: 0 }
    }

    const rawRows = (data ?? []) as Record<string, unknown>[]
    const books: BookRecord[] = rawRows.map((row) => {
      const typed = row as unknown as SupabaseBookRow
      const shelf = typed.shelves as SupabaseBookRow["shelves"]
      const level = typed.shelf_levels as SupabaseBookRow["shelf_levels"]
      const borrower = typed.borrowers as SupabaseBookRow["borrowers"]
      const loan = typed.loans as SupabaseBookRow["loans"]

      return {
        id: typed.id,
        title: typed.title,
        author: typed.author ?? null,
        isbn: typed.isbn ?? null,
        cover_url: typed.cover_url ?? null,
        status: typed.status ?? null,
        created_at: typed.created_at,
        shelf: shelf ? { id: shelf.id, name: shelf.name } : null,
        level: level ? { id: level.id, name: level.name } : null,
        borrower: borrower ? { id: borrower.id, full_name: borrower.full_name } : null,
        loan: loan ? { id: loan.id, due_at: loan.due_at } : null,
      } satisfies BookRecord
    })

    return {
      books,
      total: count ?? books.length,
    }
  } catch (error) {
    console.warn("Failed to load books", error)
    return { books: [], total: 0 }
  }
}

export interface BulkInsertOptions {
  batchSize?: number
  onDuplicate?: "skip" | "update"
}

export interface BulkInsertErrorRow {
  index: number
  message: string
}

export interface BulkInsertResult {
  okCount: number
  errorRows: BulkInsertErrorRow[]
}

interface SupabaseBookRow {
  id: string
  title: string
  author?: string | null
  isbn?: string | null
  cover_url?: string | null
  status?: BookStatus | null
  created_at?: string
  shelves?: { id: string; name: string } | null
  shelf_levels?: { id: string; name: string } | null
  borrowers?: { id: string; full_name?: string | null } | null
  loans?: { id: string; due_at?: string | null } | null
}

interface BookInsertPayload {
  title: string
  author?: string | null
  isbn?: string | null
  cover_url?: string | null
  shelf_id?: string | null
  shelf_level_id?: string | null
  note?: string | null
}

interface ShelfCacheValue {
  shelf_id: string
  shelf_level_id?: string | null
}

async function ensureShelfAndLevel(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  shelfName?: string | null,
  levelName?: string | null,
  cache = new Map<string, ShelfCacheValue>(),
): Promise<ShelfCacheValue | null> {
  if (!shelfName) return null
  const key = `${shelfName.toLowerCase()}::${levelName?.toLowerCase() ?? ""}`
  if (cache.has(key)) {
    return cache.get(key) ?? null
  }

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
    const { data: insertedShelf, error: insertShelfError } = await supabase
      .from("shelves")
      .insert({ name: shelfName })
      .select("id")
      .single()
    if (insertShelfError) {
      throw new Error(insertShelfError.message)
    }
    shelfId = insertedShelf.id
  }

  if (!levelName) {
    const result = { shelf_id: shelfId, shelf_level_id: null }
    cache.set(key, result)
    return result
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

  let levelId = existingLevel?.id
  if (!levelId) {
    const { data: insertedLevel, error: insertLevelError } = await supabase
      .from("shelf_levels")
      .insert({ shelf_id: shelfId, name: levelName })
      .select("id")
      .single()
    if (insertLevelError) {
      throw new Error(insertLevelError.message)
    }
    levelId = insertedLevel.id
  }

  const result = { shelf_id: shelfId, shelf_level_id: levelId }
  cache.set(key, result)
  return result
}

export async function bulkInsertBooks(
  rows: PreparedBookRow[],
  options: BulkInsertOptions = {},
): Promise<BulkInsertResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }
  const supabase = createServerSupabaseClient()
  const batchSize = options.batchSize ?? 200
  const onDuplicate = options.onDuplicate ?? "skip"
  const errorRows: BulkInsertErrorRow[] = []
  let okCount = 0

  const cache = new Map<string, ShelfCacheValue>()

  for (const group of chunk(rows, batchSize)) {
    const payload: BookInsertPayload[] = []
    for (const row of group) {
      if (!row.title) {
        errorRows.push({ index: okCount + payload.length, message: "Missing title" })
        continue
      }
      let shelfIds: ShelfCacheValue | null = null
      try {
        if (row.shelf) {
          shelfIds = await ensureShelfAndLevel(supabase, row.shelf, row.level, cache)
        }
      } catch (error) {
        errorRows.push({
          index: okCount + payload.length,
          message: error instanceof Error ? error.message : "Failed to ensure shelf/level",
        })
        continue
      }

      payload.push({
        title: row.title,
        author: row.author,
        isbn: row.isbn,
        cover_url: row.cover_url,
        shelf_id: shelfIds?.shelf_id ?? null,
        shelf_level_id: shelfIds?.shelf_level_id ?? null,
        note: row.note,
      })
    }

    if (!payload.length) {
      continue
    }

    const mutation = supabase.from("books").upsert(payload, {
      onConflict: "isbn",
      ignoreDuplicates: onDuplicate === "skip",
    })

    const { error } = await mutation
    if (error) {
      payload.forEach((_, index) => {
        errorRows.push({
          index: okCount + index,
          message: error.message,
        })
      })
      continue
    }

    okCount += payload.length
  }

  return { okCount, errorRows }
}
