import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { openElectronicResource, searchElibrary } from '@/lib/opac-api'

type Draft = { q: string; author: string; subject: string; year: string }

const empty: Draft = { q: '', author: '', subject: '', year: '' }

export function ElibraryPage() {
  const [draft, setDraft] = useState<Draft>(empty)
  const [search, setSearch] = useState<Draft | null>(null)
  const [opened, setOpened] = useState<string | null>(null)

  const results = useQuery({
    queryKey: ['elibrary', search],
    queryFn: () => searchElibrary(search ?? empty),
    enabled: Boolean(search && Object.values(search).some((value) => value.trim())),
    retry: false,
  })

  const openDatabase = useMutation({
    mutationFn: openElectronicResource,
    onSuccess: (row) => {
      setOpened(`${row.title}: ${row.viewCount} view${row.viewCount === 1 ? '' : 's'}${row.accessUrl ? ` · ${row.accessUrl}` : ''}`)
    },
  })

  const data = results.data

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">E-library</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Search the catalog, digital repository, and electronic databases together.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              setOpened(null)
              setSearch({ ...draft })
            }}
          >
            <Field label="Keyword" value={draft.q} onChange={(value) => setDraft({ ...draft, q: value })} />
            <Field label="Author" value={draft.author} onChange={(value) => setDraft({ ...draft, author: value })} />
            <Field label="Subject" value={draft.subject} onChange={(value) => setDraft({ ...draft, subject: value })} />
            <Field label="Year" value={draft.year} onChange={(value) => setDraft({ ...draft, year: value })} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={results.isFetching}>
                Search
              </Button>
            </div>
          </form>
          {results.isError ? (
            <p className="mt-4 text-sm text-rose-600">E-library search failed. Try again.</p>
          ) : null}
        </CardContent>
      </Card>

      {data ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Catalog {data.counts.catalog} · Repository {data.counts.repository} · Databases{' '}
            {data.counts.electronic}
          </p>
          <ResultGroup title="Catalog">
            {data.catalog.map((item) => (
              <Link key={item.id} to={`/books/${item.id}`} className="block text-sm text-[var(--color-primary)] hover:underline">
                {item.title}
              </Link>
            ))}
          </ResultGroup>
          <ResultGroup title="Digital repository">
            {data.repository.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-[var(--color-muted-foreground)]">
                    {item.resourceType}
                    {item.year ? ` · ${item.year}` : ''}
                    {item.canOpen ? '' : ' · Restricted'}
                  </p>
                </div>
                {item.canOpen ? (
                  <Link to={`/elibrary/items/${item.id}`} className="text-[var(--color-primary)] hover:underline">
                    Read
                  </Link>
                ) : (
                  <span className="text-[var(--color-muted-foreground)]">Desk access only</span>
                )}
              </div>
            ))}
          </ResultGroup>
          <ResultGroup title="Electronic databases">
            {data.electronic.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-[var(--color-muted-foreground)]">
                    {item.provider || item.resourceKind} · {accessLabel(item.authMethod)}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => openDatabase.mutate(item.id)}>
                  Open
                </Button>
              </div>
            ))}
          </ResultGroup>
          {opened ? <p className="text-sm text-emerald-700">{opened}</p> : null}
        </div>
      ) : null}
    </AppShell>
  )
}

function accessLabel(method: string) {
  if (method === 'sso') return 'Single sign-on'
  if (method === 'proxy') return 'Proxy link'
  if (method === 'open') return 'Open link'
  return method
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children]
  const filled = list.some(Boolean)
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="font-semibold text-[var(--color-ink)]">{title}</h2>
        {filled ? children : <p className="text-sm text-[var(--color-muted-foreground)]">No matches in {title.toLowerCase()}.</p>}
      </CardContent>
    </Card>
  )
}
