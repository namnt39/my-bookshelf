import { chunk } from "./collections"
import { PreparedBookRow } from "./csv"
import { getCoversBucket, isSupabaseConfigured } from "./supabase/env"
import { createServerClient } from "./supabase/server"

import type { Database } from "@/types/db"

export type BookStatus = "available" | "borrowed" | "archived"

export interface BookRecord {
  id: string
  title: string
  author?: string | null
  isbn?: string | null
  summary?: string | null
  note?: string | null
  cover_storage_path?: string | null
  cover_external_url?: string | null
  cover_url?: string | null
  shelf?: { id: string; name: string } | null
  tier?: { id: string; tier_name: string; position: number } | null
  /**
   * @deprecated Use `tier` instead. Provided for backwards compatibility with older UI components.
   */
  level?: { id: string; name: string } | null
  borrower?: { id: string; display_name: string; phone?: string | null } | null
  active_loan?: { id: string; borrowed_at: string; returned_at?: string | null; note?: string | null } | null
  is_archived: boolean
  status: BookStatus
  created_at: string
  updated_at: string
}

export interface ListBooksParams {
  q?: string
  shelfId?: string
  tierId?: string
  status?: BookStatus
  page?: number
  pageSize?: number
}

export interface ListBooksResult {
  books: BookRecord[]
  total: number
}

type BookRow = Database["public"]["Tables"]["books"]["Row"]
type ShelfRow = Database["public"]["Tables"]["shelves"]["Row"]
type TierRow = Database["public"]["Tables"]["shelf_tiers"]["Row"]
type LoanRow = Database["public"]["Tables"]["loans"]["Row"]
type BorrowerRow = Database["public"]["Tables"]["borrowers"]["Row"]

interface SupabaseBookRow extends BookRow {
  shelves: ShelfRow | null
  shelf_tiers: TierRow | null
  loans: (LoanRow & { borrowers: BorrowerRow | null })[] | null
}

