"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BookStatus } from "@/lib/books"
import type { ShelfWithLevels } from "@/lib/shelves"
import { cn } from "@/lib/utils"

export interface FiltersState {
  q?: string
  shelf_id?: string
  level_id?: string
  status?: BookStatus
}

export interface FiltersCollapseProps {
  shelves: ShelfWithLevels[]
  value: FiltersState
  onChange: (value: FiltersState) => void
  className?: string
}

export function FiltersCollapse({ shelves, value, onChange, className }: FiltersCollapseProps) {
  const [open, setOpen] = useState(true)

  const levelOptions = useMemo(() => {
    const selectedShelf = shelves.find((shelf) => shelf.id === value.shelf_id)
    return selectedShelf?.levels ?? []
  }, [shelves, value.shelf_id])

  function update(partial: Partial<FiltersState>) {
    onChange({ ...value, ...partial })
  }

  function reset() {
    onChange({})
  }

  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h2>
          <p className="text-xs text-muted-foreground">Search by keyword or narrow by shelf, level, or status.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Collapse" : "Expand"}
        </Button>
      </header>
      {open ? (
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Input
            placeholder="Search title, author, or ISBN"
            value={value.q ?? ""}
            onChange={(event) => update({ q: event.target.value })}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={value.shelf_id ?? "__all__"}
              onValueChange={(next) =>
                update({ shelf_id: next === "__all__" ? undefined : next, level_id: undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All shelves" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Shelves</SelectLabel>
                  <SelectItem value="__all__">All shelves</SelectItem>
                  {shelves.map((shelf) => (
                    <SelectItem key={shelf.id} value={shelf.id}>
                      {shelf.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={value.level_id ?? "__all__"}
              onValueChange={(next) =>
                update({ level_id: next === "__all__" ? undefined : next })
              }
              disabled={!levelOptions.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Levels</SelectLabel>
                  <SelectItem value="__all__">All levels</SelectItem>
                  {levelOptions.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={value.status ?? "__all__"}
              onValueChange={(next) =>
                update({ status: next === "__all__" ? undefined : (next as BookStatus) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="loaned">Loaned</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{summarizeFilters(value, shelves)}</span>
            <Button variant="outline" size="sm" onClick={reset}>
              Clear all
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function summarizeFilters(filters: FiltersState, shelves: ShelfWithLevels[]) {
  const active: string[] = []
  if (filters.q) active.push(`Search: "${filters.q}"`)
  if (filters.shelf_id) {
    const shelf = shelves.find((item) => item.id === filters.shelf_id)
    if (shelf) active.push(`Shelf: ${shelf.name}`)
  }
  if (filters.level_id) {
    const level = shelves
      .flatMap((shelf) => shelf.levels.map((level) => ({ ...level, shelf_name: shelf.name })))
      .find((level) => level.id === filters.level_id)
    if (level) active.push(`Level: ${level.name}`)
  }
  if (filters.status) active.push(`Status: ${filters.status}`)
  return active.length ? active.join(" · ") : "No filters applied"
}
