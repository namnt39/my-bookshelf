import { normalizeWhitespace, titleCase } from "./ui"

export type BookCsvField =
  | "title"
  | "author"
  | "isbn"
  | "cover_url"
  | "shelf"
  | "level"
  | "tier"
  | "note"

export type CsvHeaderMapping = Record<string, BookCsvField | null>

export interface CsvPreviewRow {
  raw: Record<string, string>
  mapped: Partial<Record<BookCsvField, string>>
  error?: string
}

export interface CsvPreviewResult {
  headers: string[]
  rows: CsvPreviewRow[]
  errors: string[]
}

export interface PrepareBooksOptions {
  defaultShelfId?: string
  defaultLevelId?: string
  titleCaseValues?: boolean
}

export interface PreparedBookRow {
  title: string
  author?: string | null
  isbn?: string | null
  cover_url?: string | null
  shelf?: string | null
  level?: string | null
  tier?: string | null
  note?: string | null
}

export async function readCsvFile(file: File): Promise<string> {
  return await file.text()
}

export function autoMapHeaders(headers: string[]): CsvHeaderMapping {
  const mapping: CsvHeaderMapping = {}
  headers.forEach((header) => {
    const normalized = normalizeWhitespace(header).toLowerCase()
    if (!normalized) {
      mapping[header] = null
      return
    }
    if (/(^|\s)title(\s|$)/.test(normalized)) {
      mapping[header] = "title"
    } else if (/author/.test(normalized)) {
      mapping[header] = "author"
    } else if (/(^|\s)isbn(\s|$)/.test(normalized)) {
      mapping[header] = "isbn"
    } else if (/cover|image|thumb/.test(normalized)) {
      mapping[header] = "cover_url"
    } else if (/shelf/.test(normalized)) {
      mapping[header] = "shelf"
    } else if (/tier/.test(normalized)) {
      mapping[header] = "tier"
    } else if (/level|row/.test(normalized)) {
      mapping[header] = "level"
    } else if (/note|remark|comment/.test(normalized)) {
      mapping[header] = "note"
    } else {
      mapping[header] = null
    }
  })
  return mapping
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = splitCsvLines(text)
  if (!lines.length) {
    return { headers: [], rows: [] }
  }
  const headers = lines[0]
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const columns = lines[i]
    if (columns.length === 1 && columns[0] === "") {
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? ""
    })
    rows.push(row)
  }
  return { headers, rows }
}

function splitCsvLines(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false
  let i = 0

  const pushField = () => {
    currentRow.push(currentField)
    currentField = ""
  }

  const pushRow = () => {
    pushField()
    rows.push(currentRow)
    currentRow = []
  }

  while (i < text.length) {
    const char = text[i]
    if (char === "\r") {
      i += 1
      continue
    }
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentField += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i += 1
      continue
    }
    if (char === "," && !inQuotes) {
      pushField()
      i += 1
      continue
    }
    if ((char === "\n" || char === "\u2028" || char === "\u2029") && !inQuotes) {
      pushRow()
      i += 1
      continue
    }
    currentField += char
    i += 1
  }
  if (currentField.length > 0 || inQuotes || currentRow.length > 0) {
    pushRow()
  }
  return rows
}

export function buildPreview(
  csvText: string,
  mapping?: CsvHeaderMapping,
  limit = 50,
): CsvPreviewResult {
  const { headers, rows } = parseCsv(csvText)
  const activeMapping = mapping ?? autoMapHeaders(headers)
  const previewRows: CsvPreviewRow[] = []
  const errors: string[] = []

  rows.slice(0, limit).forEach((row, index) => {
    const mapped: Partial<Record<BookCsvField, string>> = {}
    Object.entries(activeMapping).forEach(([header, field]) => {
      if (!field) return
      mapped[field] = normalizeWhitespace(row[header] ?? "")
    })

    const title = mapped.title
    if (!title) {
      const error = `Row ${index + 2}: Missing title`
      previewRows.push({ raw: row, mapped, error })
      errors.push(error)
      return
    }

    previewRows.push({ raw: row, mapped })
  })

  return {
    headers,
    rows: previewRows,
    errors,
  }
}

export function prepareRows(
  csvText: string,
  mapping: CsvHeaderMapping,
  options: PrepareBooksOptions = {},
): PreparedBookRow[] {
  const { headers, rows } = parseCsv(csvText)
  const activeMapping = mapping ?? autoMapHeaders(headers)

  return rows.map((row) => {
    const mapped: Partial<Record<BookCsvField, string>> = {}
    Object.entries(activeMapping).forEach(([header, field]) => {
      if (!field) return
      const value = normalizeWhitespace(row[header] ?? "")
      if (value) {
        mapped[field] = options.titleCaseValues && field === "title" ? titleCase(value) : value
      }
    })

    const level = mapped.level ?? mapped.tier ?? null
    const prepared: PreparedBookRow = {
      title: mapped.title ?? "",
      author: mapped.author ?? null,
      isbn: mapped.isbn ?? null,
      cover_url: mapped.cover_url ?? null,
      shelf: mapped.shelf ?? null,
      level,
      tier: mapped.tier ?? mapped.level ?? null,
      note: mapped.note ?? null,
    }

    if (!prepared.title) {
      throw new Error("CSV row is missing a title")
    }

    return prepared
  })
}
