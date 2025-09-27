import { revalidatePath } from "next/cache"

import { bulkInsertBooks, type BulkInsertOptions } from "@/lib/books"
import { type PreparedBookRow } from "@/lib/csv"
import { listShelvesWithLevels } from "@/lib/shelves"

import { ImportBooksClientPage, type ImportBooksActionPayload } from "./pageClient"

export default async function ImportBooksPage() {
  const shelves = await listShelvesWithLevels()

  return <ImportBooksClientPage shelves={shelves} importAction={importBooksAction} />
}

async function importBooksAction(payload: ImportBooksActionPayload) {
  "use server"

  const { rows, options } = payload
  const result = await bulkInsertBooks(rows as PreparedBookRow[], options as BulkInsertOptions)
  revalidatePath("/books")
  return result
}
