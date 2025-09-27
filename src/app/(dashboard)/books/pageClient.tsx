"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { BookGrid } from "@/components/books/BookGrid"
import { BookTable } from "@/components/books/BookTable"
import { FiltersCollapse, type FiltersState } from "@/components/books/FiltersCollapse"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BookRecord } from "@/lib/books"
import type { ShelfWithTiers } from "@/lib/shelves"

export interface BooksClientShellProps {
  view: string
  filters: FiltersState
  books: BookRecord[]
  shelves: ShelfWithTiers[]
  total: number
  page: number
  pageSize: number
}

export function BooksClientShell({ view, filters, books, shelves, total, page, pageSize }: BooksClientShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentView = useMemo(() => (view === "table" ? "table" : "cards"), [view])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(total, startIndex + books.length - 1)

  function updateQuery(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function serializeFilters(next: FiltersState) {
    return {
      q: next.q,
      shelfId: next.shelfId,
      tierId: next.tierId,
      status: next.status,
    }
  }

  function handleFiltersChange(next: FiltersState) {
    updateQuery({
      ...serializeFilters(next),
      view: currentView,
      page: 1,
      pageSize,
    })
  }

  function handleViewChange(nextView: string) {
    updateQuery({
      ...serializeFilters(filters),
      view: nextView,
      page,
      pageSize,
    })
  }

  function handlePageChange(nextPage: number) {
    updateQuery({
      ...serializeFilters(filters),
      view: currentView,
      page: nextPage,
      pageSize,
    })
  }

  const hasResults = books.length > 0
  const rangeLabel = hasResults
    ? `Showing ${startIndex}-${endIndex} of ${total} books`
    : `Showing 0 of ${total} books`

  return (
    <main className="space-y-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bookshelf</h1>
        <p className="text-muted-foreground">Manage your personal library across cards or a table view.</p>
      </div>
      <FiltersCollapse
        shelves={shelves}
        value={filters}
        onChange={handleFiltersChange}
      />
      <Tabs
        value={currentView}
        onValueChange={handleViewChange}
        className="space-y-6"
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{rangeLabel}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {Math.min(page, totalPages)} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
          <BookGrid books={books} />
        </TabsContent>
        <TabsContent value="table" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{rangeLabel}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {Math.min(page, totalPages)} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
          <BookTable books={books} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
