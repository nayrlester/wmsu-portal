import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DashboardCard,
  FormField,
  Input,
  SearchableSelect,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage } from '@/components/query-page'
import { StudentSearchSelect } from '@/components/student-search-select'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import { useHasPermission } from '@/lib/permissions'
import {
  encodeClassGrades,
  exportClassGradeReport,
  fetchAdvisingDashboard,
  fetchAdvisingSessions,
  fetchClassGradeReport,
  fetchClassRecords,
  fetchGradeCorrections,
  fetchFacultyScheduleNotifications,
  fetchMyFacultyAssignments,
  markScheduleNotificationRead,
  openClassRecord,
  requestGradeCorrection,
  submitClassGrades,
} from '@/lib/usis-api'
import { downloadBlob } from '@/lib/usis-reports-api'

export function FacultyDashboardPage() {
  return (
    <RequirePermission anyOf={['grades.write', 'advising.write', 'advising.read']}>
      <FacultyDashboardInner />
    </RequirePermission>
  )
}

function FacultyDashboardInner() {
  const queryClient = useQueryClient()
  const canAdvise = useHasPermission('advising.read', 'advising.write')
  const assignments = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: fetchMyFacultyAssignments,
  })
  const advising = useQuery({
    queryKey: ['faculty', 'advising-dash'],
    queryFn: fetchAdvisingDashboard,
    enabled: canAdvise,
    retry: false,
  })
  const scheduleNotifs = useQuery({
    queryKey: ['faculty', 'schedule-notifications'],
    queryFn: fetchFacultyScheduleNotifications,
    retry: false,
  })
  const markNotif = useMutation({
    mutationFn: (id: string) => markScheduleNotificationRead(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['faculty', 'schedule-notifications'] }),
  })
  const assignedCount = assignments.data?.length ?? 0
  const advisingCompletion =
    typeof advising.data?.completionRate === 'number'
      ? `${Math.round(Number(advising.data.completionRate) * 100)}%`
      : canAdvise
        ? '—'
        : 'n/a'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Faculty dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Overview of your teaching load, advising progress, and schedule notices.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardCard title="Assigned classes" value={assignedCount} />
        <DashboardCard title="Advising completion" value={advisingCompletion} />
        <DashboardCard title="Schedule notices" value={scheduleNotifs.data?.length ?? 0} />
      </div>
      {assignedCount === 0 && !assignments.isLoading ? (
        <Alert variant="warning" title="No classes assigned to this account">
          Sign in as a faculty/adviser user (demo: <code>faculty@ph-demo.wmsu.edu.ph</code>) or ask
          the Registrar to assign sections to your faculty user. Registrar accounts do not receive
          teaching loads here.
        </Alert>
      ) : null}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            to="/faculty/classes"
            className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Assigned classes
          </Link>
          <Link
            to="/faculty/master-lists"
            className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Class master lists
          </Link>
          <Link
            to="/faculty/grades/encode"
            className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Grade encoding
          </Link>
          {canAdvise ? (
            <Link
              to="/faculty/advising"
              className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              Academic advising
            </Link>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schedule notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(scheduleNotifs.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No class schedule change notices.
            </p>
          ) : (
            (scheduleNotifs.data ?? []).slice(0, 8).map((n) => (
              <div key={n.id} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{n.eventType}</Badge>
                  <span className="font-medium">{n.title}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{n.body}</p>
                {!n.readAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={markNotif.isPending}
                    onClick={() => markNotif.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {assignedCount > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Your classes (preview)</CardTitle>
            <Link
              className="text-sm font-medium text-[var(--color-primary)] underline"
              to="/faculty/classes"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <DataTable
              label="Assigned classes preview"
              columns={[
                {
                  key: 'section',
                  header: 'Section',
                  render: (r) => r.section?.code ?? r.sectionId,
                },
                { key: 'name', header: 'Name', render: (r) => r.section?.name ?? '—' },
                { key: 'semester', header: 'Semester' },
              ]}
              data={(assignments.data ?? []).slice(0, 5)}
              keyExtractor={(r) => r.id}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export function FacultyClassesPage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultyClassesInner />
    </RequirePermission>
  )
}

function FacultyClassesInner() {
  const navigate = useNavigate()
  const assignments = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: fetchMyFacultyAssignments,
  })
  return (
    <QueryPage
      title="Assigned classes"
      description="Sections assigned to you for this term. Open a master list or encode grades from Actions."
      query={assignments}
      isEmpty={(d) => d.length === 0}
      emptyTitle="No assigned classes"
      emptyDescription="Ask the Registrar to assign your faculty user to a section (demo faculty: faculty@ph-demo.wmsu.edu.ph)."
    >
      {(rows) => (
        <DataTable
          label="Faculty assignments"
          columns={[
            {
              key: 'section',
              header: 'Section',
              className: 'whitespace-nowrap',
              render: (r) => r.section?.code ?? r.sectionId,
            },
            { key: 'name', header: 'Name', render: (r) => r.section?.name ?? '—' },
            { key: 'semester', header: 'Semester', className: 'whitespace-nowrap' },
            {
              key: 'year',
              header: 'AY',
              className: 'whitespace-nowrap font-mono text-xs',
              render: (r) => r.academicYearId.slice(0, 8),
            },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
          actions={(r) => (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate(`/faculty/master-lists?assignment=${r.id}`)}
              >
                Master list
              </Button>
              <Button type="button" size="sm" onClick={() => navigate('/faculty/grades/encode')}>
                Encode
              </Button>
            </>
          )}
        />
      )}
    </QueryPage>
  )
}

export function FacultyMasterListsPage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultyMasterInner />
    </RequirePermission>
  )
}

function FacultyMasterInner() {
  const [params] = useSearchParams()
  const assignmentFromQuery = params.get('assignment') ?? ''
  const assignments = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: fetchMyFacultyAssignments,
  })
  const [selected, setSelected] = useState<string>(assignmentFromQuery)
  useEffect(() => {
    if (assignmentFromQuery) setSelected(assignmentFromQuery)
  }, [assignmentFromQuery])
  const assignment = useMemo(
    () => assignments.data?.find((a) => a.id === selected) ?? assignments.data?.[0],
    [assignments.data, selected]
  )
  const master = useQuery({
    queryKey: ['faculty', 'master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
    retry: false,
  })

  if (assignments.isLoading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading assigned classes…</p>
  }

  if (!(assignments.data ?? []).length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Class master lists
        </h1>
        <Alert variant="warning" title="No class assigned">
          There is no teaching assignment on this account, so a master list cannot be opened. Use{' '}
          <Link className="underline" to="/faculty/classes">
            Assigned classes
          </Link>{' '}
          after the Registrar assigns you, or sign in as faculty (
          <code>faculty@ph-demo.wmsu.edu.ph</code>).
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FormField id="assignment" label="Class">
        <SearchableSelect
          id="assignment"
          value={assignment?.id ?? ''}
          onChange={setSelected}
          placeholder="Search assigned class…"
          options={(assignments.data ?? []).map((a) => ({
            value: a.id,
            label: `${a.section?.code ?? a.sectionId} · ${a.section?.name ?? 'Section'} · sem ${a.semester}`,
          }))}
        />
      </FormField>
      {master.isError ? (
        <Alert variant="danger" title="Unable to open class record">
          {getApiErrorMessage(master.error)}
        </Alert>
      ) : null}
      <QueryPage
        title="Class master list"
        description={
          master.data?.classRecord
            ? `${master.data.classRecord.subjectCode} — ${master.data.classRecord.subjectTitle}`
            : undefined
        }
        query={master}
        isEmpty={(d) => d.roster.length === 0}
        emptyTitle="No students on this roster"
        emptyDescription="This class record opened, but no registered enrollment lines are linked yet for the section/subject. Complete student registration into the section first, then reopen the master list."
      >
        {(data) => (
          <DataTable
            label="Master list"
            columns={[
              { key: 'studentNumber', header: 'Student #', render: (r) => r.studentNumber ?? '—' },
              {
                key: 'name',
                header: 'Name',
                render: (r) =>
                  r.lastName || r.firstName
                    ? `${r.lastName ?? ''}, ${r.firstName ?? ''}`.replace(/^,\s*|,\s*$/g, '')
                    : '—',
              },
              {
                key: 'mark',
                header: 'Current mark',
                render: (r) =>
                  data.entries.find((e) => e.studentId === r.studentId)?.markCode ?? '—',
              },
            ]}
            data={data.roster}
            keyExtractor={(r) => r.studentId}
          />
        )}
      </QueryPage>
    </div>
  )
}

const encodeSchema = z.object({
  markCode: z.string().min(1, 'Mark is required'),
  rawScore: z.string().optional(),
})

export function FacultyEncodePage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultyEncodeInner />
    </RequirePermission>
  )
}

function FacultyEncodeInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const assignments = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: fetchMyFacultyAssignments,
  })
  const assignment = assignments.data?.[0]
  const master = useQuery({
    queryKey: ['faculty', 'encode-master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
  })
  const [studentId, setStudentId] = useState('')
  const form = useForm<z.infer<typeof encodeSchema>>({
    resolver: zodResolver(encodeSchema),
    defaultValues: { markCode: '2.00', rawScore: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof encodeSchema>) => {
      if (!master.data?.classRecord.id || !studentId) throw new Error('Select a student')
      const raw = values.rawScore?.trim()
      return encodeClassGrades({
        classRecordId: master.data.classRecord.id,
        grades: [
          {
            studentId,
            markCode: values.markCode,
            ...(raw ? { rawScore: Number(raw) } : {}),
          },
        ],
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Grade encoded' })
      qc.invalidateQueries({ queryKey: ['faculty', 'encode-master'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Encode failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade encoding</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-lg gap-3">
        {!assignment ? (
          <Alert variant="warning" title="No faculty assignment">
            Ask the Registrar to assign your classes.
          </Alert>
        ) : null}
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Enter final mark codes and optional raw scores from online or pen-and-paper activities.
          Entry timestamp is recorded automatically by the API.
        </p>
        <FormField id="student" label="Student">
          {(master.data?.roster ?? []).length > 0 ? (
            <SearchableSelect
              id="student"
              value={studentId}
              onChange={setStudentId}
              placeholder="Type a name or student number…"
              emptyText="No students in this class match"
              options={(master.data?.roster ?? []).map((r) => ({
                value: r.studentId,
                label: `${r.studentNumber} · ${r.lastName}, ${r.firstName}`,
              }))}
            />
          ) : (
            <StudentSearchSelect
              id="student"
              value={studentId}
              onChange={setStudentId}
              placeholder="Type a name or student number…"
            />
          )}
        </FormField>
        <form className="grid gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <FormField id="rawScore" label="Raw score (optional)">
            <Input id="rawScore" {...form.register('rawScore')} placeholder="e.g. 87.5" />
          </FormField>
          <FormField
            id="markCode"
            label="Mark code"
            error={form.formState.errors.markCode?.message}
            required
          >
            <Input
              id="markCode"
              {...form.register('markCode')}
              placeholder="1.00 / INC / DRP / NG"
            />
          </FormField>
          <Button type="submit" disabled={mutation.isPending}>
            Encode grade
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function FacultySubmitPage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultySubmitInner />
    </RequirePermission>
  )
}

function FacultySubmitInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const assignments = useQuery({
    queryKey: ['faculty', 'assignments'],
    queryFn: fetchMyFacultyAssignments,
  })
  const classRecords = useQuery({
    queryKey: ['faculty', 'class-records'],
    queryFn: () => fetchClassRecords({ page: 1, limit: 50 }),
  })
  const classRecordRows = classRecords.data?.data ?? []
  const assignment = assignments.data?.[0]
  const [pickedRecordId, setPickedRecordId] = useState('')
  const [sigRole, setSigRole] = useState('Faculty')
  const [sigName, setSigName] = useState('Faculty of record')
  const [sigRole2, setSigRole2] = useState('Department Chair')
  const [sigName2, setSigName2] = useState('')
  const master = useQuery({
    queryKey: ['faculty', 'submit-master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
  })
  const classRecordId =
    master.data?.classRecord.id || pickedRecordId || classRecordRows[0]?.id || ''
  const report = useQuery({
    queryKey: ['faculty', 'grade-report', classRecordId],
    queryFn: () => fetchClassGradeReport(classRecordId),
    enabled: Boolean(classRecordId),
  })
  const mutation = useMutation({
    mutationFn: () => {
      if (!classRecordId) throw new Error('Open a class record first')
      const signatories = [
        { role: sigRole.trim(), name: sigName.trim() },
        ...(sigName2.trim()
          ? [{ role: sigRole2.trim() || 'Signatory', name: sigName2.trim() }]
          : []),
      ].filter((s) => s.role && s.name)
      return submitClassGrades({
        classRecordId,
        signatories,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Grades submitted and locked' })
      void qc.invalidateQueries({ queryKey: ['faculty', 'submit-master'] })
      void qc.invalidateQueries({ queryKey: ['faculty', 'grade-report'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Submit failed', description: getApiErrorMessage(err) }),
  })
  const exportMutation = useMutation({
    mutationFn: (format: 'pdf' | 'xlsx' | 'csv') => exportClassGradeReport(classRecordId!, format),
    onSuccess: (blob, format) => {
      const ext = format === 'xlsx' ? 'xls' : format
      downloadBlob(blob, `grade-sheet.${ext}`)
      notify({ tone: 'success', title: `Grade sheet ${format.toUpperCase()} downloaded` })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Export failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Grade submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Submitting locks the class record and attaches signatories to the final grade sheet.
            Corrections require the grade correction workflow.
          </p>
          <p className="text-sm">
            Class: <Badge>{master.data?.classRecord.subjectCode ?? '—'}</Badge> · status{' '}
            <Badge>{master.data?.classRecord.status ?? '—'}</Badge>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="sigRole" label="Signatory 1 role">
              <Input id="sigRole" value={sigRole} onChange={(e) => setSigRole(e.target.value)} />
            </FormField>
            <FormField id="sigName" label="Signatory 1 name">
              <Input id="sigName" value={sigName} onChange={(e) => setSigName(e.target.value)} />
            </FormField>
            <FormField id="sigRole2" label="Signatory 2 role (optional)">
              <Input id="sigRole2" value={sigRole2} onChange={(e) => setSigRole2(e.target.value)} />
            </FormField>
            <FormField id="sigName2" label="Signatory 2 name (optional)">
              <Input id="sigName2" value={sigName2} onChange={(e) => setSigName2(e.target.value)} />
            </FormField>
          </div>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !master.data}
          >
            Submit & lock grades
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Final grade report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Preview per-student marks and raw scores, then export PDF or Excel with signatories.
          </p>
          {!assignment ? (
            <FormField id="reportClassRecord" label="Class record">
              <Select
                id="reportClassRecord"
                value={classRecordId}
                onChange={(e) => setPickedRecordId(e.target.value)}
              >
                <option value="">Select class record…</option>
                {classRecordRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.subjectCode} · {r.status}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!classRecordId || exportMutation.isPending}
              onClick={() => exportMutation.mutate('pdf')}
            >
              Download PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!classRecordId || exportMutation.isPending}
              onClick={() => exportMutation.mutate('xlsx')}
            >
              Download Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!classRecordId || exportMutation.isPending}
              onClick={() => exportMutation.mutate('csv')}
            >
              Download CSV
            </Button>
          </div>
          {(report.data?.signatories ?? []).length > 0 ? (
            <p className="text-sm">
              Signatories: {report.data!.signatories.map((s) => `${s.role}: ${s.name}`).join(' · ')}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No signatories on this sheet yet.
            </p>
          )}
          <QueryPage
            title="Grade sheet rows"
            query={report}
            isEmpty={(d) => d.students.length === 0}
          >
            {(data) => (
              <DataTable
                label="Students"
                columns={[
                  {
                    key: 'studentNumber',
                    header: 'Student #',
                    render: (r) => String(r.studentNumber ?? '—'),
                  },
                  {
                    key: 'name',
                    header: 'Name',
                    render: (r) => `${String(r.lastName ?? '')}, ${String(r.firstName ?? '')}`,
                  },
                  {
                    key: 'rawScore',
                    header: 'Raw',
                    render: (r) => (r.rawScore != null ? String(r.rawScore) : '—'),
                  },
                  {
                    key: 'markCode',
                    header: 'Mark',
                    render: (r) => String(r.markCode ?? '—'),
                  },
                  {
                    key: 'remarks',
                    header: 'Remarks',
                    render: (r) => String(r.remarks ?? '—'),
                  },
                ]}
                data={data.students}
                keyExtractor={(r) => String(r.studentId ?? r.studentNumber)}
              />
            )}
          </QueryPage>
        </CardContent>
      </Card>
    </div>
  )
}

const correctionSchema = z.object({
  gradeEntryId: z.string().uuid('Select a locked grade entry id'),
  reasonCode: z.enum([
    'encoding_error',
    'computation_error',
    'identity_mismatch',
    'late_completion_of_inc',
    'registrar_directive',
    'other',
  ]),
  proposedMarkCode: z.string().min(1),
  supportingDocumentRefs: z.string().min(1, 'Supporting document ref required'),
  reasonNotes: z.string().optional(),
})

export function FacultyCorrectionsPage() {
  return (
    <RequirePermission anyOf={['grades.write', 'grades.approve']}>
      <FacultyCorrectionsInner />
    </RequirePermission>
  )
}

function FacultyCorrectionsInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['faculty', 'corrections'],
    queryFn: () => fetchGradeCorrections(),
  })
  const form = useForm<z.infer<typeof correctionSchema>>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      reasonCode: 'encoding_error',
      proposedMarkCode: '2.00',
      supportingDocumentRefs: 'doc://',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof correctionSchema>) =>
      requestGradeCorrection({
        ...values,
        supportingDocumentRefs: values.supportingDocumentRefs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Correction requested' })
      qc.invalidateQueries({ queryKey: ['faculty', 'corrections'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Request failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Request grade correction</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-xl gap-3"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <FormField
              id="gradeEntryId"
              label="Grade entry ID"
              error={form.formState.errors.gradeEntryId?.message}
              required
            >
              <Input id="gradeEntryId" {...form.register('gradeEntryId')} />
            </FormField>
            <FormField id="reasonCode" label="Reason code" required>
              <Select id="reasonCode" {...form.register('reasonCode')}>
                <option value="encoding_error">Encoding error</option>
                <option value="computation_error">Computation error</option>
                <option value="identity_mismatch">Identity mismatch</option>
                <option value="late_completion_of_inc">Late INC completion</option>
                <option value="registrar_directive">Registrar directive</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField id="proposedMarkCode" label="Proposed mark" required>
              <Input id="proposedMarkCode" {...form.register('proposedMarkCode')} />
            </FormField>
            <FormField
              id="docs"
              label="Supporting document refs"
              error={form.formState.errors.supportingDocumentRefs?.message}
              required
            >
              <Input
                id="docs"
                {...form.register('supportingDocumentRefs')}
                placeholder="doc://a,doc://b"
              />
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>
              Submit correction request
            </Button>
          </form>
        </CardContent>
      </Card>
      <QueryPage title="Correction requests" query={list} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Corrections"
            columns={[
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              { key: 'reasonCode', header: 'Reason' },
              { key: 'priorMarkCode', header: 'Prior' },
              { key: 'proposedMarkCode', header: 'Proposed' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function FacultyAdvisingPage() {
  return (
    <RequirePermission anyOf={['advising.read', 'advising.write']}>
      <FacultyAdvisingInner />
    </RequirePermission>
  )
}

function FacultyAdvisingInner() {
  const query = useQuery({
    queryKey: ['faculty', 'sessions'],
    queryFn: () => fetchAdvisingSessions(),
  })
  return (
    <QueryPage title="Academic advising" query={query} isEmpty={(d) => d.length === 0}>
      {(rows) => (
        <DataTable
          label="Advising sessions"
          columns={[
            {
              key: 'id',
              header: 'Session',
              render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>,
            },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'mode', header: 'Mode' },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function FacultyAdvisingHistoryPage() {
  return <FacultyAdvisingPage />
}
