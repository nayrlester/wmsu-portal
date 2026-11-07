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
  openEresource,
  digitalUnifiedSearch,
  fetchEresources,
  fetchRepository,
  type EresourceItem,
  type EresourceKind,
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

function accessLabel(method: string) {
  if (method === 'sso') return 'Single sign-on'
  if (method === 'proxy') return 'Proxy link'
  if (method === 'open') return 'Open link'
  return method
}

function kindLabel(value?: string | null) {
  const text = value?.trim()
  if (!text || text === 'undefined' || text === 'null') return null
  return text.replaceAll('_', ' ')
}

function unifiedSourceLabel(source?: string | null, fallback: 'Repository' | 'E-resource' = 'E-resource') {
  if (source === 'repository') return 'Repository'
  if (source === 'electronic') return 'E-resource'
  return fallback
}

function formatUnifiedResultLabel(
  source: 'Repository' | 'E-resource',
  title?: string | null,
  type?: string | null
) {
  const safeTitle = title?.trim() || 'Untitled'
  const safeType = kindLabel(type)
  return safeType ? `${source} · ${safeTitle} · ${safeType}` : `${source} · ${safeTitle}`
}

function resolveViewerUrl(fileUrl: string) {
  const raw = fileUrl.trim()
  if (!raw) return raw
  try {
    const url = new URL(raw, window.location.origin)
    if (url.hostname === 'library.wmsu.edu.ph') {
      const fileName = url.pathname.split('/').filter(Boolean).pop() || 'demo-repository.pdf'
      return `${window.location.origin}/samples/${fileName}`
    }
    return url.toString()
  } catch {
    if (raw.startsWith('/')) return raw
    return raw
  }
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
  const [viewerError, setViewerError] = useState<string | null>(null)

  const [repoTitle, setRepoTitle] = useState('')
  const [repoType, setRepoType] = useState<RepositoryResourceType>('thesis')
  const [repoAuthors, setRepoAuthors] = useState('')
  const [repoSubjects, setRepoSubjects] = useState('')
  const [repoYear, setRepoYear] = useState('')
  const [repoAbstract, setRepoAbstract] = useState('')
  const [repoAccess, setRepoAccess] = useState<'public' | 'restricted'>('public')
  const [repoFileUrl, setRepoFileUrl] = useState('')

  const [erTitle, setErTitle] = useState('')
  const [erKind, setErKind] = useState<EresourceKind>('database')
  const [erProvider, setErProvider] = useState('')
  const [erAuth, setErAuth] = useState('sso')
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
      setRepoAuthors('')
      setRepoSubjects('')
      setRepoYear('')
      setRepoAbstract('')
      setRepoAccess('public')
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
      setErKind('database')
      setErProvider('')
      setErAuth('sso')
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
      const fileUrl = resolveViewerUrl(accessed.fileUrl?.trim() || '')
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
        setViewerError(null)
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
                <p className="text-[var(--color-ink)]">
                  {formatUnifiedResultLabel(
                    unifiedSourceLabel(item.source, 'Repository'),
                    item.title,
                    item.type
                  )}
                  {item.accessLevel ? ` · ${item.accessLevel}` : ''}
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
                <p className="text-[var(--color-ink)]">
                  {formatUnifiedResultLabel(
                    unifiedSourceLabel(item.source, 'E-resource'),
                    item.title,
                    item.type
                  )}
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setViewerUrl(null)
                    setViewerError(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
            {viewerError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {viewerError}
              </p>
            ) : null}
            <iframe
              title={viewerTitle || 'PDF viewer'}
              src={viewerUrl}
              className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
              onError={() =>
                setViewerError('Preview could not be loaded. Use Open tab or try again later.')
              }
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
                  const year = Number(repoYear)
                  createRepoMut.mutate({
                    title: repoTitle.trim(),
                    resourceType: repoType,
                    authors: repoAuthors.trim() || undefined,
                    subjects: repoSubjects.trim() || undefined,
                    publicationYear: Number.isFinite(year) && repoYear.trim() ? year : undefined,
                    abstract: repoAbstract.trim() || undefined,
                    accessLevel: repoAccess,
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
                  <Label htmlFor="repo-authors">Authors</Label>
                  <Input id="repo-authors" value={repoAuthors} onChange={(e) => setRepoAuthors(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="repo-subjects">Subjects</Label>
                  <Input id="repo-subjects" value={repoSubjects} onChange={(e) => setRepoSubjects(e.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="repo-year">Year</Label>
                    <Input id="repo-year" inputMode="numeric" value={repoYear} onChange={(e) => setRepoYear(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="repo-access">Access</Label>
                    <select
                      id="repo-access"
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={repoAccess}
                      onChange={(e) => setRepoAccess(e.target.value as 'public' | 'restricted')}
                    >
                      <option value="public">Public</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="repo-abstract">Abstract</Label>
                  <textarea
                    id="repo-abstract"
                    className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={repoAbstract}
                    onChange={(e) => setRepoAbstract(e.target.value)}
                  />
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
                    resourceKind: erKind,
                    provider: erProvider.trim() || undefined,
                    authMethod: erAuth,
                    accessUrl: erAccessUrl.trim() || undefined,
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
                  <Label htmlFor="er-kind">Kind</Label>
                  <select
                    id="er-kind"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={erKind}
                    onChange={(e) => setErKind(e.target.value as EresourceKind)}
                  >
                    <option value="database">Database</option>
                    <option value="ebook">E-book</option>
                    <option value="ejournal">E-journal</option>
                    <option value="open_access">Open access</option>
                    <option value="multimedia">Multimedia</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="er-provider">Provider</Label>
                  <Input id="er-provider" value={erProvider} onChange={(e) => setErProvider(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="er-auth">Patron access</Label>
                  <select
                    id="er-auth"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={erAuth}
                    onChange={(e) => setErAuth(e.target.value)}
                  >
                    <option value="sso">Single sign-on</option>
                    <option value="open">Open link</option>
                    <option value="proxy">Proxy link</option>
                  </select>
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
                    {item.accessLevel ? ` · ${item.accessLevel}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    Views {item.viewCount ?? 0} · Downloads {item.downloadCount ?? 0}
                  </p>
                </div>
                {canAccess && (item.accessLevel !== 'restricted' || canCreate) && (
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
                    {item.authMethod ? ` · ${accessLabel(item.authMethod)}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">Views {item.viewCount ?? 0}</p>
                </div>
                {item.accessUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      void openEresource(item.id)
                        .then((opened) => {
                          qc.invalidateQueries({ queryKey: ['eresources'] })
                          if (opened.accessUrl) openExternal(opened.accessUrl)
                        })
                        .catch((err) => toast.error(getApiErrorMessage(err)))
                    }}
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
