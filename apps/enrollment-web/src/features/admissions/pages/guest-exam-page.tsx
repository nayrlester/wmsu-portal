import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@wmsu/ui'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  openGuestEntranceExam,
  submitGuestEntranceExam,
  type GuestExamSession,
} from '@/lib/usis-api'
import {
  GUEST_ORG_CODE,
  GuestPortalShell,
  persistGuestReceipt,
  readGuestReceipt,
} from '@/features/admissions/guest-portal-shared'

export function GuestExamPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saved = readGuestReceipt()
  const [applicationNumber, setApplicationNumber] = useState(
    params.get('applicationNumber') || saved?.applicationNumber || ''
  )
  const [email, setEmail] = useState(params.get('email') || saved?.email || '')
  const [eventId, setEventId] = useState(params.get('eventId') || '')
  const [session, setSession] = useState<GuestExamSession | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{
    result: string
    percentScore: number
    passScore: number
    correct: number
    maxScore: number
    suggestedStrand: string | null
    strandScores: Record<string, { correct: number; total: number; percent: number }>
  } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!session?.expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session?.expiresAt])

  const remainingLabel = useMemo(() => {
    if (!session?.expiresAt) return null
    const ms = new Date(session.expiresAt).getTime() - now
    if (ms <= 0) return 'Time expired'
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')} remaining`
  }, [session?.expiresAt, now])

  const openMutation = useMutation({
    mutationFn: () =>
      openGuestEntranceExam({
        orgCode: GUEST_ORG_CODE,
        applicationNumber: applicationNumber.trim(),
        email: email.trim(),
        eventId: eventId.trim() || undefined,
      }),
    onSuccess: (data) => {
      persistGuestReceipt(applicationNumber.trim(), email.trim())
      setSession(data)
      setEventId(data.eventId)
      setAnswers({})
      setResult(null)
    },
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!session) throw new Error('No exam session')
      return submitGuestEntranceExam({
        orgCode: GUEST_ORG_CODE,
        applicationNumber: applicationNumber.trim(),
        email: email.trim(),
        eventId: session.eventId,
        answers,
      })
    },
    onSuccess: (data) => {
      setResult({
        result: data.result,
        percentScore: data.percentScore,
        passScore: data.passScore,
        correct: data.correct,
        maxScore: data.maxScore,
        suggestedStrand: data.suggestedStrand,
        strandScores: data.strandScores || {},
      })
      setSession(null)
    },
  })

  const allAnswered = !!session && session.questions.every((q) => Number.isInteger(answers[q.id]))

  return (
    <GuestPortalShell
      title="Entrance examination"
      subtitle="New and freshman applicants take the scheduled online entrance exam here. Results appear immediately after submit, and also under Status."
    >
      <Card>
        <CardHeader>
          <CardTitle>Open exam session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="examApp" label="Application number">
              <Input
                id="examApp"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="APP-…"
              />
            </FormField>
            <FormField id="examEmail" label="Email used on application">
              <Input
                id="examEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!applicationNumber.trim() || !email.trim() || openMutation.isPending}
            onClick={() => openMutation.mutate()}
          >
            {openMutation.isPending ? 'Opening…' : 'Start / resume exam'}
          </Button>
          {openMutation.isError ? (
            <Alert variant="danger" title="Cannot open exam">
              {getApiErrorMessage(openMutation.error)}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Exam result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{result.result.toUpperCase()}</Badge>
              <span className="text-sm">
                Score {result.percentScore}% ({result.correct}/{result.maxScore}) · pass mark{' '}
                {result.passScore}%
              </span>
              {result.suggestedStrand ? (
                <Badge>Suggested strand: {result.suggestedStrand}</Badge>
              ) : null}
            </div>
            {Object.keys(result.strandScores).length > 0 ? (
              <div className="grid gap-2 text-sm md:grid-cols-4">
                {Object.entries(result.strandScores).map(([strand, row]) =>
                  row.total > 0 ? (
                    <div
                      key={strand}
                      className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
                    >
                      <p className="font-medium">{strand}</p>
                      <p className="text-[var(--color-muted-foreground)]">
                        {row.correct}/{row.total} ({row.percent}%)
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            ) : null}
            {result.result === 'pass' ? (
              <Alert variant="success" title="You passed">
                {result.suggestedStrand
                  ? `Exam performance suggests ${result.suggestedStrand}. Continue to Status for program guidance.`
                  : 'Continue to program selection and requirements on the status page.'}
              </Alert>
            ) : (
              <Alert variant="warning" title="Did not meet pass mark">
                You may retake while the examination window is open.
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  navigate(
                    `/apply/status?applicationNumber=${encodeURIComponent(applicationNumber.trim())}&email=${encodeURIComponent(email.trim())}`
                  )
                }
              >
                Continue journey
              </Button>
              {result.result === 'fail' ? (
                <Button type="button" variant="secondary" onClick={() => openMutation.mutate()}>
                  Retake exam
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {session ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{session.title}</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {session.applicant.lastName}, {session.applicant.firstName} ·{' '}
                  {session.applicant.applicationNumber}
                </p>
              </div>
              <div className="text-right text-sm">
                <Badge>Pass mark {session.passScore}%</Badge>
                {remainingLabel ? (
                  <p className="mt-2 font-medium text-[var(--color-ink)]">{remainingLabel}</p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.questions.map((q, index) => (
              <fieldset
                key={q.id}
                className="space-y-2 rounded-xl border border-[var(--color-border)] p-4"
              >
                <legend className="px-1 text-sm font-semibold text-[var(--color-ink)]">
                  {index + 1}. {q.prompt}
                </legend>
                <div className="space-y-2">
                  {q.choices.map((choice, choiceIndex) => (
                    <label
                      key={`${q.id}-${choiceIndex}`}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === choiceIndex}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: choiceIndex }))}
                      />
                      <span className="text-sm">{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            {submitMutation.isError ? (
              <Alert variant="danger" title="Submit failed">
                {getApiErrorMessage(submitMutation.error)}
              </Alert>
            ) : null}

            <Button
              type="button"
              disabled={!allAnswered || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit answers'}
            </Button>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              After submit, return anytime via{' '}
              <Link className="underline" to="/apply/status">
                /apply/status
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}
    </GuestPortalShell>
  )
}
