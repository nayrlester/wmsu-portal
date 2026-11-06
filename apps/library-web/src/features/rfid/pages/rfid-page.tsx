import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { addShelfScan, fetchRfidGateEvents, fetchRfidTags, fetchShelfCount, fetchShelfCounts, readRfidGate, registerRfidTag, rfidCheckin, rfidCheckout, startShelfCount, type ShelfCountReport } from '@/lib/rfid-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

const copyStatusLabel: Record<string, string> = {
  available: 'Available',
  on_loan: 'On loan',
  reserved: 'Reserved',
  maintenance: 'In maintenance',
  damaged: 'Damaged',
  under_repair: 'Under repair',
  lost: 'Lost',
  withdrawn: 'Withdrawn',
}

function countWhen(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function statusText(status: string | null) {
  if (!status) return '—'
  return copyStatusLabel[status] || status
}

export function RfidPage() {
  const user = useAuthStore((s) => s.user)
  const canRegister = user?.permissions.includes('settings:update')
  const canCirculate = user?.permissions.includes('borrowings:checkout')
  const qc = useQueryClient()
  const [tagUid, setTagUid] = useState('')
  const [barcode, setBarcode] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [gateCode, setGateCode] = useState('EXIT')
  const [shelfCode, setShelfCode] = useState('RPT-01')
  const [scanValue, setScanValue] = useState('')
  const [shelfCount, setShelfCount] = useState<ShelfCountReport | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tags = useQuery({
    queryKey: ['hardware-rfid'],
    queryFn: fetchRfidTags,
  })

  const gateEvents = useQuery({
    queryKey: ['hardware-rfid-gate'],
    queryFn: fetchRfidGateEvents,
  })

  const savedCounts = useQuery({
    queryKey: ['hardware-shelf-counts'],
    queryFn: fetchShelfCounts,
  })

  function refresh() {
    void qc.invalidateQueries({ queryKey: ['hardware-rfid'] })
  }

  const registerTag = useMutation({
    mutationFn: () => registerRfidTag({ tagUid: tagUid.trim(), copyBarcode: barcode.trim() }),
    onSuccess: (tag) => {
      setError(null)
      setNotice(`Tag ${tag.tagUid} is linked to ${tag.barcode || 'a copy'}. Copy is ${statusText(tag.copyStatus).toLowerCase()}.`)
      setBarcode('')
      refresh()
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const checkIn = useMutation({
    mutationFn: () => rfidCheckin(tagUid.trim()),
    onSuccess: (result) => {
      setError(null)
      setNotice(
        `Checked in ${result.barcode}. ${result.bookTitle || 'The copy'} is ${statusText(result.copyStatus).toLowerCase()}.`
      )
      refresh()
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const startCount = useMutation({
    mutationFn: () => startShelfCount(shelfCode.trim()),
    onSuccess: (report) => {
      setError(null)
      setShelfCount(report)
      setNotice(`Shelf scan started for ${report.shelfCode}. ${report.missing.length} copies are recorded there.`)
      void qc.invalidateQueries({ queryKey: ['hardware-shelf-counts'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const addScan = useMutation({
    mutationFn: () => addShelfScan(shelfCount!.id, scanValue.trim()),
    onSuccess: (report) => {
      setError(null)
      setShelfCount(report)
      setScanValue('')
      void qc.invalidateQueries({ queryKey: ['hardware-shelf-counts'] })
      setNotice(
        `Shelf ${report.shelfCode}: seen ${report.seen.length}, missing ${report.missing.length}, not on this shelf ${report.elsewhere.length}, unknown ${report.unknown.length}.`
      )
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const openCount = useMutation({
    mutationFn: (countId: string) => fetchShelfCount(countId),
    onSuccess: (report) => {
      setError(null)
      setShelfCode(report.shelfCode)
      setShelfCount(report)
      setNotice(
        `Opened shelf ${report.shelfCode}. Seen ${report.seen.length}, missing ${report.missing.length}, unknown ${report.unknown.length}.`
      )
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const readGate = useMutation({
    mutationFn: () => readRfidGate({ tagUid: tagUid.trim(), gateCode: gateCode.trim() || 'EXIT' }),
    onSuccess: (event) => {
      setError(null)
      const outcome = event.result === 'clear' ? 'Clear' : 'Alarm'
      const item = event.bookTitle ? `${event.bookTitle}. ` : ''
      setNotice(`${outcome}. ${item}${event.reason}.`)
      void qc.invalidateQueries({ queryKey: ['hardware-rfid-gate'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const checkOut = useMutation({
    mutationFn: () => rfidCheckout({ tagUid: tagUid.trim(), cardNumber: cardNumber.trim() }),
    onSuccess: (result) => {
      setError(null)
      const loan = result.borrowing.transactionNumber || 'Loan'
      setNotice(
        `Checked out ${loan}. ${result.bookTitle || 'The copy'} is ${statusText(result.copyStatus).toLowerCase()}.`
      )
      refresh()
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">RFID desk</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Register a tag on a copy, then check that copy in or out. The copy status follows the same loan rules as the circulation desk.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={tagUid}
              onChange={(event) => setTagUid(event.target.value)}
              placeholder="Tag UID"
              aria-label="Tag UID"
            />
            <Input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Copy barcode"
              aria-label="Copy barcode"
            />
          </div>
          <Input
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
            placeholder="Library card for checkout"
            aria-label="Library card"
          />
          <Input
            value={gateCode}
            onChange={(event) => setGateCode(event.target.value)}
            placeholder="Gate code"
            aria-label="Gate code"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="whitespace-nowrap"
              disabled={!canRegister || registerTag.isPending || tagUid.trim().length < 4 || !barcode.trim()}
              onClick={() => registerTag.mutate()}
            >
              Register tag
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={!canCirculate || checkIn.isPending || tagUid.trim().length < 4}
              onClick={() => checkIn.mutate()}
            >
              Check in
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={!canCirculate || checkOut.isPending || tagUid.trim().length < 4 || cardNumber.trim().length < 3}
              onClick={() => checkOut.mutate()}
            >
              Check out
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={!canCirculate || readGate.isPending || tagUid.trim().length < 4 || gateCode.trim().length < 2}
              onClick={() => readGate.mutate()}
            >
              Read at gate
            </Button>
          </div>
          {notice ? <p className="text-sm text-[var(--color-ink)]">{notice}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Registered tags</h2>
          {(tags.data ?? []).map((tag) => (
            <div key={tag.id} className="border-b border-slate-100 py-2 text-sm">
              <p className="whitespace-nowrap font-mono font-semibold text-[var(--color-ink)]">{tag.tagUid}</p>
              <p className="text-[var(--color-muted-foreground)]">
                {tag.bookTitle || 'Unlinked'}
                {tag.barcode ? (
                  <>
                    {' · '}
                    <span className="whitespace-nowrap">{tag.barcode}</span>
                  </>
                ) : null}
                {' · '}
                <span className="whitespace-nowrap">{statusText(tag.copyStatus)}</span>
              </p>
            </div>
          ))}
          {!tags.data?.length && !tags.isLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No tags registered.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Gate reads</h2>
          {(gateEvents.data ?? []).map((event) => (
            <div key={event.id} className="border-b border-slate-100 py-2 text-sm">
              <p className="text-[var(--color-ink)]">
                <span className="whitespace-nowrap font-semibold">
                  {event.result === 'clear' ? 'Clear' : 'Alarm'}
                </span>
                {' · '}
                <span className="whitespace-nowrap font-mono">{event.tagUid}</span>
                {' · '}
                <span className="whitespace-nowrap">{event.gateCode}</span>
              </p>
              <p className="text-[var(--color-muted-foreground)]">{event.reason}</p>
            </div>
          ))}
          {!gateEvents.data?.length && !gateEvents.isLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No gate reads yet.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-semibold">Shelf scan</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Scan a tag or barcode. The report compares those reads with the copies recorded on the shelf.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={shelfCode}
              onChange={(event) => setShelfCode(event.target.value)}
              placeholder="Shelf code"
              aria-label="Shelf code"
            />
            <Input
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Tag or barcode"
              aria-label="Shelf scan"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="whitespace-nowrap"
              disabled={!canRegister || startCount.isPending || shelfCode.trim().length < 2}
              onClick={() => startCount.mutate()}
            >
              Start shelf scan
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={!canRegister || !shelfCount || addScan.isPending || scanValue.trim().length < 2}
              onClick={() => addScan.mutate()}
            >
              Add scan
            </Button>
          </div>
          {shelfCount ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--color-ink)]">
                Shelf <span className="whitespace-nowrap font-mono">{shelfCount.shelfCode}</span>
                {' · '}Seen {shelfCount.seen.length}
                {' · '}Missing {shelfCount.missing.length}
              </p>
              {shelfCount.seen.map((copy) => (
                <p key={copy.copyId}>
                  <span className="whitespace-nowrap font-medium">Seen</span>
                  {' · '}
                  <span className="whitespace-nowrap font-mono">{copy.barcode}</span>
                  {copy.bookTitle ? ` · ${copy.bookTitle}` : ''}
                </p>
              ))}
              {shelfCount.missing.map((copy) => (
                <p key={copy.copyId} className="text-[var(--color-muted-foreground)]">
                  <span className="whitespace-nowrap font-medium text-[var(--color-ink)]">Missing</span>
                  {' · '}
                  <span className="whitespace-nowrap font-mono">{copy.barcode}</span>
                  {copy.bookTitle ? ` · ${copy.bookTitle}` : ''}
                </p>
              ))}
              {shelfCount.elsewhere.map((copy) => (
                <p key={copy.copyId}>
                  <span className="whitespace-nowrap font-medium">Not on this shelf</span>
                  {' · '}
                  <span className="whitespace-nowrap font-mono">{copy.barcode}</span>
                </p>
              ))}
              {shelfCount.unknown.map((value) => (
                <p key={value}>
                  <span className="whitespace-nowrap font-medium">Unknown</span>
                  {' · '}
                  <span className="whitespace-nowrap font-mono">{value}</span>
                </p>
              ))}
            </div>
          ) : null}
          <h3 className="pt-2 font-medium">Saved shelf scans</h3>
          {(savedCounts.data ?? []).map((count) => (
            <div key={count.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
              <p className="text-[var(--color-ink)]">
                <span className="whitespace-nowrap font-mono">{count.shelfCode}</span>
                {' · '}
                <span className="whitespace-nowrap">{countWhen(count.createdAt)}</span>
                {' · '}Seen {count.seenCount}
                {' · '}Missing {count.missingCount}
                {' · '}Unknown {count.unknownCount}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="whitespace-nowrap"
                disabled={openCount.isPending}
                onClick={() => openCount.mutate(count.id)}
              >
                Open report
              </Button>
            </div>
          ))}
          {!savedCounts.data?.length && !savedCounts.isLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No shelf scans saved yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
