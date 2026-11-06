import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { requestAcquisition } from '@/lib/opac-api'
import { useOpacSessionStore } from '@/stores/opac-session-store'

const materials = [
  'book',
  'journal',
  'thesis',
  'dissertation',
  'audiovisual',
  'electronic',
] as const

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'Could not file this request.'
}

export function RequestTitlePage() {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [materialType, setMaterialType] = useState<(typeof materials)[number]>('book')
  const [justification, setJustification] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const file = useMutation({
    mutationFn: () =>
      requestAcquisition({
        title: title.trim(),
        authors: authors.trim() || undefined,
        materialType,
        justification: justification.trim() || undefined,
      }),
    onSuccess: (row) => {
      setError(null)
      setNotice(`${row.requestNumber} is with the library for review before Finance Procurement.`)
      setTitle('')
      setAuthors('')
      setJustification('')
    },
    onError: (err) => {
      setNotice(null)
      setError(errorText(err))
    },
  })

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Request a title</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Ask the library to purchase a book, journal, thesis, or dissertation. Staff review the
            request, then route it to Finance Procurement.
          </p>
          {!signedIn ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Sign in through the WMSU Portal, then open the OPAC again, to file a request.
            </p>
          ) : (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!title.trim()) return
                file.mutate()
              }}
            >
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Title</span>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">Author</span>
                <Input value={authors} onChange={(event) => setAuthors(event.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                  Material
                </span>
                <select
                  className="h-11 w-full rounded-full bg-[var(--color-primary-soft)] px-4 text-sm"
                  value={materialType}
                  onChange={(event) => setMaterialType(event.target.value as (typeof materials)[number])}
                >
                  {materials.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                  Why the library needs it
                </span>
                <Input
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={file.isPending || !title.trim()}>
                File request
              </Button>
            </form>
          )}
          {notice ? <p className="mt-4 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>
    </AppShell>
  )
}
