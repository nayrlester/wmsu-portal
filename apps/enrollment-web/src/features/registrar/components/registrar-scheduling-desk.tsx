import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
  upsertAdvisingPeriod,
} from '@/lib/usis-api'
import { getApiErrorMessage } from '@/lib/api-client'

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
        description: `${data.addedCount} line(s)`,
      })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Block encode failed', description: getApiErrorMessage(err) }),
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
      notify({ tone: 'danger', title: 'Class codes failed', description: getApiErrorMessage(err) }),
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6" data-testid="registrar-scheduling-desk">
      <Card>
        <CardHeader>
          <CardTitle>Scheduling desk</CardTitle>
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
          <CardTitle>Replicate schedules across terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <FormField id="srcYear" label="Source year">
            <Select id="srcYear" value={sourceYearId} onChange={(e) => setSourceYearId(e.target.value)}>
              <option value="">Select</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="tgtYear" label="Target year">
            <Select id="tgtYear" value={targetYearId} onChange={(e) => setTargetYearId(e.target.value)}>
              <option value="">Select</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="replSem" label="Semester">
            <Input id="replSem" value={replicateSem} onChange={(e) => setReplicateSem(e.target.value)} />
          </FormField>
          <div className="flex items-end">
            <Button
              type="button"
              disabled={!sourceYearId || !targetYearId || replicateMutation.isPending}
              onClick={() => replicateMutation.mutate()}
            >
              Replicate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advising period</CardTitle>
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
            <p className="text-sm text-[var(--color-muted-foreground)] md:col-span-2">
              Current: {periods.data[0]?.startsAt} – {periods.data[0]?.endsAt}
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
          <CardTitle>Student seating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="seatStudent" label="Student">
            <StudentSearchSelect value={studentRef} onChange={setStudentRef} />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="seatBlock" label="Block group encode">
              <Input id="seatBlock" value={blockCode} onChange={(e) => setBlockCode(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                data-testid="encode-block-group"
                disabled={!studentRef.trim() || !blockCode.trim() || blockMutation.isPending}
                onClick={() => blockMutation.mutate()}
              >
                Encode block
              </Button>
            </div>
          </div>
          <FormField id="seatCodes" label="Irregular class codes (space-separated)">
            <Input
              id="seatCodes"
              value={classCodesLine}
              onChange={(e) => setClassCodesLine(e.target.value)}
              placeholder="IT101-A GE101-A"
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
          <CardTitle>Block advising waiver</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Class roster export (ENR-012)</CardTitle>
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
            disabled={!exportSectionId || exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            Download CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
