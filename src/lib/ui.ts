export function formatDate(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date)
}

export function truncate(value: string, length: number) {
  if (value.length <= length) return value
  return `${value.slice(0, Math.max(0, length - 1))}…`
}

export function normalizeWhitespace(value?: string | null) {
  if (!value) return ""
  return value.replace(/\s+/g, " ").trim()
}

export function titleCase(value: string) {
  return value
    .split(" ")
    .map((segment) =>
      segment.length > 2
        ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
        : segment.toLowerCase(),
    )
    .join(" ")
}
