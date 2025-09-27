import { listBooks, type BookStatus } from "@/lib/books"
import { listShelvesWithLevels } from "@/lib/shelves"

import { BooksClientShell } from "./pageClient"

interface BooksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await Promise.resolve(searchParams)
  const view = typeof params.view === "string" ? params.view : "cards"
  const statusParam = typeof params.status === "string" ? (params.status as string) : undefined
  const allowedStatus: BookStatus[] = ["available", "loaned", "archived"]
  const filters = {
    q: typeof params.q === "string" ? params.q : undefined,
    shelf_id: typeof params.shelf_id === "string" ? params.shelf_id : undefined,
    level_id: typeof params.level_id === "string" ? params.level_id : undefined,
    status: statusParam && allowedStatus.includes(statusParam as BookStatus) ? (statusParam as BookStatus) : undefined,
  }

  const [{ books, total }, shelves] = await Promise.all([
    listBooks(filters),
    listShelvesWithLevels(),
  ])

  return (
    <BooksClientShell
      view={view}
      filters={filters}
      shelves={shelves}
      books={books}
      total={total}
    />
  )
}
