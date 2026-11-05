import { useState } from 'react'
import { DollarSign, HandCoins, ShieldOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFineSummary, useFines, useWaiveFine, useCollectFine } from '@/hooks/use-fines'
import { formatCents, FINE_REASON_LABELS, FINE_STATUS_LABELS } from '@/types/fines'
import { useAuthStore } from '@/stores/auth-store'

export function FinesSummaryPanel() {
  const user = useAuthStore((s) => s.user)
  const canCollect = user?.permissions.includes('fines:collect')
  const canWaive = user?.permissions.includes('fines:waive')

  const { data: summary } = useFineSummary()
  const { data: finesData, isLoading } = useFines({ status: 'pending', perPage: 10 })
  const waiveFine = useWaiveFine()
  const collectFine = useCollectFine()

  const [activeFineId, setActiveFineId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [waiveReason, setWaiveReason] = useState('')

  async function handleCollect(fineId: string, balanceCents: number) {
    const cents = paymentAmount
      ? Math.round(Number.parseFloat(paymentAmount) * 100)
      : balanceCents
    await collectFine.mutateAsync({
      id: fineId,
      payload: { amountCents: cents, paymentMethod: 'cash' },
    })
    setActiveFineId(null)
    setPaymentAmount('')
  }

  async function handleWaive(fineId: string) {
    if (!waiveReason.trim()) return
    await waiveFine.mutateAsync({
      id: fineId,
      payload: { reason: waiveReason },
    })
    setActiveFineId(null)
    setWaiveReason('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Fines</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">
              {formatCents(summary?.totalOutstandingCents ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{summary?.pendingCount ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Partial</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{summary?.partialCount ?? 0}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading fines...</p>
        ) : finesData?.fines.length === 0 ? (
          <p className="text-sm text-slate-500">No outstanding fines.</p>
        ) : (
          <div className="space-y-2">
            {finesData?.fines.map((fine) => (
              <div
                key={fine.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{fine.memberName}</p>
                    <p className="text-slate-500">
                      {FINE_REASON_LABELS[fine.reason] ?? fine.reason}
                      {fine.bookTitle ? ` · ${fine.bookTitle}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCents(fine.balanceCents)}
                    </p>
                    <p className="text-xs text-slate-500">{FINE_STATUS_LABELS[fine.status]}</p>
                  </div>
                </div>

                {(canCollect || canWaive) && fine.balanceCents > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeFineId !== fine.id ? (
                      <>
                        {canCollect && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveFineId(fine.id)}
                          >
                            <HandCoins className="mr-1 h-3 w-3" />
                            Collect
                          </Button>
                        )}
                        {canWaive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveFineId(fine.id)}
                          >
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Waive
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="w-full space-y-2 border-t border-slate-100 pt-2">
                        {canCollect && (
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Amount (${formatCents(fine.balanceCents)} max)`}
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="h-8"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCollect(fine.id, fine.balanceCents)}
                              disabled={collectFine.isPending}
                            >
                              Pay
                            </Button>
                          </div>
                        )}
                        {canWaive && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Waiver reason"
                              value={waiveReason}
                              onChange={(e) => setWaiveReason(e.target.value)}
                              className="h-8"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWaive(fine.id)}
                              disabled={waiveFine.isPending}
                            >
                              Waive
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveFineId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
