"use client"

import type { BookRecord } from "@/lib/books"
import { cn } from "@/lib/utils"

import { BookCard, type BookCardProps } from "./BookCard"

export interface BookGridProps {
  books: BookRecord[]
  className?: string
  onTakeNotes?: BookCardProps["onTakeNotes"]
  onQuickBorrow?: BookCardProps["onQuickBorrow"]
  onMoveShelf?: BookCardProps["onMoveShelf"]
}

export function BookGrid({
  books,
  className,
  onTakeNotes,
  onQuickBorrow,
  onMoveShelf,
}: BookGridProps) {
  if (!books.length) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        No books found. Try adjusting your filters.
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid gap-6 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onTakeNotes={onTakeNotes}
          onQuickBorrow={onQuickBorrow}
          onMoveShelf={onMoveShelf}
        />
      ))}
    </div>
  )
}
