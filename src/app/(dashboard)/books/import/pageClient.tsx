"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import type { DragEvent } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import {
  autoMapHeaders,
  buildPreview,
  prepareRows,
  type CsvHeaderMapping,
  type CsvPreviewResult,
  type PreparedBookRow,
} from "@/lib/csv"
import type { ShelfWithLevels } from "@/lib/shelves"

export interface ImportBooksActionPayload {
  rows: PreparedBookRow[]
  options: {
    batchSize?: number
    onDuplicate?: "skip" | "update"
  }
}

export interface ImportBooksClientPageProps {
  shelves: ShelfWithLevels[]
  importAction: (payload: ImportBooksActionPayload) => Promise<{
    okCount: number
    errorRows: { index: number; message: string }[]
  }>
}

const CSV_FIELD_OPTIONS = [
  { value: "", label: "Ignore column" },
  { value: "title", label: "Title (required)" },
  { value: "author", label: "Author" },
  { value: "isbn", label: "ISBN" },
  { value: "cover_url", label: "Cover / Image" },
  { value: "shelf", label: "Shelf" },
  { value: "level", label: "Level" },
  { value: "tier", label: "Tier" },
  { value: "note", label: "Note" },
] as const

export function ImportBooksClientPage({ shelves, importAction }: ImportBooksClientPageProps) {
  const [csvText, setCsvText] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const [mapping, setMapping] = useState<CsvHeaderMapping>({})
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null)
  const [batchSize, setBatchSize] = useState(200)
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "update">("skip")
  const [useNewShelf, setUseNewShelf] = useState(false)
  const [newShelfName, setNewShelfName] = useState("")
  const [selectedShelfId, setSelectedShelfId] = useState<string>("")
  const [useNewLevel, setUseNewLevel] = useState(false)
  const [newLevelName, setNewLevelName] = useState("")
  const [selectedLevelId, setSelectedLevelId] = useState<string>("")
  const [setDefaultLocation, setSetDefaultLocation] = useState(false)
  const [resultMessage, setResultMessage] = useState<string>("")
  const [resultErrors, setResultErrors] = useState<{ index: number; message: string }[]>([])
  const [isPending, startTransition] = useTransition()

  const levelOptions = useMemo(() => {
    const shelf = shelves.find((item) => item.id === selectedShelfId)
    return shelf?.levels ?? []
  }, [selectedShelfId, shelves])

  const defaultShelfName = useMemo(() => {
    if (useNewShelf) return newShelfName.trim()
    return shelves.find((item) => item.id === selectedShelfId)?.name ?? ""
  }, [useNewShelf, newShelfName, selectedShelfId, shelves])

  const defaultLevelName = useMemo(() => {
    if (useNewLevel) return newLevelName.trim()
    return levelOptions.find((level) => level.id === selectedLevelId)?.name ?? ""
  }, [useNewLevel, newLevelName, selectedLevelId, levelOptions])

  const canImport = Boolean(
    csvText &&
      preview &&
      preview.rows.length > 0 &&
      Object.values(mapping).includes("title") &&
      preview.errors.length === 0 &&
      (!setDefaultLocation || defaultShelfName),
  )

  const dropZoneHandlers = useDropzone((file) => {
    void handleFile(file)
  })

  async function handleFile(file: File) {
    const text = await file.text()
    setFileName(file.name)
    setCsvText(text)
    const initialPreview = buildPreview(text)
    const initialMapping = autoMapHeaders(initialPreview.headers)
    setMapping(initialMapping)
    setPreview(buildPreview(text, initialMapping))
    setResultMessage("")
    setResultErrors([])
  }

  function handleMappingChange(header: string, field: string) {
    const nextMapping: CsvHeaderMapping = {
      ...mapping,
      [header]: (field || null) as CsvHeaderMapping[string],
    }
    setMapping(nextMapping)
    if (csvText) {
      setPreview(buildPreview(csvText, nextMapping))
    }
  }

  async function handleImport() {
    if (!preview || !csvText) return
    try {
      const rows = prepareRows(csvText, mapping, { titleCaseValues: true })
      const normalizedRows = rows.map((row) => {
        const next = { ...row }
        if ((!row.shelf || !row.shelf.trim()) && setDefaultLocation && defaultShelfName) {
          next.shelf = defaultShelfName
        }
        if ((!row.level || !row.level.trim()) && setDefaultLocation && defaultLevelName) {
          next.level = defaultLevelName
          next.tier = defaultLevelName
        }
        if ((!row.tier || !row.tier.trim()) && next.level) {
          next.tier = next.level
        }
        return next
      })
      startTransition(() => {
        importAction({
          rows: normalizedRows,
          options: { batchSize, onDuplicate },
        }).then((result) => {
          setResultMessage(`Imported ${result.okCount} book(s).`)
          setResultErrors(result.errorRows)
        })
      })
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Failed to prepare rows")
      setResultErrors([])
    }
  }

  return (
    <main className="space-y-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Import books</h1>
        <p className="text-muted-foreground">Upload your MyBooks.csv file to preview, map columns, and import into your bookshelf.</p>
      </header>
      <section
        {...dropZoneHandlers}
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-8 text-center"
      >
        <p className="text-lg font-semibold">Drag & drop your CSV here</p>
        <p className="text-sm text-muted-foreground">or click to choose a file</p>
        <Input
          type="file"
          accept=".csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {fileName ? <p className="text-sm text-muted-foreground">Selected: {fileName}</p> : null}
      </section>

      {preview ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Column mapping</h2>
            <p className="text-sm text-muted-foreground">Select how each CSV column maps to bookshelf fields.</p>
          </header>
          <div className="grid gap-4">
            {preview.headers.map((header) => (
              <div key={header} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div>
                  <p className="font-medium">{header}</p>
                  <p className="text-xs text-muted-foreground">
                    Example: {preview.rows[0]?.raw?.[header] ?? ""}
                  </p>
                </div>
                <Select
                  value={mapping[header] ?? ""}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ignore" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Fields</SelectLabel>
                      {CSV_FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {preview ? (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Preview (first {preview.rows.length} rows)</h2>
            <span className="text-sm text-muted-foreground">{preview.errors.length} validation error(s)</span>
          </header>
          <div className="max-h-[320px] overflow-auto rounded-xl border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {preview.headers.map((header) => (
                    <th key={header} className="p-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                  <th className="p-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    {preview.headers.map((header) => (
                      <td key={header} className="p-2 text-xs text-muted-foreground">
                        {row.raw[header]}
                      </td>
                    ))}
                    <td className="p-2 text-xs">
                      {row.error ? (
                        <span className="text-red-500">{row.error}</span>
                      ) : (
                        <span className="text-emerald-600">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.errors.length ? (
            <Textarea
              value={preview.errors.join("\n")}
              readOnly
              className="min-h-[120px] text-xs"
            />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Shelf & level</h2>
          <p className="text-sm text-muted-foreground">Assign imported books to an existing shelf/level or create new ones.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shelf</span>
              <Button variant="ghost" size="sm" onClick={() => setUseNewShelf((prev) => !prev)}>
                {useNewShelf ? "Use existing" : "New shelf"}
              </Button>
            </div>
            {useNewShelf ? (
              <Input
                placeholder="New shelf name"
                value={newShelfName}
                onChange={(event) => setNewShelfName(event.target.value)}
              />
            ) : (
              <Select value={selectedShelfId} onValueChange={setSelectedShelfId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shelf" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Shelves</SelectLabel>
                    {shelves.map((shelf) => (
                      <SelectItem key={shelf.id} value={shelf.id}>
                        {shelf.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Level</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseNewLevel((prev) => !prev)}
                disabled={useNewShelf && !newShelfName}
              >
                {useNewLevel ? "Use existing" : "New level"}
              </Button>
            </div>
            {useNewLevel ? (
              <Input
                placeholder="New level name"
                value={newLevelName}
                onChange={(event) => setNewLevelName(event.target.value)}
              />
            ) : (
              <Select
                value={selectedLevelId}
                onValueChange={setSelectedLevelId}
                disabled={useNewShelf ? !newShelfName : !selectedShelfId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Levels</SelectLabel>
                    {levelOptions.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <Checkbox checked={setDefaultLocation} onCheckedChange={(value) => setSetDefaultLocation(Boolean(value))} />
          Set this shelf/level as default for this import
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Import options</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="batchSize">
              Batch size
            </label>
            <Input
              id="batchSize"
              type="number"
              min={50}
              max={500}
              value={batchSize}
              onChange={(event) => setBatchSize(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">On duplicate ISBN</label>
            <Select value={onDuplicate} onValueChange={(value: "skip" | "update") => setOnDuplicate(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="skip">Skip existing</SelectItem>
                  <SelectItem value="update">Update title/author/cover</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="lg" disabled={!canImport || isPending} onClick={handleImport}>
          {isPending ? "Importing…" : `Import ${preview?.rows.length ?? 0} books`}
        </Button>
        {resultMessage ? <p className="text-sm text-muted-foreground">{resultMessage}</p> : null}
        {resultErrors.length ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">{resultErrors.length} rows failed:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {resultErrors.map((error, index) => (
                <li key={`${error.index}-${index}`}>Row {error.index + 1}: {error.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function useDropzone(onFile: (file: File) => void) {
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleClick = useCallback(() => {
    // Intentionally left blank: input handles click.
  }, [])

  return {
    onDrop: handleDrop,
    onDragOver: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    onClick: handleClick,
  }
}
