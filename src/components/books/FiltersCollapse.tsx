"use client"

import { useEffect, useMemo, useState } from "react"

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
import type { ShelfWithTiers } from "@/lib/shelves"
import { cn } from "@/lib/utils"

export interface FiltersState {
  q?: string
  shelfId?: string
  tierId?: string
  status?: BookStatus
}

export interface FiltersCollapseProps {
  shelves: ShelfWithTiers[]
  value: FiltersState
  onChange: (value: FiltersState) => void
  className?: string
}

export function FiltersCollapse({ shelves, value, onChange, className }: FiltersCollapseProps) {
  const [open, setOpen] = useState(true)
  const [searchText, setSearchText] = useState(value.q ?? "")

  useEffect(() => {
    setSearchText(value.q ?? "")
  }, [value.q])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      if ((value.q ?? "") !== searchText) {
        onChange({ ...value, q: searchText || undefined })
      }
    }, 300)
    return () => window.clearTimeout(handler)
  }, [searchText, value, onChange])

  const tierOptions = useMemo(() => {
    const selectedShelf = shelves.find((shelf) => shelf.id === value.shelfId)
    return selectedShelf?.tiers ?? []
  }, [shelves, value.shelfId])

  function update(partial: Partial<FiltersState>) {
    onChange({ ...value, ...partial })
  }

  function reset() {
    setSearchText("")
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
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={value.shelfId ?? "__all__"}
              onValueChange={(next) =>
                update({ shelfId: next === "__all__" ? undefined : next, tierId: undefined })
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
              value={value.tierId ?? "__all__"}
              onValueChange={(next) =>
                update({ tierId: next === "__all__" ? undefined : next })
              }
              disabled={!tierOptions.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Levels</SelectLabel>
                  <SelectItem value="__all__">All levels</SelectItem>
                  {tierOptions.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.tier_name}
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
                  <SelectItem value="borrowed">Borrowed</SelectItem>
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

function summarizeFilters(filters: FiltersState, shelves: ShelfWithTiers[]) {
  const active: string[] = []
  if (filters.q) active.push(`Search: "${filters.q}"`)
  if (filters.shelfId) {
    const shelf = shelves.find((item) => item.id === filters.shelfId)
    if (shelf) active.push(`Shelf: ${shelf.name}`)
  }
  if (filters.tierId) {
    const tier = shelves
      .flatMap((shelf) => shelf.tiers.map((tier) => ({ ...tier, shelf_name: shelf.name })))
      .find((tier) => tier.id === filters.tierId)
    if (tier) active.push(`Level: ${tier.tier_name}`)
  }
  if (filters.status) active.push(`Status: ${filters.status}`)
  return active.length ? active.join(" · ") : "No filters applied"
}
