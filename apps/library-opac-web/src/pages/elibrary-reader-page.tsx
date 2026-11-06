import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { openRepositoryItem } from '@/lib/opac-api'

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'This item cannot be opened.'
}

export function ElibraryReaderPage() {
  const { id = '' } = useParams()
  const view = useQuery({
    queryKey: ['elibrary-item', id, 'view'],
    queryFn: () => openRepositoryItem(id, 'view'),
    enabled: Boolean(id),
    retry: false,
  })
  const download = useQuery({
    queryKey: ['elibrary-item', id, 'download'],
    queryFn: () => openRepositoryItem(id, 'download'),
    enabled: false,
    retry: false,
  })

  const item = download.data ?? view.data

  return (
    <AppShell
      nav={
        <Link to="/elibrary" className="text-[var(--color-primary)] hover:underline">
          ← E-library
        </Link>
      }
    >
      <Card>
        <CardContent className="p-6">
          {view.isFetching ? <p className="text-sm text-[var(--color-muted-foreground)]">Opening…</p> : null}
          {view.isError ? <p className="text-sm text-rose-600">{errorText(view.error)}</p> : null}
          {item ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {item.resourceType} · {item.accessLevel}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[var(--color-ink)]">{item.title}</h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{item.authors || 'Unknown author'}</p>
              <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-ink)]">
                {item.abstract || 'No abstract is recorded for this item.'}
              </p>
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Views {item.viewCount} · Downloads {item.downloadCount}
              </p>
              {item.fileUrl ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" disabled={download.isFetching} onClick={() => download.refetch()}>
                    Download
                  </Button>
                  {download.data?.fileUrl ? (
                    <a className="text-sm text-[var(--color-primary)] hover:underline" href={download.data.fileUrl}>
                      File link
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  )
}
