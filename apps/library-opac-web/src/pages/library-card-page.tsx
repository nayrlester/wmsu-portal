import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toCanvas } from 'qrcode'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { fetchPortalCard } from '@/lib/opac-api'
import { useOpacSessionStore } from '@/stores/opac-session-store'

const memberTypeLabel: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  employee: 'Employee',
  researcher: 'Researcher',
  guest: 'Guest',
}

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'Could not load the library card.'
}

export function LibraryCardPage() {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const card = useQuery({
    queryKey: ['opac-library-card'],
    queryFn: fetchPortalCard,
    enabled: signedIn,
    retry: false,
  })

  useEffect(() => {
    const payload = card.data?.qrPayload
    const canvas = canvasRef.current
    if (!payload || !canvas) return
    void toCanvas(canvas, payload, {
      width: 168,
      margin: 1,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    })
  }, [card.data?.qrPayload])

  const typeLabel = card.data ? memberTypeLabel[card.data.memberType] || card.data.memberType : ''

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Library card</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Show this QR code at the desk or a self-service kiosk. It carries the same card number as your member profile.
          </p>
          {!signedIn ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Sign in through the WMSU Portal, then open the OPAC again, to view your library card.
            </p>
          ) : null}
          {card.isError ? <p className="mt-4 text-sm text-rose-600">{errorText(card.error)}</p> : null}
        </CardContent>
      </Card>

      {card.data ? (
        <Card className="mt-4">
          <CardContent className="px-6 py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {card.data.tenantName}
            </p>
            <div className="mt-4 flex justify-center">
              <canvas ref={canvasRef} className="rounded-2xl bg-white" aria-label="Library card QR code" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--color-ink)]">{card.data.fullName}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {typeLabel}
              {card.data.department ? ` · ${card.data.department}` : ''}
            </p>
            <p className="mt-3 font-mono text-sm tracking-widest text-[var(--color-ink)]">
              {card.data.libraryCardNumber}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  )
}
