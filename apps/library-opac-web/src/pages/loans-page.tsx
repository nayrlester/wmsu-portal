import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  cancelPortalHold,
  fetchPortalAccount,
  fetchPortalNotices,
  markPortalNoticeRead,
  renewPortalLoan,
  type PortalHold,
  type PortalLoan,
} from '@/lib/opac-api'
import { useOpacSessionStore } from '@/stores/opac-session-store'

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message || 'Could not update this library account.'
}

function dueLabel(value?: string | null) {
  if (!value) return 'No due date'
  return value.slice(0, 10)
}

export function LoansPage() {
  const signedIn = useOpacSessionStore((state) => Boolean(state.accessToken))
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const account = useQuery({
    queryKey: ['opac-portal-account'],
    queryFn: fetchPortalAccount,
    enabled: signedIn,
    retry: false,
  })

  const renew = useMutation({
    mutationFn: (loanId: string) => renewPortalLoan(loanId),
    onSuccess: async (loan) => {
      setError(null)
      setNotice(`${loan.bookTitle || 'Loan'} renewed. Due ${dueLabel(loan.dueAt)}.`)
      await queryClient.invalidateQueries({ queryKey: ['opac-portal-account'] })
      await queryClient.invalidateQueries({ queryKey: ['opac-portal-notices'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(errorText(err))
    },
  })

  const notices = useQuery({
    queryKey: ['opac-portal-notices'],
    queryFn: fetchPortalNotices,
    enabled: signedIn,
    retry: false,
  })

  const markRead = useMutation({
    mutationFn: markPortalNoticeRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['opac-portal-notices'] })
    },
  })

  const cancelHold = useMutation({
    mutationFn: cancelPortalHold,
    onSuccess: async () => {
      setError(null)
      setNotice('Hold cancelled.')
      await queryClient.invalidateQueries({ queryKey: ['opac-portal-account'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(errorText(err))
    },
  })

  const loans = account.data?.activeLoans ?? []
  const holds = account.data?.reservations ?? []

  return (
    <AppShell>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">My loans</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Renew a loan that is still on time. The new due date follows the library&apos;s current loan settings.
          </p>
          {!signedIn ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Sign in through the WMSU Portal, then open the OPAC again, to see loans on your library card.
            </p>
          ) : null}
          {account.data?.member ? (
            <p className="mt-3 text-sm text-[var(--color-ink)]">
              {account.data.member.fullName} · Card {account.data.member.libraryCardNumber}{' '}
              <Link to="/card" className="whitespace-nowrap font-medium text-[var(--color-primary)] hover:underline">
                View library card
              </Link>
            </p>
          ) : null}
          {account.isError ? <p className="mt-4 text-sm text-rose-600">{errorText(account.error)}</p> : null}
          {notice ? <p className="mt-4 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="mt-4 space-y-3">
        {loans.map((loan) => (
          <LoanRow key={loan.id} loan={loan} pending={renew.isPending} onRenew={() => renew.mutate(loan.id)} />
        ))}
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold text-[var(--color-ink)]">Holds</h2>
            {holds.map((hold) => (
              <HoldRow
                key={hold.id}
                hold={hold}
                pending={cancelHold.isPending}
                onCancel={() => cancelHold.mutate(hold.id)}
              />
            ))}
            {signedIn && account.isSuccess && holds.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No holds on this card.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold text-[var(--color-ink)]">Notices</h2>
            {(notices.data ?? []).map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="mt-1 text-[var(--color-muted-foreground)]">{item.body}</p>
                </div>
                {item.readAt ? (
                  <span className="text-[var(--color-muted-foreground)]">Read</span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            ))}
            {signedIn && notices.isSuccess && (notices.data ?? []).length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No notices yet.</p>
            ) : null}
          </CardContent>
        </Card>
        {signedIn && account.isSuccess && loans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No loans on this card.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}

function HoldRow({
  hold,
  pending,
  onCancel,
}: {
  hold: PortalHold
  pending: boolean
  onCancel: () => void
}) {
  const ready = hold.status === 'ready'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div>
        <p className="font-medium text-[var(--color-ink)]">{hold.bookTitle || 'Untitled'}</p>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          {ready ? 'Ready for pickup' : 'Waiting'}
          {hold.queuePosition ? ` · Queue ${hold.queuePosition}` : ''}
          {hold.expiresAt ? (
            <span className="whitespace-nowrap">{` · Through ${hold.expiresAt.slice(0, 10)}`}</span>
          ) : null}
        </p>
      </div>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
        Cancel hold
      </Button>
    </div>
  )
}

function LoanRow({
  loan,
  pending,
  onRenew,
}: {
  loan: PortalLoan
  pending: boolean
  onRenew: () => void
}) {
  const canRenew =
    loan.status === 'borrowed' && (loan.renewalCount ?? 0) < (loan.maxRenewals ?? 0)
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold text-[var(--color-ink)]">{loan.bookTitle || 'Untitled'}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Due {dueLabel(loan.dueAt)} · Renewed {loan.renewalCount ?? 0} of {loan.maxRenewals ?? 0}
          </p>
        </div>
        <Button type="button" disabled={!canRenew || pending} onClick={onRenew}>
          Renew
        </Button>
      </CardContent>
    </Card>
  )
}
