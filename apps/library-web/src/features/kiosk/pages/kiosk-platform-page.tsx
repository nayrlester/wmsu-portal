import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MonitorSmartphone,
  Power,
  KeyRound,
  Ticket,
  MapPinned,
  ExternalLink,
} from 'lucide-react'
import { getKioskAppUrl, getOpacAppUrl } from '@/lib/deployment'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDialog } from '@/components/providers/dialog-provider'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  callNextTicket,
  completeQueueTicket,
  fetchKioskTransactions,
  fetchKiosks,
  fetchQueueAnalytics,
  fetchQueueBoard,
  fetchShelfLocations,
  issueQueueTicket,
  locateItem,
  rotateKioskKey,
  setKioskEnabled,
  upsertKiosk,
  upsertShelfLocation,
} from '@/lib/hardware-api'
import { useAuthStore } from '@/stores/auth-store'
import type { KioskDevice } from '@/types/hardware'

type Tab = 'devices' | 'queue' | 'locator' | 'logs'

export function KioskPlatformPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.permissions.includes('settings:update')
  const canQueue = user?.permissions.includes('borrowings:read')
  const canCall = user?.permissions.includes('borrowings:checkout')
  const canLocate = user?.permissions.includes('books:read')
  const canEditLoc = user?.permissions.includes('books:update')
  const { toast } = useDialog()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('devices')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    deviceCode: '',
    location: '',
    idleTimeoutSeconds: '60',
  })

  const [ticketForm, setTicketForm] = useState({ serviceType: 'circulation', patronName: '' })
  const [locForm, setLocForm] = useState({
    code: '',
    label: '',
    floor: '',
    aisle: '',
    shelf: '',
  })
  const [locateQ, setLocateQ] = useState('')
  const [locateSearch, setLocateSearch] = useState('')

  const { data: kiosks = [], isLoading } = useQuery({
    queryKey: ['hardware-kiosks'],
    queryFn: fetchKiosks,
  })

  const { data: board = [] } = useQuery({
    queryKey: ['hardware-queue-board'],
    queryFn: fetchQueueBoard,
    enabled: tab === 'queue' && Boolean(canQueue),
    refetchInterval: 5000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['hardware-queue-analytics'],
    queryFn: fetchQueueAnalytics,
    enabled: tab === 'queue' && Boolean(canQueue),
    refetchInterval: 5000,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['hardware-locations'],
    queryFn: fetchShelfLocations,
    enabled: tab === 'locator' && Boolean(canLocate),
  })

  const { data: locateResults = [] } = useQuery({
    queryKey: ['hardware-locate', locateSearch],
    queryFn: () => locateItem(locateSearch),
    enabled: tab === 'locator' && locateSearch.length > 0 && Boolean(canLocate),
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['hardware-kiosk-tx'],
    queryFn: () => fetchKioskTransactions(undefined, 80),
    enabled: tab === 'logs',
  })

  const saveKiosk = useMutation({
    mutationFn: upsertKiosk,
    onSuccess: (device) => {
      qc.invalidateQueries({ queryKey: ['hardware-kiosks'] })
      if (device.apiKey) setRevealedKey(device.apiKey)
      toast.success('Kiosk saved')
      setForm({ name: '', deviceCode: '', location: '', idleTimeoutSeconds: '60' })
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const toggleKiosk = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      setKioskEnabled(id, isEnabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-kiosks'] })
      toast.success('Kiosk updated')
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const rotateKey = useMutation({
    mutationFn: rotateKioskKey,
    onSuccess: (device) => {
      qc.invalidateQueries({ queryKey: ['hardware-kiosks'] })
      if (device.apiKey) setRevealedKey(device.apiKey)
      toast.success('API key rotated — copy it now')
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const issueTicket = useMutation({
    mutationFn: issueQueueTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-queue-board'] })
      qc.invalidateQueries({ queryKey: ['hardware-queue-analytics'] })
      toast.success('Ticket issued')
      setTicketForm((s) => ({ ...s, patronName: '' }))
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const callNext = useMutation({
    mutationFn: () => callNextTicket(ticketForm.serviceType),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['hardware-queue-board'] })
      qc.invalidateQueries({ queryKey: ['hardware-queue-analytics'] })
      toast.success(`Now serving ${ticket.ticketNumber}`)
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const finishTicket = useMutation({
    mutationFn: completeQueueTicket,
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['hardware-queue-board'] })
      qc.invalidateQueries({ queryKey: ['hardware-queue-analytics'] })
      toast.success(`Finished ${ticket.ticketNumber}`)
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const saveLocation = useMutation({
    mutationFn: upsertShelfLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware-locations'] })
      toast.success('Shelf location saved')
      setLocForm({ code: '', label: '', floor: '', aisle: '', shelf: '' })
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  const tabs = useMemo(
    () =>
      [
        { id: 'devices' as const, label: 'Devices', show: true },
        { id: 'queue' as const, label: 'Queue', show: Boolean(canQueue) },
        { id: 'locator' as const, label: 'Locator', show: Boolean(canLocate) },
        { id: 'logs' as const, label: 'Transaction logs', show: true },
      ].filter((t) => t.show),
    [canQueue, canLocate]
  )

  function submitDevice(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage) return
    saveKiosk.mutate({
      name: form.name.trim(),
      deviceCode: form.deviceCode.trim(),
      location: form.location.trim() || undefined,
      idleTimeoutSeconds: Number(form.idleTimeoutSeconds) || 60,
      isEnabled: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kiosk Platform</h1>
          <p className="text-sm text-slate-500">
            Manage self-service kiosks, service queue, and shelf locator boards
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={getKioskAppUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open kiosk app
          </a>
          <a
            href={getOpacAppUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open public OPAC
          </a>
          <a
            href={`${getOpacAppUrl()}/queue`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            Queue display
          </a>
        </div>
      </div>

      {revealedKey && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium text-amber-800">
              New API key (shown once). Provision it on the kiosk terminal, then dismiss.
            </p>
            <code className="block break-all rounded bg-slate-900 px-3 py-2 text-sm text-emerald-300">
              {revealedKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => setRevealedKey(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'devices' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <MonitorSmartphone className="h-4 w-4" />
                Register / update kiosk
              </h2>
              {!canManage && (
                <p className="text-sm text-slate-500">View only — admin/librarian can manage devices.</p>
              )}
              <form className="space-y-3" onSubmit={submitDevice}>
                <Input
                  required
                  disabled={!canManage}
                  placeholder="Display name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />
                <Input
                  required
                  disabled={!canManage}
                  placeholder="Device code (e.g. KIOSK-01)"
                  value={form.deviceCode}
                  onChange={(e) => setForm((s) => ({ ...s, deviceCode: e.target.value }))}
                />
                <Input
                  disabled={!canManage}
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                />
                <Input
                  disabled={!canManage}
                  type="number"
                  min={15}
                  max={600}
                  placeholder="Idle timeout (seconds)"
                  value={form.idleTimeoutSeconds}
                  onChange={(e) => setForm((s) => ({ ...s, idleTimeoutSeconds: e.target.value }))}
                />
                <Button type="submit" disabled={!canManage || saveKiosk.isPending}>
                  Save kiosk
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-slate-500">Loading devices…</p>
              ) : kiosks.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No kiosks registered yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {kiosks.map((k) => (
                    <KioskRow
                      key={k.id}
                      kiosk={k}
                      canManage={Boolean(canManage)}
                      onToggle={() =>
                        toggleKiosk.mutate({ id: k.id, isEnabled: !k.isEnabled })
                      }
                      onRotate={() => rotateKey.mutate(k.id)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'queue' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {analytics && (
            <Card className="lg:col-span-2">
              <CardContent className="space-y-2 p-4">
                <h2 className="font-semibold">Today</h2>
                <p className="text-sm text-slate-600">
                  Issued {analytics.issued} · Waiting {analytics.waiting} · Serving {analytics.serving} · Finished{' '}
                  {analytics.finished}
                </p>
                <p className="text-sm text-slate-600">
                  Average wait {durationLabel(analytics.averageWaitSeconds)} · Average service{' '}
                  {durationLabel(analytics.averageServiceSeconds)}
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <Ticket className="h-4 w-4" />
                Service desk console
              </h2>
              <Input
                placeholder="Service type"
                value={ticketForm.serviceType}
                onChange={(e) => setTicketForm((s) => ({ ...s, serviceType: e.target.value }))}
              />
              <Input
                placeholder="Patron name (optional)"
                value={ticketForm.patronName}
                onChange={(e) => setTicketForm((s) => ({ ...s, patronName: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canQueue || issueTicket.isPending}
                  onClick={() =>
                    issueTicket.mutate({
                      serviceType: ticketForm.serviceType.trim() || 'circulation',
                      patronName: ticketForm.patronName.trim() || undefined,
                    })
                  }
                >
                  Issue ticket
                </Button>
                <Button
                  variant="secondary"
                  disabled={!canCall || callNext.isPending}
                  onClick={() => callNext.mutate()}
                >
                  Call next
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-4">
              <h2 className="font-semibold">Live board</h2>
              {board.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
                  <span className="whitespace-nowrap font-semibold">{t.ticketNumber}</span>
                  <span className="text-slate-500">{t.serviceType}</span>
                  <span
                    className={
                      t.status === 'called' ? 'font-medium text-emerald-700' : 'text-slate-600'
                    }
                  >
                    {t.status}
                  </span>
                  {t.patronName && <span className="text-slate-500">{t.patronName}</span>}
                  {t.status === 'called' && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="whitespace-nowrap"
                      disabled={!canCall || finishTicket.isPending}
                      onClick={() => finishTicket.mutate(t.id)}
                    >
                      Finish service
                    </Button>
                  )}
                </div>
              ))}
              {!board.length && <p className="text-sm text-slate-500">No waiting tickets.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'locator' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPinned className="h-4 w-4" />
                Shelf locations
              </h2>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!canEditLoc) return
                  saveLocation.mutate({
                    code: locForm.code.trim(),
                    label: locForm.label.trim(),
                    floor: locForm.floor.trim() || undefined,
                    aisle: locForm.aisle.trim() || undefined,
                    shelf: locForm.shelf.trim() || undefined,
                  })
                }}
              >
                <Input
                  required
                  disabled={!canEditLoc}
                  placeholder="Code"
                  value={locForm.code}
                  onChange={(e) => setLocForm((s) => ({ ...s, code: e.target.value }))}
                />
                <Input
                  required
                  disabled={!canEditLoc}
                  placeholder="Label"
                  value={locForm.label}
                  onChange={(e) => setLocForm((s) => ({ ...s, label: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    disabled={!canEditLoc}
                    placeholder="Floor"
                    value={locForm.floor}
                    onChange={(e) => setLocForm((s) => ({ ...s, floor: e.target.value }))}
                  />
                  <Input
                    disabled={!canEditLoc}
                    placeholder="Aisle"
                    value={locForm.aisle}
                    onChange={(e) => setLocForm((s) => ({ ...s, aisle: e.target.value }))}
                  />
                  <Input
                    disabled={!canEditLoc}
                    placeholder="Shelf"
                    value={locForm.shelf}
                    onChange={(e) => setLocForm((s) => ({ ...s, shelf: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={!canEditLoc || saveLocation.isPending}>
                  Save location
                </Button>
              </form>
              <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {locations.map((loc) => (
                  <p key={loc.id} className="border-b border-slate-100 py-1">
                    <span className="font-medium">{loc.code}</span> — {loc.label}
                    {loc.floor ? ` · Floor ${loc.floor}` : ''}
                    {loc.aisle ? ` · Aisle ${loc.aisle}` : ''}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="font-semibold">Locate item</h2>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setLocateSearch(locateQ.trim())
                }}
              >
                <Input
                  value={locateQ}
                  onChange={(e) => setLocateQ(e.target.value)}
                  placeholder="Barcode or shelf location"
                />
                <Button type="submit">Find</Button>
              </form>
              <div className="space-y-2 text-sm">
                {locateResults.map((r) => (
                  <div key={r.copyId} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">{r.bookTitle ?? 'Untitled'}</p>
                    <p className="text-slate-500">
                      {r.barcode} · {r.shelfLocation || 'No shelf'} · {r.status}
                      {r.available ? ' · available' : ''}
                    </p>
                  </div>
                ))}
                {locateSearch && !locateResults.length && (
                  <p className="text-slate-500">No matches.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'logs' && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-semibold">Recent kiosk transactions</h2>
            {transactions.map((tx) => (
              <div key={tx.id} className="border-b border-slate-100 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium uppercase tracking-wide text-slate-700">
                    {tx.action}
                  </span>
                  <span className="text-slate-500">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto text-xs text-slate-500">
                  {JSON.stringify(tx.payload ?? {}, null, 0)}
                </pre>
              </div>
            ))}
            {!transactions.length && (
              <p className="text-sm text-slate-500">No kiosk transactions logged yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function durationLabel(seconds: number | null) {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)} min`
}

function KioskRow({
  kiosk,
  canManage,
  onToggle,
  onRotate,
}: {
  kiosk: KioskDevice
  canManage: boolean
  onToggle: () => void
  onRotate: () => void
}) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {kiosk.name}{' '}
          <span
            className={
              kiosk.isEnabled
                ? 'text-xs font-normal text-emerald-700'
                : 'text-xs font-normal text-rose-700'
            }
          >
            {kiosk.isEnabled ? 'enabled' : 'disabled'}
          </span>
        </p>
        <p className="text-sm text-slate-500">
          {kiosk.deviceCode}
          {kiosk.location ? ` · ${kiosk.location}` : ''} · idle {kiosk.idleTimeoutSeconds}s
        </p>
        <p className="text-xs text-slate-400">
          key {kiosk.apiKeyPrefix ? `${kiosk.apiKeyPrefix}…` : 'not set'} · last seen{' '}
          {kiosk.lastSeenAt ? new Date(kiosk.lastSeenAt).toLocaleString() : 'never'}
        </p>
      </div>
      {canManage && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onToggle}>
            <Power className="mr-1 h-3.5 w-3.5" />
            {kiosk.isEnabled ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="outline" onClick={onRotate}>
            <KeyRound className="mr-1 h-3.5 w-3.5" />
            Rotate key
          </Button>
        </div>
      )}
    </li>
  )
}
