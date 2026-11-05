import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, MapPin, BookMarked, Download, FileJson } from 'lucide-react'
import { fetchCatalogVersions } from '@/lib/catalog-import-api'
import { exportBookMarc } from '@/lib/books-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarcodeDisplay } from '@/components/books/barcode-display'
import { InventoryBadge, InventorySummary } from '@/components/books/inventory-badge'
import { BookCirculationPanel } from '@/features/books/components/book-circulation-panel'
import { useDialog } from '@/components/providers/dialog-provider'
import {
  useBook,
  useAddCopy,
  useDeleteCopy,
  useDownloadBookDigitalFile,
  useUploadBookDigitalFile,
} from '@/hooks/use-books'
import { useBooksStore } from '@/stores/books-store'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/lib/api-client'

export function BookDetailPage() {
  const { id = '' } = useParams()
  const { data: book, isLoading, isError } = useBook(id)
  const { openEditForm } = useBooksStore()
  const { confirm, toast } = useDialog()
  const user = useAuthStore((s) => s.user)
  const addCopy = useAddCopy()
  const deleteCopy = useDeleteCopy()
  const uploadDigital = useUploadBookDigitalFile()
  const downloadDigital = useDownloadBookDigitalFile()

  const [showAddCopy, setShowAddCopy] = useState(false)
  const [shelfLocation, setShelfLocation] = useState('')
  const [barcode, setBarcode] = useState('')
  const [digitalFile, setDigitalFile] = useState<File | null>(null)

  const canUpdate = user?.permissions.includes('books:update')
  const canCreate = user?.permissions.includes('books:create')
  const canDelete = user?.permissions.includes('books:delete')

  const versionsQuery = useQuery({
    queryKey: ['catalog-versions', id],
    queryFn: () => fetchCatalogVersions(id),
    enabled: Boolean(id),
  })

  async function handleAddCopy(e: React.FormEvent) {
    e.preventDefault()
    await addCopy.mutateAsync({
      bookId: id,
      payload: {
        shelfLocation: shelfLocation || undefined,
        barcode: barcode || undefined,
      },
    })
    setShowAddCopy(false)
    setShelfLocation('')
    setBarcode('')
    toast.success('Copy added')
  }

  async function handleWithdraw(copyId: string) {
    const approved = await confirm({
      title: 'Withdraw copy',
      message: 'Withdraw this copy?',
      confirmLabel: 'Withdraw',
      tone: 'danger',
    })
    if (!approved) return
    await deleteCopy.mutateAsync({ bookId: id, copyId })
    toast.success('Copy withdrawn')
  }

  async function handleDigitalUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!digitalFile) return
    try {
      await uploadDigital.mutateAsync({ bookId: id, file: digitalFile })
      setDigitalFile(null)
      toast.success('Digital file uploaded (visible in DocTrack Platform Documents)')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  async function handleDigitalDownload(fileId: string) {
    try {
      const result = await downloadDigital.mutateAsync({ bookId: id, fileId })
      if (!result?.url) {
        toast.error('Download URL unavailable')
        return
      }
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading book...</div>
  }

  if (isError || !book) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">Book not found</p>
        <Link to="/books" className="mt-2 inline-block text-sm text-blue-600">
          Back to Catalog
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/books"
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{book.title}</h1>
          {book.subtitle && <p className="text-slate-500">{book.subtitle}</p>}
          <p className="mt-1 text-sm text-slate-600">{book.authors.join(', ')}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
            {book.materialType || 'book'}
            {book.metadataVersion ? ` · v${book.metadataVersion}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const marc = await exportBookMarc(book.id)
                const blob = new Blob([JSON.stringify(marc, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `marc-${book.id}.json`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('MARC export downloaded')
              } catch (err) {
                toast.error(getApiErrorMessage(err))
              }
            }}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Export MARC
          </Button>
          {canUpdate && (
            <Button variant="outline" onClick={() => openEditForm(book)}>
              Edit record
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catalog details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Detail label="Material type" value={book.materialType} />
              <Detail
                label="Classification"
                value={
                  book.classificationScheme
                    ? `${String(book.classificationScheme).toUpperCase()} ${book.classificationNumber ?? ''}`.trim()
                    : null
                }
                mono
              />
              <Detail label="ISBN-13" value={book.isbn13} mono />
              <Detail label="ISBN-10" value={book.isbn10} mono />
              <Detail label="ISSN" value={book.issn} mono />
              <Detail
                label="Publication year"
                value={book.publicationYear ? String(book.publicationYear) : null}
              />
              <Detail label="Publisher" value={book.publisher} />
              <Detail label="Category" value={book.category} />
              <Detail label="Subjects" value={book.subjects?.join(', ') || null} />
              <Detail label="Genre" value={book.genre} />
              <Detail label="Format" value={book.isDigital ? 'Digital available' : 'Physical'} />
              {book.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500">Description</p>
                  <p className="mt-1 text-slate-700">{book.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catalog versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {versionsQuery.isLoading && (
                <p className="text-slate-500">Loading versions…</p>
              )}
              {!versionsQuery.data?.length && !versionsQuery.isLoading && (
                <p className="text-slate-500">No version history yet</p>
              )}
              {(versionsQuery.data ?? []).map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2"
                >
                  <p className="font-medium">
                    v{v.version}
                    {v.createdAt ? ` · ${new Date(v.createdAt).toLocaleString()}` : ''}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {JSON.stringify(v.snapshot).slice(0, 180)}
                    {JSON.stringify(v.snapshot).length > 180 ? '…' : ''}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Physical copies ({book.copies?.length ?? 0})</CardTitle>
              {canCreate && (
                <Button size="sm" onClick={() => setShowAddCopy(!showAddCopy)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add copy
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddCopy && (
                <form
                  onSubmit={handleAddCopy}
                  className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Barcode (auto-generated if empty)</Label>
                      <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Shelf location</Label>
                      <Input
                        placeholder="A-12-3"
                        value={shelfLocation}
                        onChange={(e) => setShelfLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button type="submit" size="sm" disabled={addCopy.isPending}>
                      Add copy
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddCopy(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {!book.copies?.length ? (
                <p className="text-sm text-slate-500">No copies registered</p>
              ) : (
                <div className="space-y-3">
                  {book.copies.map((copy) => (
                    <div
                      key={copy.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <BarcodeDisplay value={copy.barcode} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Copy #{copy.copyNumber}
                          </p>
                          {copy.shelfLocation && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3" />
                              {copy.shelfLocation}
                            </p>
                          )}
                          {copy.condition && (
                            <p className="text-xs text-slate-400">Condition: {copy.condition}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <InventoryBadge status={copy.status} />
                        {canDelete && copy.status !== 'withdrawn' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              void handleWithdraw(copy.id)
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Digital files ({book.digitalFiles?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate && (
                <form
                  onSubmit={(e) => {
                    void handleDigitalUpload(e)
                  }}
                  className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4"
                >
                  <Label>Upload file to enterprise Document Service (Library)</Label>
                  <Input
                    type="file"
                    className="mt-2"
                    onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="mt-3"
                    disabled={!digitalFile || uploadDigital.isPending}
                  >
                    {uploadDigital.isPending ? 'Uploading…' : 'Upload'}
                  </Button>
                </form>
              )}
              {!book.digitalFiles?.length ? (
                <p className="text-sm text-slate-500">No digital files yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {book.digitalFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="truncate font-medium text-slate-800">{file.originalName}</span>
                        <span className="ml-2 shrink-0 text-xs text-slate-500">
                          {Math.round(file.sizeBytes / 1024)} KB · Library
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={downloadDigital.isPending}
                        onClick={() => {
                          void handleDigitalDownload(file.id)
                        }}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <BookCirculationPanel book={book} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookMarked className="h-4 w-4" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InventorySummary
                available={book.availableCopies}
                total={book.quantity}
                onLoan={book.onLoanCopies}
              />
              <div className="grid grid-cols-2 gap-3 text-center">
                <Stat label="Total" value={book.quantity} />
                <Stat label="Available" value={book.availableCopies} />
                <Stat label="Borrowed" value={book.onLoanCopies} />
                <Stat label="Reserved" value={book.reservedCopies} />
              </div>
            </CardContent>
          </Card>

          {book.catalogBarcode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catalog barcode</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <BarcodeDisplay value={book.catalogBarcode} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={mono ? 'mt-0.5 font-mono text-sm text-slate-800' : 'mt-0.5 text-sm text-slate-800'}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
