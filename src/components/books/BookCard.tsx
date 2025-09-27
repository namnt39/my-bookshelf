"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { NotebookPen, UserRoundPlus, ArrowRightLeft } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import type { BookRecord } from "@/lib/books"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/ui"

export interface BookCardProps {
  book: BookRecord
  className?: string
  onTakeNotes?: (book: BookRecord) => void
  onQuickBorrow?: (book: BookRecord) => void
  onMoveShelf?: (book: BookRecord) => void
}

export function BookCard({
  book,
  className,
  onTakeNotes,
  onQuickBorrow,
  onMoveShelf,
}: BookCardProps) {
  const fallbackCover = book.title.charAt(0).toUpperCase()

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:shadow-lg",
        className,
      )}
    >
      <header className="flex items-start justify-between text-xs font-medium text-muted-foreground">
        <span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          {book.shelf?.name ?? "Unfiled"}
        </span>
        {book.borrower ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Loaned to {book.borrower.full_name ?? "Unknown"}
          </span>
        ) : null}
      </header>
      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            width={320}
            height={420}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-muted-foreground">
            {fallbackCover}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                {book.title}
              </h3>
            </TooltipTrigger>
            <TooltipContent>{book.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {book.author ? (
          <p className="truncate text-sm text-muted-foreground">{book.author}</p>
        ) : null}
        {book.isbn ? (
          <p className="text-xs text-muted-foreground/80">ISBN {book.isbn}</p>
        ) : null}
        <p className="text-xs text-muted-foreground/70">
          Added {formatDate(book.created_at)}
        </p>
      </div>
      <footer className="mt-auto flex items-center justify-center gap-3">
        <TooltipProvider delayDuration={150}>
          <ActionButton
            icon={<NotebookPen className="size-5" />}
            label="Take Notes"
            onClick={() => onTakeNotes?.(book)}
          />
          <ActionButton
            icon={<UserRoundPlus className="size-5" />}
            label="Quick Borrow"
            onClick={() => onQuickBorrow?.(book)}
          />
          <ActionButton
            icon={<ArrowRightLeft className="size-5" />}
            label="Move Shelf"
            onClick={() => onMoveShelf?.(book)}
          />
        </TooltipProvider>
      </footer>
    </article>
  )
}

interface ActionButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/60 text-foreground shadow-sm transition hover:bg-primary hover:text-primary-foreground md:h-11 md:w-11"
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
