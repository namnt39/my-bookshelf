"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BookRecord } from "@/lib/books"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/ui"

const LOCAL_STORAGE_KEY = "bookshelf.table.columnWidths"

interface ColumnConfig {
  key: keyof BookTableWidths
  label: string
  minWidth: number
}

const columns: ColumnConfig[] = [
  { key: "cover", label: "Cover", minWidth: 72 },
  { key: "title", label: "Title", minWidth: 200 },
  { key: "author", label: "Author", minWidth: 160 },
  { key: "shelf", label: "Shelf/Level", minWidth: 180 },
  { key: "isbn", label: "ISBN", minWidth: 140 },
  { key: "status", label: "Status", minWidth: 120 },
  { key: "created", label: "Created", minWidth: 140 },
]

export type BookTableWidths = {
  cover: number
  title: number
  author: number
  shelf: number
  isbn: number
  status: number
  created: number
}

const defaultWidths: BookTableWidths = {
  cover: 96,
  title: 280,
  author: 220,
  shelf: 200,
  isbn: 160,
  status: 140,
  created: 160,
}

export interface BookTableProps {
  books: BookRecord[]
  className?: string
  onSelectionChange?: (ids: string[]) => void
  selectedIds?: string[]
}

export function BookTable({ books, className, onSelectionChange, selectedIds }: BookTableProps) {
  const [columnWidths, setColumnWidths] = useState<BookTableWidths>(defaultWidths)
  const [internalSelection, setInternalSelection] = useState<string[]>([])
  const selection = selectedIds ?? internalSelection

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setColumnWidths({ ...defaultWidths, ...parsed })
      } catch (error) {
        console.warn("Failed to parse stored column widths", error)
      }
    }
  }, [])

  useEffect(() => {
    setInternalSelection((prev) => prev.filter((id) => books.some((book) => book.id === id)))
  }, [books])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(columnWidths))
  }, [columnWidths])

  function updateSelection(next: string[]) {
    if (!selectedIds) {
      setInternalSelection(next)
    }
    onSelectionChange?.(next)
  }

  const isAllSelected = useMemo(() => selection.length > 0 && selection.length === books.length, [selection, books])

  function toggleAll(checked: boolean | "indeterminate") {
    if (checked) {
      updateSelection(books.map((book) => book.id))
    } else {
      updateSelection([])
    }
  }

  function toggleRow(id: string, checked: boolean | "indeterminate") {
    if (checked) {
      updateSelection(Array.from(new Set([...selection, id])))
    } else {
      updateSelection(selection.filter((value) => value !== id))
    }
  }

  function startResize(column: ColumnConfig, startX: number) {
    const initialWidth = columnWidths[column.key]
    function handleMove(event: MouseEvent) {
      const delta = event.clientX - startX
      setColumnWidths((prev) => ({
        ...prev,
        [column.key]: Math.max(column.minWidth, initialWidth + delta),
      }))
    }
    function handleUp() {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
  }

  if (!books.length) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        No books found. Try adjusting your filters.
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all"
                checked={isAllSelected}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.key} style={{ width: columnWidths[column.key] }}>
                <div className="flex items-center justify-between gap-3">
                  <span>{column.label}</span>
                  <span
                    className="h-6 w-1 cursor-col-resize rounded-full bg-border"
                    onMouseDown={(event) => startResize(column, event.clientX)}
                  />
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((book) => {
            const checked = selection.includes(book.id)
            return (
              <TableRow key={book.id} data-state={checked ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${book.title}`}
                    checked={checked}
                    onCheckedChange={(value) => toggleRow(book.id, value)}
                  />
                </TableCell>
                <TableCell style={{ width: columnWidths.cover }}>
                  <div className="flex items-center">
                    <div className="h-16 w-12 overflow-hidden rounded-lg bg-muted">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          width={64}
                          height={96}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                          {book.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.title }}>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{book.title}</span>
                    {book.tier?.tier_name ? (
                      <span className="text-xs text-muted-foreground">Level {book.tier.tier_name}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.author }}>
                  <span className="text-muted-foreground">{book.author ?? "—"}</span>
                </TableCell>
                <TableCell style={{ width: columnWidths.shelf }}>
                  <div className="flex flex-col">
                    <span>{book.shelf?.name ?? "Unfiled"}</span>
                    {book.tier?.tier_name ? (
                      <span className="text-xs text-muted-foreground">{book.tier.tier_name}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.isbn }}>
                  <span>{book.isbn ?? "—"}</span>
                </TableCell>
                <TableCell style={{ width: columnWidths.status }}>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      book.status === "borrowed"
                        ? "bg-amber-100 text-amber-800"
                        : book.status === "archived"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {book.status ? book.status.replace(/_/g, " ") : "Available"}
                  </span>
                </TableCell>
                <TableCell style={{ width: columnWidths.created }}>
                  <span className="text-muted-foreground">{formatDate(book.created_at)}</span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
