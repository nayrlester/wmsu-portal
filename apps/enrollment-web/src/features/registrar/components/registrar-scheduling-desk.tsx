import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Select, useNotification } from '@wmsu/ui'
import { StudentSearchSelect } from '@/components/student-search-select'
import {
  applyClassCodesLine,
  bulkUpdateSectionStatus,
  downloadSectionRosterCsv,
  encodeBlockGroup,
  fetchAcademicYears,
  fetchAdvisingPeriods,
  fetchSections,
  recordAdvisingBlockWaiver,
  replicateAcademicSchedules,
  searchAlternateSections,
  upsertAdvisingPeriod,
} from '@/lib/usis-api'
import { exportReport, fetchReport } from '@/lib/usis-reports-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCampusDate } from '@/lib/utils'

function scheduleOverlapHint(message: string) {
  if (!/overlap/i.test(message)) return message
  return `${message}. Class meetings cannot share the same day and time. Stagger section meetings in Academic catalog, encode one block group at a time, or apply one class code per subject.`
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[var(--color-primary-foreground)]">
      {n}
    </span>
  )
}

export function RegistrarSchedulingDesk() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const years = useQuery({ queryKey: ['reg', 'years', 'desk'], queryFn: () => fetchAcademicYears({ limit: 50 }) })
  const [filterYearId, setFilterYearId] = useState('')
  const sections = useQuery({
    queryKey: ['reg', 'sections', 'desk', filterYearId],
    queryFn: () => fetchSections({ limit: 200, academicYearId: filterYearId || undefined }),
    enabled: Boolean(filterYearId),
  })
  const [sourceYearId, setSourceYearId] = useState('')
  const [targetYearId, setTargetYearId] = useState('')
  const [replicateSem, setReplicateSem] = useState('1')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [periodYearId, setPeriodYearId] = useState('')
  const [periodSem, setPeriodSem] = useState('1')
  const [periodStart, setPeriodStart] = useState('2025-01-01')
  const [periodEnd, setPeriodEnd] = useState('2030-12-31')
  const periods = useQuery({
    queryKey: ['reg', 'advising-periods', periodYearId, periodSem],
    queryFn: () =>
      fetchAdvisingPeriods({
        academicYearId: periodYearId || undefined,
        semester: Number(periodSem) || 1,
      }),
    enabled: Boolean(periodYearId),
  })

  const [studentRef, setStudentRef] = useState('')
  const [blockCode, setBlockCode] = useState('BSIT-1A')
  const [classCodesLine, setClassCodesLine] = useState('')
  const [waiverRef, setWaiverRef] = useState('')
  const [waiverRole, setWaiverRole] = useState('Registrar')
  const [exportSectionId, setExportSectionId] = useState('')
  const [altSubjectCode, setAltSubjectCode] = useState('')
  const [altConflictSectionId, setAltConflictSectionId] = useState('')
  const [altResults, setAltResults] = useState<
    Awaited<ReturnType<typeof searchAlternateSections>>['alternatives'] | null
  >(null)

  const replicateMutation = useMutation({
    mutationFn: () =>
      replicateAcademicSchedules({
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        semester: Number(replicateSem) || 1,
      }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: 'Schedules replicated',
        description: `${data.created} created, ${data.skipped} skipped, ${data.meetingsCopied} meetings`,
      })
      void qc.invalidateQueries({ queryKey: ['reg', 'sections'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Replication failed', description: getApiErrorMessage(err) }),
  })

  const bulkMutation = useMutation({
    mutationFn: (status: 'open' | 'active' | 'closed') => bulkUpdateSectionStatus(selectedIds, status),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `${data.updated} sections set to ${data.status}` })
      setSelectedIds([])
      void qc.invalidateQueries({ queryKey: ['reg', 'sections'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Bulk update failed', description: getApiErrorMessage(err) }),
  })

  const periodMutation = useMutation({
    mutationFn: () =>
      upsertAdvisingPeriod({
        academicYearId: periodYearId,
        semester: Number(periodSem) || 1,
        startsAt: periodStart,
        endsAt: periodEnd,
        enforceCutoff: false,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Advising period saved' })
      void periods.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Period save failed', description: getApiErrorMessage(err) }),
  })

  const blockMutation = useMutation({
    mutationFn: () => encodeBlockGroup(studentRef.trim(), blockCode.trim()),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: `Block ${data.blockGroupCode} encoded`,
        description:
          data.addedCount > 0
            ? `${data.addedCount} line(s): ${data.sectionCodes?.join(' ') ?? ''}`
            : 'Student is already seated in every section for this block.',
      })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Block encode failed',
        description: scheduleOverlapHint(getApiErrorMessage(err)),
      }),
  })

  const codesMutation = useMutation({
    mutationFn: () => applyClassCodesLine(studentRef.trim(), classCodesLine.trim(), 'irregular'),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: 'Class codes applied',
        description: `${data.addedCount} line(s): ${data.sectionCodes.join(' ')}`,
      })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Class codes failed',
        description: scheduleOverlapHint(getApiErrorMessage(err)),
      }),
  })

  const waiverMutation = useMutation({
    mutationFn: () =>
      recordAdvisingBlockWaiver({
        enrollmentRef: waiverRef.trim(),
        authorityRole: waiverRole.trim(),
        reason: 'Block regular advising waiver',
      }),
    onSuccess: () => notify({ tone: 'success', title: 'Advising waiver recorded' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Waiver failed', description: getApiErrorMessage(err) }),
  })

  const utilizationMutation = useMutation({
    mutationFn: async () => {
      if (!filterYearId) throw new Error('Select an academic year first')
      return fetchReport('class-utilization', { academicYearId: filterYearId, semester: Number(replicateSem) || 1 })
    },
    onSuccess: (payload) => {
      notify({
        tone: 'success',
        title: 'Utilization loaded',
        description: `${payload.rows.length} section row(s) · ${payload.validation.message}`,
      })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Utilization failed', description: getApiErrorMessage(err) }),
  })

  const utilizationExportMutation = useMutation({
    mutationFn: async () => {
      if (!filterYearId) throw new Error('Select an academic year first')
      return exportReport('class-utilization', 'csv', {
        academicYearId: filterYearId,
        semester: Number(replicateSem) || 1,
      })
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'class-utilization.csv'
      link.click()
      URL.revokeObjectURL(url)
      notify({ tone: 'success', title: 'Utilization CSV downloaded' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Export failed', description: getApiErrorMessage(err) }),
  })

  const alternateMutation = useMutation({
    mutationFn: () =>
      searchAlternateSections({
        subjectCode: altSubjectCode.trim(),
        ...(altConflictSectionId.trim()
          ? { conflictingSectionId: altConflictSectionId.trim() }
          : {}),
      }),
    onSuccess: (data) => setAltResults(data.alternatives),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Alternate search failed', description: getApiErrorMessage(err) }),
  })

  const exportMutation = useMutation({
    mutationFn: () => downloadSectionRosterCsv(exportSectionId),
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `section-roster.csv`
      link.click()
      URL.revokeObjectURL(url)
      notify({ tone: 'success', title: 'Roster CSV downloaded' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Export failed', description: getApiErrorMessage(err) }),
  })

  const yearOptions = years.data?.data ?? []
  const sectionRows = sections.data?.data ?? []

  const blockGroupHints = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const row of sectionRows) {
      const code = row.blockGroupCode?.trim()
      if (!code) continue
      const list = map.get(code) ?? []
      list.push(row.code)
      map.set(code, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sectionRows])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6" data-testid="registrar-scheduling-desk">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StepBadge n={1} />
            Advising period
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <FormField id="periodYear" label="Academic year">
            <Select id="periodYear" value={periodYearId} onChange={(e) => setPeriodYearId(e.target.value)}>
              <option value="">Select</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="periodSemester" label="Semester">
            <Input id="periodSemester" value={periodSem} onChange={(e) => setPeriodSem(e.target.value)} />
          </FormField>
          <FormField id="periodStart" label="Starts">
            <Input id="periodStart" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </FormField>
          <FormField id="periodEnd" label="Ends">
            <Input id="periodEnd" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </FormField>
          {periods.data?.length ? (
            <p
              className="text-sm text-[var(--color-muted-foreground)] md:col-span-2"
              data-testid="advising-period-current"
            >
              Current: {formatCampusDate(periods.data[0]?.startsAt)} –{' '}
              {formatCampusDate(periods.data[0]?.endsAt)}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={!periodYearId || periodMutation.isPending}
            onClick={() => periodMutation.mutate()}
          >
            Save advising period
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StepBadge n={2} />
            Open sections for enrollment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="deskYear" label="Academic year filter">
            <Select
              id="deskYear"
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
            >
              <option value="">Select year</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code}
                </option>
              ))}
            </Select>
          </FormField>
          {sectionRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Sections scheduling desk">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Pick</th>
                    <th className="p-2">Code</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Enrolled</th>
                    <th className="p-2">Block</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.code}`}
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">{row.code}</td>
                      <td className="p-2">{row.status ?? '—'}</td>
                      <td className="p-2">
                        {row.enrolledCount ?? 0}/{row.capacity ?? '—'}
                      </td>
                      <td className="p-2">{row.blockGroupCode ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!selectedIds.length || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate('active')}
            >
              Open for enrollment
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!selectedIds.length || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate('closed')}
            >
              Close selected
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StepBadge n={3} />
            Seat student in class or section
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Regular students are usually seated via{' '}
            <Link to="/faculty/advising" className="font-medium text-[var(--color-primary)] underline">
              faculty advising
            </Link>
            , then{' '}
            <Link to="/registrar/registration" className="font-medium text-[var(--color-primary)] underline">
              registration approval
            </Link>
            . Use the tools below for block groups or irregular class codes. Meeting times must not
            overlap on the same day.
          </p>
          <FormField id="seatStudent" label="Student">
            <StudentSearchSelect value={studentRef} onChange={setStudentRef} />
          </FormField>
          {!filterYearId ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Select an academic year in step 2 first so block groups match the student&apos;s
              enrollment term.
            </p>
          ) : null}
          {filterYearId && blockGroupHints.length ? (
            <div
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm"
              data-testid="block-group-hints"
            >
              <p className="font-medium">Block groups in this year</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--color-muted-foreground)]">
                {blockGroupHints.map(([group, codes]) => (
                  <li key={group}>
                    <button
                      type="button"
                      className="font-medium text-[var(--color-primary)] underline"
                      onClick={() => setBlockCode(group)}
                    >
                      {group}
                    </button>
                    {' — '}
                    {codes.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : filterYearId ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No block groups found. Assign a block code on each subject section under{' '}
              <Link to="/registrar/academic" className="text-[var(--color-primary)] underline">
                Academic catalog → Section tools
              </Link>
              .
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="seatBlock" label="Block group encode">
              <Input
                id="seatBlock"
                list="desk-block-group-options"
                value={blockCode}
                onChange={(e) => setBlockCode(e.target.value)}
                placeholder="BSIT-1A"
              />
              <datalist id="desk-block-group-options">
                {blockGroupHints.map(([group]) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                data-testid="encode-block-group"
                disabled={
                  !studentRef.trim() ||
                  !blockCode.trim() ||
                  !filterYearId ||
                  blockMutation.isPending
                }
                onClick={() => blockMutation.mutate()}
              >
                Encode block
              </Button>
            </div>
          </div>
          <FormField id="seatCodes" label="Irregular class codes (one or more, space-separated)">
            <Input
              id="seatCodes"
              value={classCodesLine}
              onChange={(e) => setClassCodesLine(e.target.value)}
              placeholder="IT101-A"
            />
          </FormField>
          <Button
            type="button"
            data-testid="apply-class-codes"
            disabled={!studentRef.trim() || !classCodesLine.trim() || codesMutation.isPending}
            onClick={() => codesMutation.mutate()}
          >
            Apply class codes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <StepBadge n={4} />
            Verify roster
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <FormField id="exportSection" label="Section">
            <Select
              id="exportSection"
              value={exportSectionId}
              onChange={(e) => setExportSectionId(e.target.value)}
            >
              <option value="">Select section</option>
              {sectionRows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </Select>
          </FormField>
          <Button
            type="button"
            data-testid="desk-roster-export"
            disabled={!exportSectionId || exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            Download roster CSV
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/registrar/registration">Go to registration approval</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Advanced scheduling tools</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? 'Hide' : 'Show'}
          </Button>
        </CardHeader>
        {showAdvanced ? (
          <CardContent className="space-y-6">
            <ScheduleReplicatePanel
              replicateSem={replicateSem}
              setReplicateSem={setReplicateSem}
              sourceYearId={sourceYearId}
              setSourceYearId={setSourceYearId}
              targetYearId={targetYearId}
              setTargetYearId={setTargetYearId}
              yearOptions={yearOptions}
              replicateMutation={replicateMutation}
            />
            <Card className="shadow-none border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Block advising waiver</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <FormField id="waiverStudent" label="Student">
                  <StudentSearchSelect id="waiverStudent" value={waiverRef} onChange={setWaiverRef} />
                </FormField>
                <FormField id="waiverRole" label="Authority">
                  <Input id="waiverRole" value={waiverRole} onChange={(e) => setWaiverRole(e.target.value)} />
                </FormField>
                <Button
                  type="button"
                  disabled={!waiverRef.trim() || waiverMutation.isPending}
                  onClick={() => waiverMutation.mutate()}
                >
                  Record waiver
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-none border-dashed" data-testid="desk-utilization">
              <CardHeader>
                <CardTitle className="text-base">Class utilization (ENR-039)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-end">
                <p className="text-sm text-[var(--color-muted-foreground)] w-full">
                  Uses the academic year filter in step 2 and semester {replicateSem || '1'}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!filterYearId || utilizationMutation.isPending}
                  onClick={() => utilizationMutation.mutate()}
                >
                  Preview utilization
                </Button>
                <Button
                  type="button"
                  disabled={!filterYearId || utilizationExportMutation.isPending}
                  onClick={() => utilizationExportMutation.mutate()}
                >
                  Export CSV
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-none border-dashed" data-testid="desk-alternate-sections">
              <CardHeader>
                <CardTitle className="text-base">Alternate sections (ENR-039)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField id="altSubject" label="Subject code">
                  <Input
                    id="altSubject"
                    data-testid="alt-subject-code"
                    value={altSubjectCode}
                    onChange={(e) => setAltSubjectCode(e.target.value)}
                    placeholder="IT101"
                  />
                </FormField>
                <FormField id="altConflict" label="Conflicting section id (optional)">
                  <Input
                    id="altConflict"
                    value={altConflictSectionId}
                    onChange={(e) => setAltConflictSectionId(e.target.value)}
                  />
                </FormField>
                <Button
                  type="button"
                  disabled={!altSubjectCode.trim() || alternateMutation.isPending}
                  onClick={() => alternateMutation.mutate()}
                >
                  Search alternates
                </Button>
                {altResults?.length ? (
                  <ul className="text-sm space-y-1">
                    {altResults.map((row) => (
                      <li key={row.sectionId}>
                        {row.sectionCode} — {row.sectionName} · seats {row.seatsAvailable ?? '—'}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}

function ScheduleReplicatePanel(props: {
  replicateSem: string
  setReplicateSem: (v: string) => void
  sourceYearId: string
  setSourceYearId: (v: string) => void
  targetYearId: string
  setTargetYearId: (v: string) => void
  yearOptions: Array<{ id: string; code: string }>
  replicateMutation: { isPending: boolean; mutate: () => void }
}) {
  return (
    <Card className="shadow-none border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Replicate schedules across terms</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <p className="text-sm text-[var(--color-muted-foreground)] md:col-span-4">
          Copies section meeting patterns between academic years. This does not enroll or seat
          students.
        </p>
        <FormField id="srcYear" label="Source year">
          <Select
            id="srcYear"
            value={props.sourceYearId}
            onChange={(e) => props.setSourceYearId(e.target.value)}
          >
            <option value="">Select</option>
            {props.yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="tgtYear" label="Target year">
          <Select
            id="tgtYear"
            value={props.targetYearId}
            onChange={(e) => props.setTargetYearId(e.target.value)}
          >
            <option value="">Select</option>
            {props.yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="replSem" label="Semester">
          <Input
            id="replSem"
            value={props.replicateSem}
            onChange={(e) => props.setReplicateSem(e.target.value)}
          />
        </FormField>
        <div className="flex items-end">
          <Button
            type="button"
            disabled={
              !props.sourceYearId || !props.targetYearId || props.replicateMutation.isPending
            }
            onClick={() => props.replicateMutation.mutate()}
          >
            Replicate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