export async function listBooks(params: ListBooksParams = {}): Promise<ListBooksResult> {
  if (!isSupabaseConfigured()) {
    return { books: [], total: 0 }
  }

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const rangeEnd = offset + pageSize - 1
  const supabase = createServerClient()

  try {
    let query = supabase
      .from("books")
      .select(
        `id,isbn,title,author,summary,note,cover_storage_path,cover_external_url,shelf_id,shelf_tier_id,is_archived,created_at,updated_at,
          shelves:shelf_id (id,name),
          shelf_tiers:shelf_tier_id (id,tier_name,position),
          loans:loans (id,borrower_id,borrowed_at,returned_at,note,borrowers:borrowers (id,display_name,phone))
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, rangeEnd)

    if (params.q) {
      const escaped = params.q.replace(/[,]/g, "").trim()
      if (escaped) {
        query = query.or(
          `title.ilike.%${escaped}%,author.ilike.%${escaped}%,isbn.ilike.%${escaped}%`,
        )
      }
    }

    if (params.shelfId) {
      query = query.eq("shelf_id", params.shelfId)
    }

    if (params.tierId) {
      query = query.eq("shelf_tier_id", params.tierId)
    }

    if (params.status === "archived") {
      query = query.eq("is_archived", true)
    } else if (params.status === "borrowed") {
      query = query.eq("is_archived", false).eq("loans.returned_at", null)
    } else if (params.status === "available") {
      query = query
        .eq("is_archived", false)
        .or("loans.returned_at.not.is.null,loans.id.is.null")
    }

    const { data, error, count } = await query
    if (error) {
      console.warn("Failed to fetch books", error)
      return { books: [], total: 0 }
    }

    const rows = (data ?? []) as SupabaseBookRow[]
    const coverPaths = Array.from(
      new Set(
        rows
          .map((row) => row.cover_storage_path)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    )

    const signedUrlMap = new Map<string, string>()
    if (coverPaths.length) {
      const { data: signedUrls, error: signedError } = await supabase.storage
        .from(getCoversBucket())
        .createSignedUrls(coverPaths, 60 * 60)
      if (!signedError && signedUrls) {
        signedUrls.forEach((item) => {
          if (item.signedUrl) {
            signedUrlMap.set(item.path, item.signedUrl)
          }
        })
      }
    }

    const books: BookRecord[] = rows.map((row) => {
      const loans = row.loans ?? []
      const activeLoan = loans.find((loan) => loan.returned_at === null)
      const borrower = activeLoan?.borrowers ?? null
      const status: BookStatus = row.is_archived
        ? "archived"
        : activeLoan
          ? "borrowed"
          : "available"

      const coverUrl = row.cover_external_url
        ?? (row.cover_storage_path ? signedUrlMap.get(row.cover_storage_path) ?? null : null)

      return {
        id: row.id,
        title: row.title ?? "Untitled",
        author: row.author ?? null,
        isbn: row.isbn ?? null,
        summary: row.summary ?? null,
        note: row.note ?? null,
        cover_storage_path: row.cover_storage_path ?? null,
        cover_external_url: row.cover_external_url ?? null,
        cover_url: coverUrl,
        shelf: row.shelves ? { id: row.shelves.id, name: row.shelves.name } : null,
        tier: row.shelf_tiers
          ? {
              id: row.shelf_tiers.id,
              tier_name: row.shelf_tiers.tier_name,
              position: row.shelf_tiers.position,
            }
          : null,
        level: row.shelf_tiers
          ? {
              id: row.shelf_tiers.id,
              name: row.shelf_tiers.tier_name,
            }
          : null,
        borrower: borrower
          ? {
              id: borrower.id,
              display_name: borrower.display_name,
              phone: borrower.phone ?? null,
            }
          : null,
        active_loan: activeLoan
          ? {
              id: activeLoan.id,
              borrowed_at: activeLoan.borrowed_at,
              returned_at: activeLoan.returned_at ?? null,
              note: activeLoan.note ?? null,
            }
          : null,
        is_archived: row.is_archived,
        status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
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

interface BookInsertPayload {
  title: string
  author?: string | null
  isbn?: string | null
  cover_external_url?: string | null
  shelf_id?: string | null
  shelf_tier_id?: string | null
  note?: string | null
}

interface ShelfCacheValue {
  shelf_id: string
  shelf_tier_id?: string | null
}

async function ensureShelfAndTier(
  supabase: ReturnType<typeof createServerClient>,
  shelfName?: string | null,
  tierName?: string | null,
  cache = new Map<string, ShelfCacheValue>(),
): Promise<ShelfCacheValue | null> {
  if (!shelfName) return null
  const key = `${shelfName.toLowerCase()}::${tierName?.toLowerCase() ?? ""}`
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

  if (!tierName) {
    const result = { shelf_id: shelfId, shelf_tier_id: null }
    cache.set(key, result)
    return result
  }

  const { data: existingTier, error: tierError } = await supabase
    .from("shelf_tiers")
    .select("id")
    .eq("shelf_id", shelfId)
    .eq("tier_name", tierName)
    .maybeSingle()
  if (tierError && tierError.code !== "PGRST116") {
    throw new Error(tierError.message)
  }

  let tierId = existingTier?.id
  if (!tierId) {
    const { data: insertedTier, error: insertTierError } = await supabase
      .from("shelf_tiers")
      .insert({ shelf_id: shelfId, tier_name: tierName })
      .select("id")
      .single()
    if (insertTierError) {
      throw new Error(insertTierError.message)
    }
    tierId = insertedTier.id
  }

  const result = { shelf_id: shelfId, shelf_tier_id: tierId }
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
  const supabase = createServerClient()
  const batchSize = options.batchSize ?? 200
  const onDuplicate = options.onDuplicate ?? "skip"
  const errorRows: BulkInsertErrorRow[] = []
  let okCount = 0

  const cache = new Map<string, ShelfCacheValue>()
  const enumerated = rows.map((row, index) => ({ row, index }))

  for (const group of chunk(enumerated, batchSize)) {
    const payload: { data: BookInsertPayload; index: number }[] = []
    for (const { row, index } of group) {
      if (!row.title) {
        errorRows.push({ index, message: "Missing title" })
        continue
      }
      let shelfIds: ShelfCacheValue | null = null
      try {
        if (row.shelf) {
          shelfIds = await ensureShelfAndTier(supabase, row.shelf, row.tier ?? row.level, cache)
        }
      } catch (error) {
        errorRows.push({
          index,
          message: error instanceof Error ? error.message : "Failed to ensure shelf/tier",
        })
        continue
      }

      payload.push({
        index,
        data: {
          title: row.title,
          author: row.author ?? null,
          isbn: row.isbn ?? null,
          cover_external_url: row.cover_url ?? null,
          shelf_id: shelfIds?.shelf_id ?? null,
          shelf_tier_id: shelfIds?.shelf_tier_id ?? null,
          note: row.note ?? null,
        },
      })
    }

    if (!payload.length) {
      continue
    }

    const mutation = supabase.from("books").upsert(
      payload.map((item) => item.data),
      {
        onConflict: "isbn",
        ignoreDuplicates: onDuplicate === "skip",
      },
    )

    const { error } = await mutation
    if (error) {
      payload.forEach(({ index }) => {
        errorRows.push({
          index,
          message: error.message,
        })
      })
      continue
    }

    okCount += payload.length
  }

  return { okCount, errorRows }
}
