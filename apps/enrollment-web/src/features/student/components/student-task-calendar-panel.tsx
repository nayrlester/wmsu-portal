import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingState,
} from '@wmsu/ui'
import { fetchStudentTaskCalendar, type StudentTaskCalendarItem } from '@/lib/usis-api'

function formatCountdown(targetIso: string, nowMs: number) {
  const target = new Date(targetIso).getTime()
  if (Number.isNaN(target)) return '—'
  let diff = Math.max(0, target - nowMs)
  const days = Math.floor(diff / 86_400_000)
  diff -= days * 86_400_000
  const hours = Math.floor(diff / 3_600_000)
  diff -= hours * 3_600_000
  const minutes = Math.floor(diff / 60_000)
  diff -= minutes * 60_000
  const seconds = Math.floor(diff / 1000)
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

function kindLabel(kind: StudentTaskCalendarItem['kind']) {
  if (kind === 'faculty_evaluation') return 'Faculty evaluation'
  if (kind === 'grade_period_end') return 'Grade deadline'
  return 'Grade posted'
}

export function StudentTaskCalendarPanel() {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const calendar = useQuery({
    queryKey: ['student', 'task-calendar'],
    queryFn: fetchStudentTaskCalendar,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const nearestDueAt = calendar.data?.nearestDueAt ?? null
  const countdown = useMemo(
    () => (nearestDueAt ? formatCountdown(nearestDueAt, nowMs) : null),
    [nearestDueAt, nowMs]
  )

  if (calendar.isLoading) return <LoadingState label="Loading task calendar" />
  if (calendar.isError) {
    return (
      <Alert variant="danger" title="Task calendar unavailable">
        Unable to load deadlines and activities.
      </Alert>
    )
  }

  const items = calendar.data?.items ?? []
  const pendingEval = calendar.data?.pendingFacultyEvalCount ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Task calendar</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Deadlines, evaluations, and recent grade postings
          </p>
        </div>
        {nearestDueAt && countdown ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Next deadline
            </p>
            <p
              className="font-mono text-lg font-semibold text-[var(--color-ink)]"
              data-testid="task-calendar-countdown"
            >
              {countdown}
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingEval > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {pendingEval} faculty evaluation{pendingEval === 1 ? '' : 's'} pending
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link to="/student/faculty-eval">Open evaluations</Link>
            </Button>
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No upcoming tasks or recent grade activity for your account.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {items.slice(0, 12).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{item.detail}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {kindLabel(item.kind)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {item.dueAt ? (
                    <p className="font-mono text-[var(--color-ink)]">
                      {formatCountdown(item.dueAt, nowMs)}
                    </p>
                  ) : item.occurredAt ? (
                    <p className="text-[var(--color-muted-foreground)]">
                      {new Date(item.occurredAt).toLocaleString()}
                    </p>
                  ) : (
                    <Badge>Open</Badge>
                  )}
                  <Link
                    className="mt-1 block text-xs font-medium text-[var(--color-primary)]"
                    to={item.actionPath}
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
