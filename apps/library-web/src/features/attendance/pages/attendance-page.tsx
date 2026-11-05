import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  createAttendanceEvent,
  fetchAttendanceEvents,
  fetchAttendanceSummary,
} from '@/lib/attendance-api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/lib/sweet-alert'
import { getApiErrorMessage } from '@/lib/api-client'

export function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [cardNumber, setCardNumber] = useState('')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [date, setDate] = useState('')

  const canLog =
    user?.permissions.includes('members:update') || user?.permissions.includes('settings:update')

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: fetchAttendanceSummary,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-events', date],
    queryFn: () =>
      fetchAttendanceEvents({
        perPage: 50,
        date: date || undefined,
      }),
  })

  const logMut = useMutation({
    mutationFn: () =>
      createAttendanceEvent({
        cardNumber: cardNumber.trim(),
        direction,
        source: 'desk',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-events'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      setCardNumber('')
      toast.success('Attendance logged')
    },
    onError: (err) => toast.error(getApiErrorMessage(err) || 'Failed to log attendance'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Attendance</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Entry monitoring by library card number
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Today total', value: summary?.total ?? '—' },
          { label: 'Check-ins', value: summary?.checkIns ?? '—' },
          { label: 'Check-outs', value: summary?.checkOuts ?? '—' },
          { label: 'Unique cards', value: summary?.uniqueCards ?? '—' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canLog && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
            <Input
              placeholder="Library card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && cardNumber.trim()) logMut.mutate()
              }}
            />
            <select
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
            >
              <option value="in">Check in</option>
              <option value="out">Check out</option>
            </select>
            <Button
              onClick={() => logMut.mutate()}
              disabled={!cardNumber.trim() || logMut.isPending}
            >
              Log attendance
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </CardContent>
        </Card>
      )}

      {!canLog && (
        <Card>
          <CardContent className="p-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading attendance events...</p>
          ) : data?.events.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No attendance events.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {event.memberName ?? 'Unknown member'} · {event.cardNumber}
                    </p>
                    <p className="text-sm text-slate-500">
                      {event.direction.toUpperCase()} · {event.source} ·{' '}
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
