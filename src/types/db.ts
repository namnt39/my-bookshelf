export interface Shelf {
  id: string
  name: string
  created_at: string
}

export interface ShelfTier {
  id: string
  shelf_id: string
  tier_name: string
  position: number
  created_at: string
}

export interface Borrower {
  id: string
  display_name: string
  phone?: string | null
  note?: string | null
  created_at: string
}

export interface Book {
  id: string
  isbn?: string | null
  title?: string | null
  author?: string | null
  summary?: string | null
  cover_storage_path?: string | null
  cover_external_url?: string | null
  shelf_id?: string | null
  shelf_tier_id?: string | null
  note?: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  book_id: string
  borrower_id: string
  borrowed_at: string
  returned_at?: string | null
  note?: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      shelves: {
        Row: Shelf
        Insert: Partial<Omit<Shelf, "id" | "created_at">> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Shelf>
      }
      shelf_tiers: {
        Row: ShelfTier
        Insert: Partial<Omit<ShelfTier, "id" | "created_at" | "position">> & {
          id?: string
          position?: number
          created_at?: string
        }
        Update: Partial<ShelfTier>
      }
      borrowers: {
        Row: Borrower
        Insert: Partial<Omit<Borrower, "id" | "created_at">> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Borrower>
      }
      books: {
        Row: Book
        Insert: Partial<Omit<Book, "id" | "created_at" | "updated_at" | "is_archived">> & {
          id?: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
        }
        Update: Partial<Book>
      }
      loans: {
        Row: Loan
        Insert: Partial<Omit<Loan, "id" | "created_at">> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Loan>
      }
    }
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
    Enums: Record<string, unknown>
    CompositeTypes: Record<string, unknown>
  }
}
