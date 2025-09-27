"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { BookGrid } from "@/components/books/BookGrid"
import { BookTable } from "@/components/books/BookTable"
import { FiltersCollapse, type FiltersState } from "@/components/books/FiltersCollapse"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BookRecord } from "@/lib/books"
import type { ShelfWithLevels } from "@/lib/shelves"

export interface BooksClientShellProps {
  view: string
  filters: FiltersState
  books: BookRecord[]
  shelves: ShelfWithLevels[]
  total: number
}

export function BooksClientShell({ view, filters, books, shelves, total }: BooksClientShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentView = useMemo(() => (view === "table" ? "table" : "cards"), [view])

  function updateQuery(nextFilters: Partial<FiltersState & { view: string }>) {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <main className="space-y-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bookshelf</h1>
        <p className="text-muted-foreground">Manage your personal library across cards or a table view.</p>
      </div>
      <FiltersCollapse
        shelves={shelves}
        value={filters}
        onChange={(next) => updateQuery({ ...next, view: currentView })}
      />
      <Tabs
        value={currentView}
        onValueChange={(next) => updateQuery({ view: next, ...filters })}
        className="space-y-6"
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{total} books found</span>
          </div>
          <BookGrid books={books} />
        </TabsContent>
        <TabsContent value="table" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{total} books found</span>
          </div>
          <BookTable books={books} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
