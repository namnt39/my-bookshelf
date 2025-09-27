import { listBooks, type BookStatus } from "@/lib/books"
import { listShelvesWithTiers } from "@/lib/shelves"

import { BooksClientShell } from "./pageClient"

interface BooksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const params = await Promise.resolve(searchParams)
  const view = typeof params.view === "string" ? params.view : "cards"
  const statusParam = typeof params.status === "string" ? params.status : undefined
  const allowedStatus: BookStatus[] = ["available", "borrowed", "archived"]
  const normalizedStatus =
    statusParam && allowedStatus.includes(statusParam as BookStatus)
      ? (statusParam as BookStatus)
      : undefined

  const q = typeof params.q === "string" ? params.q : undefined
  const shelfId = typeof params.shelfId === "string" ? params.shelfId : undefined
  const tierId = typeof params.tierId === "string" ? params.tierId : undefined
  const page = parseNumberParam(params.page, 1)
  const pageSize = parseNumberParam(params.pageSize, 20)

  const [{ books, total }, shelves] = await Promise.all([
    listBooks({ q, shelfId, tierId, status: normalizedStatus, page, pageSize }),
    listShelvesWithTiers(),
  ])

  return (
    <BooksClientShell
      view={view}
      filters={{ q, shelfId, tierId, status: normalizedStatus }}
      shelves={shelves}
      books={books}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  )
}

function parseNumberParam(value: string | string[] | undefined, fallback: number): number {
  if (typeof value !== "string") {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}
