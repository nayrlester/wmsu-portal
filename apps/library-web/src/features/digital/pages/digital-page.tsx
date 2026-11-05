import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  accessRepositoryItem,
  createEresource,
  createRepositoryItem,
  digitalUnifiedSearch,
  fetchEresources,
  fetchRepository,
  type EresourceItem,
  type RepositoryItem,
  type RepositoryResourceType,
} from '@/lib/digital-api'
import { toast } from '@/lib/sweet-alert'
import { useAuthStore } from '@/stores/auth-store'

const RESOURCE_TYPES: Array<{ value: RepositoryResourceType; label: string }> = [
  { value: 'thesis', label: 'Thesis' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'faculty_publication', label: 'Faculty publication' },
  { value: 'research_report', label: 'Research report' },
  { value: 'multimedia', label: 'Multimedia' },
  { value: 'conference_paper', label: 'Conference paper' },
  { value: 'institutional_document', label: 'Institutional document' },
  { value: 'ebook', label: 'E-book' },
  { value: 'other', label: 'Other' },
]

function isPdfUrl(url: string) {
  const cleaned = url.split('?')[0]?.toLowerCase() ?? ''
  return cleaned.endsWith('.pdf') || cleaned.includes('/pdf')
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function DigitalPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate = user?.permissions.includes('digital:create')
  const canAccess = user?.permissions.includes('digital:access')

  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerTitle, setViewerTitle] = useState('')

  const [repoTitle, setRepoTitle] = useState('')
  const [repoType, setRepoType] = useState<RepositoryResourceType>('thesis')
  const [repoFileUrl, setRepoFileUrl] = useState('')

  const [erTitle, setErTitle] = useState('')
  const [erAccessUrl, setErAccessUrl] = useState('')

  const { data: repo } = useQuery({
    queryKey: ['digital-repo'],
    queryFn: () => fetchRepository({ perPage: 20 }),
  })

  const { data: eresources } = useQuery({
    queryKey: ['eresources'],
    queryFn: fetchEresources,
  })

  const { data: unified } = useQuery({
    queryKey: ['digital-search', search],
    queryFn: () => digitalUnifiedSearch(search),
    enabled: search.length > 0,
  })

  const createRepoMut = useMutation({
    mutationFn: createRepositoryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digital-repo'] })
      setRepoTitle('')
      setRepoFileUrl('')
      setRepoType('thesis')
      toast.success('Repository item created')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const createErMut = useMutation({
    mutationFn: createEresource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eresources'] })
      setErTitle('')
      setErAccessUrl('')
      toast.success('E-resource registered')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  async function handleRepoAccess(item: RepositoryItem, mode: 'view' | 'download') {
    if (!canAccess) {
      toast.error('Missing permission: digital:access')
      return
    }
    try {
      const accessed = await accessRepositoryItem(item.id, mode)
      const fileUrl = accessed.fileUrl?.trim()
      if (!fileUrl) {
        toast.error('No file URL available for this item')
        return
      }

      if (mode === 'download') {
        openExternal(fileUrl)
        toast.success('Download started')
        qc.invalidateQueries({ queryKey: ['digital-repo'] })
        return
      }

      if (isPdfUrl(fileUrl)) {
        setViewerTitle(accessed.title)
        setViewerUrl(fileUrl)
      } else {
        openExternal(fileUrl)
      }
      qc.invalidateQueries({ queryKey: ['digital-repo'] })
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Digital Library</h1>
        <p className="text-sm text-slate-500">
          Institutional repository, e-resources, and unified discovery
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Unified search across repository and e-resources"
        />
        <Button type="submit">Search</Button>
      </form>

      {unified && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-semibold">Unified results</p>
            {(unified.repository ?? []).map((item) => (
              <div
                key={`repository-${item.id}`}
                className="flex flex-col gap-2 border-b border-slate-100 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  <span className="text-slate-500">[repository]</span> {item.title} · {item.type}
                </p>
                {canAccess && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void handleRepoAccess(
                          { id: item.id, title: item.title, resourceType: item.type },
                          'view'
                        )
                      }
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void handleRepoAccess(
                          { id: item.id, title: item.title, resourceType: item.type },
                          'download'
                        )
                      }
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {(unified.electronic ?? []).map((item) => (
              <div
                key={`electronic-${item.id}`}
                className="flex flex-col gap-2 border-b border-slate-100 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  <span className="text-slate-500">[electronic]</span> {item.title} · {item.type}
                </p>
                {item.accessUrl ? (
                  <Button size="sm" variant="outline" onClick={() => openExternal(item.accessUrl!)}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open
                  </Button>
                ) : null}
              </div>
            ))}
            {!unified.repository?.length && !unified.electronic?.length && (
              <p className="text-slate-500">No matches.</p>
            )}
          </CardContent>
        </Card>
      )}

      {viewerUrl && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{viewerTitle || 'PDF viewer'}</p>
                <p className="text-xs text-slate-500">In-page preview</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openExternal(viewerUrl)}>
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Open tab
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setViewerUrl(null)}>
                  Close
                </Button>
              </div>
            </div>
            <iframe
              title={viewerTitle || 'PDF viewer'}
              src={viewerUrl}
              className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
            />
          </CardContent>
        </Card>
      )}

      {canCreate && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="font-semibold">Add repository item</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  createRepoMut.mutate({
                    title: repoTitle.trim(),
                    resourceType: repoType,
                    fileUrl: repoFileUrl.trim() || undefined,
                  })
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="repo-title">Title</Label>
                  <Input
                    id="repo-title"
                    value={repoTitle}
                    onChange={(e) => setRepoTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="repo-type">Resource type</Label>
                  <select
                    id="repo-type"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={repoType}
                    onChange={(e) => setRepoType(e.target.value as RepositoryResourceType)}
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="repo-file">File URL</Label>
                  <Input
                    id="repo-file"
                    type="url"
                    placeholder="https://…"
                    value={repoFileUrl}
                    onChange={(e) => setRepoFileUrl(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={createRepoMut.isPending || !repoTitle.trim()}>
                  {createRepoMut.isPending ? 'Saving…' : 'Create repository item'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="font-semibold">Add e-resource</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  createErMut.mutate({
                    title: erTitle.trim(),
                    accessUrl: erAccessUrl.trim() || undefined,
                    resourceKind: 'open_access',
                  })
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="er-title">Title</Label>
                  <Input
                    id="er-title"
                    value={erTitle}
                    onChange={(e) => setErTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="er-url">Access URL</Label>
                  <Input
                    id="er-url"
                    type="url"
                    placeholder="https://…"
                    value={erAccessUrl}
                    onChange={(e) => setErAccessUrl(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={createErMut.isPending || !erTitle.trim()}>
                  {createErMut.isPending ? 'Saving…' : 'Create e-resource'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-semibold">Repository</h2>
            {(repo?.data ?? []).map((item: RepositoryItem) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 border-b border-slate-100 py-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-slate-500">
                    {item.resourceType}
                    {item.authors ? ` · ${item.authors}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    Views {item.viewCount ?? 0} · Downloads {item.downloadCount ?? 0}
                  </p>
                </div>
                {canAccess && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRepoAccess(item, 'view')}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRepoAccess(item, 'download')}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {!repo?.data?.length && <p className="text-sm text-slate-500">No repository items yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-semibold">Electronic resources</h2>
            {(eresources ?? []).map((item: EresourceItem) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 border-b border-slate-100 py-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-slate-500">
                    {item.resourceKind}
                    {item.provider ? ` · ${item.provider}` : ''}
                  </p>
                </div>
                {item.accessUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => openExternal(item.accessUrl!)}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open
                  </Button>
                ) : null}
              </div>
            ))}
            {!eresources?.length && (
              <p className="text-sm text-slate-500">No electronic resources registered.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
