import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, BookOpen, Pencil, Trash2, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { InventorySummary } from '@/components/books/inventory-badge'
import { useDialog } from '@/components/providers/dialog-provider'
import { useBooks, useDeleteBook } from '@/hooks/use-books'
import { useBooksStore } from '@/stores/books-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  fileToBase64,
  importCatalogCsv,
  importCatalogMarc,
  importCatalogXlsx,
  type ImportResult,
} from '@/lib/catalog-import-api'
import { batchDeleteBooks } from '@/lib/books-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { useQueryClient } from '@tanstack/react-query'
import { MATERIAL_TYPE_OPTIONS } from '@/types/books'

export function BooksPage() {
  const {
    search,
    materialType,
    page,
    perPage,
    setSearch,
    setMaterialType,
    setPage,
    openCreateForm,
    openEditForm,
  } = useBooksStore()
  const user = useAuthStore((s) => s.user)
  const { confirm, toast } = useDialog()
  const [localSearch, setLocalSearch] = useState(search)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const canCreate = user?.permissions.includes('books:create')
  const canUpdate = user?.permissions.includes('books:update')
  const canDelete = user?.permissions.includes('books:delete')
  const qc = useQueryClient()
  const [showImport, setShowImport] = useState(false)
  const [importTab, setImportTab] = useState<'csv' | 'marc' | 'xlsx'>('csv')
  const [csvText, setCsvText] = useState(
    'title,authors,isbn13,subjects,materialType,classificationScheme,classificationNumber,genre,isDigital\n'
  )
  const [marcText, setMarcText] = useState(
    '[\n  { "controlNumber": "1", "fields": { "245": "Title", "100": "Author", "020": "", "650": "", "082": "" } }\n]'
  )
  const [importErrors, setImportErrors] = useState<ImportResult['errors']>([])
  const [importing, setImporting] = useState(false)

  const { data, isLoading, isError } = useBooks({
    search,
    materialType: materialType || undefined,
    page,
    perPage,
  })
  const deleteBook = useDeleteBook()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(localSearch)
  }

  async function handleDelete(id: string, title: string) {
    const approved = await confirm({
      title: 'Delete catalog record',
      message: `Delete "${title}"? Records linked to active loans cannot be deleted. Available copies will be withdrawn.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!approved) return
    try {
      await deleteBook.mutateAsync(id)
      toast.success('Catalog record deleted')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  async function handleBatchDelete() {
    if (!selectedIds.length) return
    const approved = await confirm({
      title: 'Batch delete',
      message: `Delete ${selectedIds.length} selected catalog record(s)? Active circulation links will block deletion.`,
      confirmLabel: 'Delete selected',
      tone: 'danger',
    })
    if (!approved) return
    try {
      const results = await batchDeleteBooks(selectedIds)
      const failed = results.filter((r) => !r.ok)
      const ok = results.filter((r) => r.ok).length
      toast.success(`Deleted ${ok} record(s)${failed.length ? `; ${failed.length} blocked` : ''}`)
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['books'] })
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
          <p className="text-sm text-slate-500">
            Bibliographic records and collection copies (LIB-001 / LIB-017)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDelete && selectedIds.length > 0 && (
            <Button variant="outline" onClick={() => void handleBatchDelete()}>
              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
              Delete selected ({selectedIds.length})
            </Button>
          )}
          {canCreate && (
            <Button variant="outline" onClick={() => setShowImport((v) => !v)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk import
            </Button>
          )}
          {canCreate && (
            <Button onClick={openCreateForm} data-testid="catalog-add">
              <Plus className="mr-2 h-4 w-4" />
              Add record
            </Button>
          )}
        </div>
      </div>

      {showImport && canCreate && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              {(['csv', 'marc', 'xlsx'] as const).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={importTab === tab ? 'default' : 'outline'}
                  onClick={() => {
                    setImportTab(tab)
                    setImportErrors([])
                  }}
                >
                  {tab.toUpperCase()}
                </Button>
              ))}
            </div>

            {importTab === 'csv' && (
              <>
                <p className="text-sm font-medium">
                  CSV: title,authors,isbn13,subjects,materialType,classificationScheme,classificationNumber,genre,isDigital
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setCsvText(await file.text())
                  }}
                />
                <textarea
                  className="min-h-36 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </>
            )}

            {importTab === 'marc' && (
              <>
                <p className="text-sm font-medium">
                  MARC JSON array — fields 245/100/020 (or title/author/isbn)
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setMarcText(await file.text())
                  }}
                />
                <textarea
                  className="min-h-36 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs"
                  value={marcText}
                  onChange={(e) => setMarcText(e.target.value)}
                />
              </>
            )}

            {importTab === 'xlsx' && (
              <>
                <p className="text-sm font-medium">
                  Excel (.xlsx) — first sheet, same columns as CSV
                </p>
                <input
                  id="xlsx-import"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
              </>
            )}

            {!!importErrors?.length && (
              <div className="max-h-40 overflow-auto rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                {importErrors.map((err, i) => (
                  <p key={i}>
                    {err.line ? `Line ${err.line}: ` : ''}
                    {err.error}
                  </p>
                ))}
              </div>
            )}

            <Button
              disabled={importing}
              onClick={async () => {
                setImporting(true)
                setImportErrors([])
                try {
                  let result: ImportResult
                  if (importTab === 'csv') {
                    result = await importCatalogCsv(csvText)
                  } else if (importTab === 'marc') {
                    const records = JSON.parse(marcText) as Array<Record<string, unknown>>
                    result = await importCatalogMarc(records)
                  } else {
                    const input = document.getElementById('xlsx-import') as HTMLInputElement | null
                    const file = input?.files?.[0]
                    if (!file) throw new Error('Choose an .xlsx file')
                    result = await importCatalogXlsx(await fileToBase64(file))
                  }
                  setImportErrors(result.errors ?? [])
                  toast.success(`Imported ${result.createdCount} record(s)`)
                  qc.invalidateQueries({ queryKey: ['books'] })
                  if (!result.errors?.length) setShowImport(false)
                } catch (e) {
                  toast.error(getApiErrorMessage(e))
                } finally {
                  setImporting(false)
                }
              }}
            >
              Run import
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search title, author, subject, ISBN, ISSN, classification..."
            className="pl-10"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            data-testid="catalog-search"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
          value={materialType}
          onChange={(e) => setMaterialType(e.target.value)}
          aria-label="Filter by material type"
        >
          <option value="">All material types</option>
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              Loading catalog...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-red-600">Failed to load books</div>
          ) : !data?.books.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700">No catalog records found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a bibliographic record
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="catalog-table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    {canDelete && <th className="px-4 py-3" />}
                    <th className="px-4 py-3 font-medium text-slate-600">Title</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Authors</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Material</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Class.</th>
                    <th className="px-4 py-3 font-medium text-slate-600">ISBN / ISSN</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Copies</th>
                    <th className="px-4 py-3 font-medium text-slate-600" />
                  </tr>
                </thead>
                <tbody>
                  {data.books.map((book) => (
                    <tr
                      key={book.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                    >
                      {canDelete && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(book.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, book.id]
                                  : prev.filter((id) => id !== book.id)
                              )
                            }}
                            aria-label={`Select ${book.title}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link
                          to={`/books/${book.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {book.title}
                        </Link>
                        {book.subjects?.length ? (
                          <p className="text-xs text-slate-400">{book.subjects.join(', ')}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{book.authors.join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {book.materialType || 'book'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {book.classificationScheme
                          ? `${String(book.classificationScheme).toUpperCase()} ${book.classificationNumber ?? ''}`.trim()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {book.isbn13 ?? book.isbn10 ?? book.issn ?? '—'}
                      </td>
                      <td className="min-w-[140px] px-4 py-3">
                        <InventorySummary
                          available={book.availableCopies}
                          total={book.quantity}
                          onLoan={book.onLoanCopies}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(book)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDelete(book.id, book.title)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} books)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
