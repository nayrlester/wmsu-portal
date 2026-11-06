import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  getKioskApiError,
  kioskAccount,
  kioskCheckout,
  kioskHeartbeat,
  kioskHistory,
  kioskPatron,
  kioskRenew,
  kioskReturn,
  kioskSession,
  type KioskCredentials,
} from '@/lib/kiosk-api'
import { useKioskSessionStore } from '@/stores/kiosk-session-store'
import { useKioskStaffStore } from '@/stores/kiosk-staff-store'
import { getDefaultTenantSlug, getAppName } from '@librastack/client-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { KioskActionGrid } from '@/components/kiosk-action-grid'

type Mode = 'home' | 'borrow' | 'return' | 'renew' | 'account' | 'history'

function SoftBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-canvas)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[var(--color-sidebar)]" />
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/40" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-white/70" />
      <div className="relative">{children}</div>
    </div>
  )
}

export function KioskSelfServicePage() {
  const store = useKioskSessionStore()
  const staffEmail = useKioskStaffStore((s) => s.email)
  const staffName = useKioskStaffStore((s) => s.fullName)
  const [mode, setMode] = useState<Mode>('home')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [serverTime, setServerTime] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [setup, setSetup] = useState({
    deviceCode: store.deviceCode,
    apiKey: store.apiKey,
    tenantSlug: store.tenantSlug || getDefaultTenantSlug(),
  })

  const [cardNumber, setCardNumber] = useState('')
  const [barcode, setBarcode] = useState('')
  const [patronName, setPatronName] = useState<string | null>(null)
  const [accountData, setAccountData] = useState<Record<string, unknown> | null>(null)
  const [historyItems, setHistoryItems] = useState<Array<Record<string, unknown>>>([])

  const creds: KioskCredentials | null = useMemo(() => {
    if (!store.isConfigured()) return null
    return {
      deviceCode: store.deviceCode,
      apiKey: store.apiKey,
      tenantSlug: store.tenantSlug,
    }
  }, [store])

  const resetSession = useCallback(() => {
    setMode('home')
    setCardNumber('')
    setBarcode('')
    setPatronName(null)
    setAccountData(null)
    setHistoryItems([])
    setError(null)
    setMessage(null)
  }, [])

  useEffect(() => {
    if (!creds) return
    let cancelled = false
    ;(async () => {
      try {
        const session = await kioskSession(creds)
        if (cancelled) return
        store.setCredentials({
          deviceCode: creds.deviceCode,
          apiKey: creds.apiKey,
          tenantSlug: creds.tenantSlug,
          deviceName: session.device.name,
          idleTimeoutSeconds: session.device.idleTimeoutSeconds,
        })
        setServerTime(session.serverTime)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(getKioskApiError(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creds?.deviceCode, creds?.apiKey])

  useEffect(() => {
    if (!creds) return
    const id = window.setInterval(async () => {
      try {
        const beat = await kioskHeartbeat(creds)
        setServerTime(beat.serverTime)
      } catch {
        /* keep UI alive; next user action will surface auth errors */
      }
    }, 30000)
    return () => window.clearInterval(id)
  }, [creds])

  useEffect(() => {
    if (!creds || mode === 'home') return
    const timeoutMs = Math.max(15, store.idleTimeoutSeconds) * 1000
    let timer = window.setTimeout(resetSession, timeoutMs)
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(resetSession, timeoutMs)
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [creds, mode, store.idleTimeoutSeconds, resetSession])

  async function connectDevice(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = {
        deviceCode: setup.deviceCode.trim(),
        apiKey: setup.apiKey.trim(),
        tenantSlug: setup.tenantSlug.trim().toLowerCase(),
      }
      const session = await kioskSession(next)
      store.setCredentials({
        ...next,
        deviceName: session.device.name,
        idleTimeoutSeconds: session.device.idleTimeoutSeconds,
      })
      setServerTime(session.serverTime)
      setMessage('Kiosk connected')
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function startBorrow() {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const patron = await kioskPatron(creds!, cardNumber.trim())
      if (!patron.canBorrow) {
        setError('Account cannot borrow right now (enrollment, fines, overdue, or status).')
        return
      }
      setPatronName(patron.member.fullName)
      setMessage(`Welcome, ${patron.member.fullName}. Scan or enter the item barcode.`)
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function completeBorrow(e: FormEvent) {
    e.preventDefault()
    if (!patronName) {
      await startBorrow()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await kioskCheckout(creds!, {
        cardNumber: cardNumber.trim(),
        copyBarcode: barcode.trim(),
      })
      setServerTime(String(result.serverTime))
      setMessage('Borrow successful. Please take your materials.')
      setBarcode('')
      setTimeout(resetSession, 4000)
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function completeRenew(e: FormEvent) {
    e.preventDefault()
    if (!patronName) {
      await startBorrow()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await kioskRenew(creds!, {
        cardNumber: cardNumber.trim(),
        copyBarcode: barcode.trim(),
      })
      const due = result.borrowing.dueAt
        ? new Date(result.borrowing.dueAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Asia/Manila',
          })
        : 'the new due date'
      const used = result.borrowing.renewalCount ?? 0
      const max = result.borrowing.maxRenewals ?? 0
      setServerTime(String(result.serverTime))
      setMessage(
        `Renewed. "${result.borrowing.bookTitle ?? 'This item'}" is now due ${due}. Renewal ${used} of ${max}.`
      )
      setBarcode('')
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function completeReturn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await kioskReturn(creds!, barcode.trim())
      setServerTime(String(result.serverTime))
      setMessage('Return successful. Thank you.')
      setBarcode('')
      setTimeout(resetSession, 4000)
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function loadAccount(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await kioskAccount(creds!, cardNumber.trim())
      setAccountData(data)
      setServerTime(String(data.serverTime ?? ''))
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function loadHistory(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await kioskHistory(creds!, cardNumber.trim())
      setHistoryItems(data.items ?? [])
      setServerTime(data.serverTime)
    } catch (err) {
      setError(getKioskApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!creds) {
    return (
      <SoftBackdrop>
        <div className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
          <Card className="w-full animate-fade-up">
            <CardContent className="space-y-5 p-8 sm:p-10">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/wmsu-seal.png"
                    alt="WMSU"
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20"
                  />
                  <span className="text-xl font-bold tracking-tight text-[var(--color-ink)]">WMSU</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                  {getAppName(undefined, 'University Library Kiosk')}
                </h1>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Kiosk terminal setup — enter device credentials from Kiosk Platform.
                </p>
                {staffEmail ? (
                  <p className="mt-2 text-xs font-medium text-[var(--color-primary,#635bff)]">
                    Signed in via Identity as {staffName || staffEmail}
                  </p>
                ) : null}
              </div>
              <form onSubmit={connectDevice} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                    Device code (exact match from Kiosk Platform)
                  </label>
                  <Input
                    placeholder="e.g. KIOSK-001"
                    value={setup.deviceCode}
                    onChange={(e) => setSetup((s) => ({ ...s, deviceCode: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                    API key (full key, shown once on Save / Rotate)
                  </label>
                  <Input
                    placeholder="ksk_…"
                    value={setup.apiKey}
                    onChange={(e) => setSetup((s) => ({ ...s, apiKey: e.target.value }))}
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                    Tenant slug (not location — usually ulmis)
                  </label>
                  <Input
                    placeholder="ulmis"
                    value={setup.tenantSlug}
                    onChange={(e) => setSetup((s) => ({ ...s, tenantSlug: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                {error && (
                  <p className="text-sm text-rose-600">
                    {error}
                    {error.toLowerCase().includes('credential') && (
                      <span className="mt-1 block text-xs text-rose-500">
                        Check device code spelling and paste the full API key. If the key was lost,
                        use Rotate key in Kiosk Platform.
                      </span>
                    )}
                  </p>
                )}
                <Button type="submit" disabled={busy} className="h-12 w-full" size="lg">
                  Connect kiosk
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </SoftBackdrop>
    )
  }

  return (
    <SoftBackdrop>
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-6 animate-fade-up">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img
                src="/wmsu-seal.png"
                alt="WMSU"
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20"
              />
              <span className="text-xl font-bold tracking-tight text-[var(--color-ink)]">WMSU</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Self-service terminal
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-ink)] md:text-4xl">
              {store.deviceName || getAppName(undefined, 'University Library Kiosk')}
            </p>
            <p className="mt-1 font-mono text-sm text-[var(--color-muted-foreground)]">
              {store.deviceCode}
            </p>
            {staffEmail ? (
              <p className="mt-1 text-xs text-[var(--color-primary,#635bff)]">
                Staff SSO: {staffName || staffEmail}
              </p>
            ) : null}
          </div>
          <div className="text-right text-xs text-[var(--color-muted-foreground)]">
            <p className="uppercase tracking-[0.14em]">Server time</p>
            <p className="mt-1 font-mono text-sm font-medium text-[var(--color-primary)]">
              {serverTime ? new Date(serverTime).toLocaleString() : '—'}
            </p>
            <button
              type="button"
              className="mt-2 text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--color-primary)] hover:underline"
              onClick={() => {
                store.clear()
                resetSession()
              }}
            >
              Reconfigure
            </button>
          </div>
        </header>

        {(error || message) && (
          <div
            className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
              error
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-border)]'
            }`}
          >
            {error || message}
          </div>
        )}

        {mode === 'home' && (
          <KioskActionGrid
            onSelect={(id) => {
              setMode(id)
              setError(null)
              setMessage(null)
            }}
          />
        )}

        {mode === 'borrow' && (
          <Card className="mx-auto mt-10 w-full max-w-xl animate-fade-up">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-3xl font-bold text-[var(--color-ink)]">Borrow</h2>
              <form onSubmit={completeBorrow} className="space-y-4">
                <Input
                  autoFocus
                  className="h-14 text-lg"
                  placeholder="Library card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
                {patronName && (
                  <Input
                    className="h-14 text-lg"
                    placeholder="Item barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                  />
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetSession} className="h-12">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy} className="h-12 flex-1" size="lg">
                    {patronName ? 'Complete borrow' : 'Verify card'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'renew' && (
          <Card className="mx-auto mt-10 w-full max-w-xl animate-fade-up">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-3xl font-bold text-[var(--color-ink)]">Renew</h2>
              <form onSubmit={completeRenew} className="space-y-4">
                <Input
                  autoFocus
                  className="h-14 text-lg"
                  placeholder="Library card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
                {patronName && (
                  <Input
                    className="h-14 text-lg"
                    placeholder="Item barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    required
                  />
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetSession} className="h-12">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy} className="h-12 flex-1" size="lg">
                    {patronName ? 'Renew loan' : 'Verify card'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'return' && (
          <Card className="mx-auto mt-10 w-full max-w-xl animate-fade-up">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-3xl font-bold text-[var(--color-ink)]">Return</h2>
              <form onSubmit={completeReturn} className="space-y-4">
                <Input
                  autoFocus
                  className="h-14 text-lg"
                  placeholder="Item barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetSession} className="h-12">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy} className="h-12 flex-1" size="lg">
                    Return item
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'account' && (
          <Card className="mx-auto mt-10 w-full max-w-2xl animate-fade-up">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-3xl font-bold text-[var(--color-ink)]">Account status</h2>
              <form onSubmit={loadAccount} className="space-y-4">
                <Input
                  autoFocus
                  className="h-14 text-lg"
                  placeholder="Library card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetSession} className="h-12">
                    Done
                  </Button>
                  <Button type="submit" disabled={busy} className="h-12 flex-1" size="lg">
                    Check account
                  </Button>
                </div>
              </form>
              {accountData && (
                <div className="space-y-3 rounded-2xl bg-[var(--color-primary-soft)] p-5">
                  <p className="text-lg font-semibold text-[var(--color-ink)]">
                    {String(
                      (accountData.member as { fullName?: string } | undefined)?.fullName ??
                        'Member'
                    )}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Can borrow: {accountData.canBorrow ? 'Yes' : 'No'} · Active loans:{' '}
                    {Array.isArray(accountData.activeLoans) ? accountData.activeLoans.length : 0} ·
                    Outstanding fines:{' '}
                    {Array.isArray(accountData.outstandingFines)
                      ? accountData.outstandingFines.length
                      : 0}
                  </p>
                  <div className="space-y-2">
                    {(Array.isArray(accountData.activeLoans) ? accountData.activeLoans : []).map(
                      (loan: {
                        id?: string
                        bookTitle?: string
                        dueAt?: string
                        status?: string
                      }) => (
                        <div
                          key={String(loan.id)}
                          className="rounded-xl bg-white px-3 py-2 text-sm shadow-[var(--shadow-soft)]"
                        >
                          <p className="font-medium text-[var(--color-ink)]">
                            {loan.bookTitle ?? 'Loan'}
                          </p>
                          <p className="text-[var(--color-muted-foreground)]">
                            {loan.status} · due {loan.dueAt ?? '—'}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {mode === 'history' && (
          <Card className="mx-auto mt-10 w-full max-w-2xl animate-fade-up">
            <CardContent className="space-y-4 p-8">
              <h2 className="text-3xl font-bold text-[var(--color-ink)]">Borrowing history</h2>
              <form onSubmit={loadHistory} className="space-y-4">
                <Input
                  autoFocus
                  className="h-14 text-lg"
                  placeholder="Library card number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={resetSession} className="h-12">
                    Done
                  </Button>
                  <Button type="submit" disabled={busy} className="h-12 flex-1" size="lg">
                    Load history
                  </Button>
                </div>
              </form>
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={String(item.id)}
                    className="rounded-xl bg-[var(--color-primary-soft)] px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-[var(--color-ink)]">
                      {String(item.bookTitle ?? 'Untitled')}
                    </p>
                    <p className="text-[var(--color-muted-foreground)]">
                      {String(item.status)} · due {String(item.dueAt ?? '—')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SoftBackdrop>
  )
}
