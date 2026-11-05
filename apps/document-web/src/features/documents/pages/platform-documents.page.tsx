import { useState } from 'react'
import { Download, Layers } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { usePlatformDocuments } from '@/features/documents/hooks/use-platform-documents'
import {
  platformDocumentsApi,
  type PlatformDocumentPrefix,
} from '@/api/modules/platform-documents.api'
import { apiConfig, API_HEADERS } from '@/api/config'
import { formatBytes } from '@/lib/utils'
import { tokenStorage } from '@/shared/lib/token-storage'
import { tenantContext } from '@/api/lib/tenant-context'

const FILTERS: Array<{ label: string; value?: PlatformDocumentPrefix }> = [
  { label: 'All' },
  { label: 'HRIS', value: 'hris' },
  { label: 'Library', value: 'library' },
  { label: 'UDMS', value: 'doctrack' },
]

function platformBadgeClass(prefix: PlatformDocumentPrefix): string {
  switch (prefix) {
    case 'hris':
      return 'bg-sky-100 text-sky-800'
    case 'library':
      return 'bg-amber-100 text-amber-900'
    case 'doctrack':
      return 'bg-emerald-100 text-emerald-900'
  }
}

export function PlatformDocumentsPage() {
  const [prefix, setPrefix] = useState<PlatformDocumentPrefix | undefined>()
  const { data, isLoading, isError, error, refetch, isFetching } = usePlatformDocuments({
    platformPrefix: prefix,
    limit: 50,
    offset: 0,
  })

  async function handleDownload(id: string) {
    try {
      const meta = await platformDocumentsApi.downloadMeta(id)
      if (meta.url) {
        window.open(meta.url, '_blank', 'noopener,noreferrer')
        return
      }
    } catch {
      // fall through to authenticated fetch
    }

    const token = tokenStorage.getAccessToken()
    const tenantId = tenantContext.getActiveTenantId()
    const headers: Record<string, string> = {}
    if (token) headers[API_HEADERS.authorization] = `Bearer ${token}`
    if (tenantId) headers[API_HEADERS.tenantId] = tenantId
    const res = await fetch(`${apiConfig.baseURL}/account/platform-documents/${id}/download`, {
      headers,
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'download'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageContainer
      title="Platform Documents"
      breadcrumb="Home / Documents / Platform"
      description="Cross-product files from HRIS, Library, and UDMS (enterprise Document Service)"
      action={
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          Refresh
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = prefix === f.value
          return (
            <Button
              key={f.label}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setPrefix(f.value)}
            >
              {f.label}
            </Button>
          )
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading platform documents…</p>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Could not load platform documents</p>
          <p className="mt-1 text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <p className="mt-2 text-muted-foreground">
            Ensure the tenant has <code>platform_organization_id</code> and the API has{' '}
            <code>PLATFORM_DOCUMENTS_URL</code> + <code>SERVICE_API_KEY</code>.
          </p>
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No platform documents yet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            New uploads from HRIS, Library digital files, and UDMS appear here with a platform
            label.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{doc.originalName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${platformBadgeClass(doc.platformPrefix)}`}
                    >
                      {doc.platformLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDownload(doc.id)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {data.items.length} of {data.total}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
