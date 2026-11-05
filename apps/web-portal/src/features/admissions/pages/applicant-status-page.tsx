import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  FormField,
  Input,
  SearchableSelect,
  Select,
} from '@wmsu/ui'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  fetchPublicAdmissionPrograms,
  lookupApplicantPortalStatus,
  updateGuestAdmissionJourney,
  type ApplicantPortalStatus,
} from '@/lib/admissions-api'
import {
  ACADEMIC_STRAND_OPTIONS,
  GUEST_ORG_CODE,
  GuestPortalShell,
  JourneyStepper,
  SECONDARY_BACKGROUND_OPTIONS,
  persistGuestReceipt,
  readGuestReceipt,
  requirementsForClassification,
  type AcademicStrand,
  type SecondaryBackground,
} from '@/features/admissions/guest-portal-shared'

export function ApplicantStatusPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saved = readGuestReceipt()
  const [applicationNumber, setApplicationNumber] = useState(
    params.get('applicationNumber') || saved?.applicationNumber || ''
  )
  const [email, setEmail] = useState(params.get('email') || saved?.email || '')
  const [result, setResult] = useState<ApplicantPortalStatus | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [secondaryBackground, setSecondaryBackground] =
    useState<SecondaryBackground>('undecided')
  const [academicStrand, setAcademicStrand] = useState<AcademicStrand | ''>('')
  const [checklist, setChecklist] = useState<string[]>([])

  const programsQuery = useQuery({
    queryKey: ['guest', 'programs'],
    queryFn: () => fetchPublicAdmissionPrograms(GUEST_ORG_CODE),
  })

  const syncProfile = (data: ApplicantPortalStatus) => {
    setResult(data)
    setSelectedProgramId(data.programId || '')
    setSecondaryBackground(
      (data.secondaryBackground as SecondaryBackground | null) || 'undecided'
    )
    setAcademicStrand((data.academicStrand as AcademicStrand | null) || '')
    setChecklist(
      data.journey?.requirements?.length
        ? data.journey.requirements
        : requirementsForClassification(
            data.classification,
            (data.secondaryBackground as SecondaryBackground | null) || null
          )
    )
  }

  const lookup = useMutation({
    mutationFn: () =>
      lookupApplicantPortalStatus({
        orgCode: GUEST_ORG_CODE,
        applicationNumber: applicationNumber.trim(),
        email: email.trim(),
      }),
    onSuccess: (data) => {
      persistGuestReceipt(applicationNumber.trim(), email.trim())
      syncProfile(data)
    },
    onError: () => setResult(null),
  })

  useEffect(() => {
    if (applicationNumber && email && (params.get('applicationNumber') || saved)) {
      lookup.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const journeyMutation = useMutation({
    mutationFn: (payload: {
      programId?: string | null
      secondaryBackground?: SecondaryBackground | null
      academicStrand?: AcademicStrand | null
      requirementsChecklist?: string[]
      requirementsSubmitted?: boolean
    }) =>
      updateGuestAdmissionJourney({
        orgCode: GUEST_ORG_CODE,
        applicationNumber: applicationNumber.trim(),
        email: email.trim(),
        ...payload,
      }),
    onSuccess: (data) => syncProfile(data),
  })

  const catalog = useMemo(
    () =>
      requirementsForClassification(
        result?.classification,
        (result?.secondaryBackground as SecondaryBackground | null) || null
      ),
    [result?.classification, result?.secondaryBackground]
  )

  const suggestedIds = useMemo(
    () => new Set((result?.programGuidance?.suggestedPrograms ?? []).map((p) => p.id)),
    [result?.programGuidance]
  )

  return (
    <GuestPortalShell
      title="Applicant status & next steps"
      subtitle="Look up your application with the number from your submission receipt and the email you used. Take the entrance exam, view results, select a program, and submit requirements from here."
    >
      <Card>
        <CardHeader>
          <CardTitle>Look up application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="portalAppNumber" label="Application number">
              <Input
                id="portalAppNumber"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                placeholder="APP-…"
                autoComplete="off"
              />
            </FormField>
            <FormField id="portalEmail" label="Email">
              <Input
                id="portalEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!applicationNumber.trim() || !email.trim() || lookup.isPending}
            onClick={() => lookup.mutate()}
          >
            {lookup.isPending ? 'Checking…' : 'Check status'}
          </Button>
          {lookup.isError ? (
            <Alert variant="danger" title="Lookup failed">
              {getApiErrorMessage(lookup.error)}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {result.lastName}, {result.firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-mono">{result.applicationNumber}</span>
                <Badge>{result.status}</Badge>
                {result.classification ? <Badge>{result.classification}</Badge> : null}
                <span className="text-[var(--color-muted-foreground)]">
                  Applied {result.appliedAt ? new Date(result.appliedAt).toLocaleString() : '—'}
                </span>
              </div>

              {result.journey?.steps?.length ? (
                <JourneyStepper steps={result.journey.steps} />
              ) : null}

              {result.journey?.canTakeExam ? (
                <Alert variant="info" title="Entrance exam ready">
                  You can take the online entrance examination now.
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/apply/exam?applicationNumber=${encodeURIComponent(result.applicationNumber)}&email=${encodeURIComponent(result.email)}${
                            result.journey?.takeExamEventId
                              ? `&eventId=${encodeURIComponent(result.journey.takeExamEventId)}`
                              : ''
                          }`
                        )
                      }
                    >
                      Take entrance exam
                    </Button>
                  </div>
                </Alert>
              ) : null}

              {result.journey?.passedExam ? (
                <Alert variant="success" title="Entrance exam passed">
                  Select your program and submit requirements below, then wait for Admissions /
                  Registrar to Admit you.
                  {result.entranceExamOutcome?.suggestedStrand
                    ? ` Exam suggests Academic Track strand ${result.entranceExamOutcome.suggestedStrand}.`
                    : ''}
                </Alert>
              ) : null}

              {result.entranceExamOutcome?.suggestedStrand ||
              result.entranceExamOutcome?.percentScore != null ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
                  <p className="font-medium text-[var(--color-ink)]">Entrance exam result</p>
                  <p className="mt-1 text-[var(--color-muted-foreground)]">
                    Score {result.entranceExamOutcome.percentScore}%
                    {result.entranceExamOutcome.suggestedStrand
                      ? ` · suggested strand ${result.entranceExamOutcome.suggestedStrand}`
                      : ''}
                    {result.entranceExamOutcome.eventTitle
                      ? ` · ${result.entranceExamOutcome.eventTitle}`
                      : ''}
                  </p>
                  {result.entranceExamOutcome.strandScores ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(result.entranceExamOutcome.strandScores).map(
                        ([strand, row]) =>
                          row.total > 0 ? (
                            <Badge key={strand}>
                              {strand} {row.correct}/{row.total} ({row.percent}%)
                            </Badge>
                          ) : null
                      )}
                    </div>
                  ) : null}
                  {result.entranceExamOutcome.suggestedStrand ? (
                    <Button
                      type="button"
                      className="mt-3"
                      variant="secondary"
                      disabled={journeyMutation.isPending}
                      onClick={() =>
                        journeyMutation.mutate({
                          secondaryBackground: 'shs_academic',
                          academicStrand: result.entranceExamOutcome
                            ?.suggestedStrand as AcademicStrand,
                        })
                      }
                    >
                      Apply suggested strand ({result.entranceExamOutcome.suggestedStrand})
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {result.status === 'admitted' ? (
                <Alert variant="success" title="Admitted">
                  Sign in to the student portal to continue enrollment (draft → advising → payment →
                  COR).{' '}
                  <Link className="underline" to="/login">
                    Sign in
                  </Link>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exams / interviews / assessments</CardTitle>
            </CardHeader>
            <CardContent>
              {result.events.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  No scheduled events yet.
                  {(result.openOnlineExams?.length ?? 0) > 0
                    ? ' An online entrance exam window is open — use Take entrance exam above.'
                    : ''}
                </p>
              ) : (
                <DataTable
                  label="Admission events"
                  columns={[
                    { key: 'eventType', header: 'Type', render: (r) => r.eventType || '—' },
                    { key: 'title', header: 'Title', render: (r) => r.title || '—' },
                    {
                      key: 'scheduledAt',
                      header: 'When',
                      render: (r) =>
                        r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : '—',
                    },
                    {
                      key: 'deliveryMode',
                      header: 'Mode',
                      render: (r) => r.deliveryMode || 'onsite',
                    },
                    { key: 'result', header: 'Result' },
                    {
                      key: 'score',
                      header: 'Score',
                      render: (r) =>
                        r.percentScore != null
                          ? `${r.percentScore}%`
                          : r.score == null
                            ? '—'
                            : String(r.score),
                    },
                    {
                      key: 'canTakeOnline',
                      header: 'Action',
                      render: (r) =>
                        r.canTakeOnline ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              navigate(
                                `/apply/exam?applicationNumber=${encodeURIComponent(result.applicationNumber)}&email=${encodeURIComponent(result.email)}&eventId=${encodeURIComponent(r.eventId || '')}`
                              )
                            }
                          >
                            Take online
                          </Button>
                        ) : (
                          '—'
                        ),
                    },
                  ]}
                  data={result.events}
                  keyExtractor={(r) =>
                    `${r.eventId ?? r.title ?? 'event'}-${r.scheduledAt ?? r.result}`
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Secondary background & program guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField id="statusSecondaryBg" label="Secondary / SHS background">
                  <Select
                    id="statusSecondaryBg"
                    value={secondaryBackground}
                    onChange={(e) => {
                      const next = e.target.value as SecondaryBackground
                      setSecondaryBackground(next)
                      if (next !== 'shs_academic') setAcademicStrand('')
                    }}
                  >
                    {SECONDARY_BACKGROUND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {secondaryBackground === 'shs_academic' ? (
                  <FormField id="statusStrand" label="Academic Track strand">
                    <Select
                      id="statusStrand"
                      value={academicStrand}
                      onChange={(e) =>
                        setAcademicStrand(e.target.value as AcademicStrand | '')
                      }
                    >
                      <option value="">Select strand</option>
                      {ACADEMIC_STRAND_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label} — {s.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                ) : (
                  <p className="self-end text-sm text-[var(--color-muted-foreground)]">
                    {SECONDARY_BACKGROUND_OPTIONS.find((o) => o.value === secondaryBackground)
                      ?.hint}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={
                  journeyMutation.isPending ||
                  (secondaryBackground === 'shs_academic' && !academicStrand)
                }
                onClick={() =>
                  journeyMutation.mutate({
                    secondaryBackground,
                    academicStrand:
                      secondaryBackground === 'shs_academic' && academicStrand
                        ? academicStrand
                        : null,
                  })
                }
              >
                Save background
              </Button>

              {result.programGuidance ? (
                <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm">
                  <p className="font-medium text-[var(--color-ink)]">
                    {result.programGuidance.strandName
                      ? `${result.programGuidance.academicStrand}: ${result.programGuidance.strandName}`
                      : 'Program guidance'}
                  </p>
                  <p className="text-[var(--color-muted-foreground)]">
                    {result.programGuidance.guidanceNote}
                  </p>
                  {result.programGuidance.interests.length > 0 ? (
                    <p className="text-[var(--color-muted-foreground)]">
                      Typical interests: {result.programGuidance.interests.join(' · ')}
                    </p>
                  ) : null}
                  {(result.programGuidance.suggestedPrograms ?? []).length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-medium text-[var(--color-ink)]">Suggested programs</p>
                      <ul className="space-y-1">
                        {result.programGuidance.suggestedPrograms.slice(0, 8).map((p) => (
                          <li key={p.id} className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="underline underline-offset-2"
                              onClick={() => setSelectedProgramId(p.id)}
                            >
                              {p.code} — {p.name}
                            </button>
                            {p.matchedToStrand ? <Badge>strand match</Badge> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Program selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Current:{' '}
                {result.program
                  ? `${result.program.code} — ${result.program.name}`
                  : 'Not selected yet'}
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <FormField id="guestSelectProgram" label="Program">
                  <SearchableSelect
                    id="guestSelectProgram"
                    value={selectedProgramId}
                    onChange={setSelectedProgramId}
                    placeholder="Search program code or name…"
                    options={(programsQuery.data ?? []).map((p) => ({
                      value: p.id,
                      label: `${suggestedIds.has(p.id) ? '★ ' : ''}${p.code} — ${p.name}`,
                    }))}
                  />
                </FormField>
                <Button
                  type="button"
                  disabled={!selectedProgramId || journeyMutation.isPending}
                  onClick={() =>
                    journeyMutation.mutate({ programId: selectedProgramId || null })
                  }
                >
                  Save program
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Mark documents you are ready to submit. Admissions still verifies originals.
                {result.journey?.requirementsSubmitted
                  ? ' Checklist already marked submitted.'
                  : ''}
              </p>
              <div className="space-y-2">
                {catalog.map((item) => {
                  const checked = checklist.includes(item)
                  return (
                    <label key={item} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setChecklist((prev) =>
                            e.target.checked
                              ? [...prev, item]
                              : prev.filter((x) => x !== item)
                          )
                        }
                      />
                      <span>{item}</span>
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={journeyMutation.isPending}
                  onClick={() =>
                    journeyMutation.mutate({ requirementsChecklist: checklist })
                  }
                >
                  Save checklist
                </Button>
                <Button
                  type="button"
                  disabled={
                    journeyMutation.isPending ||
                    checklist.length === 0 ||
                    Boolean(result.journey?.requirementsSubmitted)
                  }
                  onClick={() =>
                    journeyMutation.mutate({
                      requirementsChecklist: checklist,
                      requirementsSubmitted: true,
                    })
                  }
                >
                  Submit for review
                </Button>
              </div>
              {journeyMutation.isError ? (
                <Alert variant="danger" title="Update failed">
                  {getApiErrorMessage(journeyMutation.error)}
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                label="Status history"
                columns={[
                  { key: 'fromStatus', header: 'From', render: (r) => r.fromStatus || '—' },
                  { key: 'toStatus', header: 'To' },
                  { key: 'note', header: 'Note', render: (r) => r.note || '—' },
                  {
                    key: 'createdAt',
                    header: 'When',
                    render: (r) =>
                      r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
                  },
                ]}
                data={result.statusHistory}
                keyExtractor={(r) => `${r.toStatus}-${r.createdAt ?? r.note ?? 'row'}`}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </GuestPortalShell>
  )
}
