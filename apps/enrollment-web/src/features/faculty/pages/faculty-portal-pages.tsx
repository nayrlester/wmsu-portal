import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  Textarea,
  useNotification,
} from '@wmsu/ui'
import { QueryPage } from '@/components/query-page'
import { StudentSearchSelect } from '@/components/student-search-select'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import { notifyGenericError } from '@/lib/user-messages'
import { useHasPermission } from '@/lib/permissions'
import {
  encodeClassGrades,
  exportClassGradeReport,
  fetchAdvisingDashboard,
  fetchAdvisingRecommendations,
  fetchAdvisingSession,
  assignAdvisingCourses,
  startAdvisingSession,
  addAdvisingRecommendation,
  removeAdvisingRecommendation,
  endorseAdvisingSession,
  fetchClassGradeReport,
  fetchClassRecords,
  fetchGradeCorrections,
  fetchFacultyScheduleNotifications,
  fetchMyFacultyAssignments,
  markScheduleNotificationRead,
  openClassRecord,
  enlistClassStudent,
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
      notify(notifyGenericError(err)),
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
  const [enlistNumber, setEnlistNumber] = useState('2026-PH-NEW001')
  const [enlistResult, setEnlistResult] = useState('')
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
  const rosterCount = master.data?.roster.length ?? 0
  const canLock = Boolean(master.data) && rosterCount > 0
  const enlist = useMutation({
    mutationFn: () => {
      const classRecordId = master.data?.classRecord.id
      if (!classRecordId) throw new Error('Open a class record first')
      return enlistClassStudent(classRecordId, enlistNumber.trim())
    },
    onSuccess: (row) => {
      const line = `${row.studentNumber} enlisted · enrollment ${row.enrollmentStatus} · payment ${row.paymentVerified ? 'kept' : 'unchanged'}`
      setEnlistResult(line)
      notify({ tone: 'success', title: 'Student enlisted', description: line })
      void qc.invalidateQueries({ queryKey: ['faculty', 'submit-master'] })
      void qc.invalidateQueries({ queryKey: ['faculty', 'encode-master'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
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
      notify(notifyGenericError(err)),
  })
  const exportMutation = useMutation({
    mutationFn: (format: 'pdf' | 'xlsx' | 'csv') => exportClassGradeReport(classRecordId!, format),
    onSuccess: (blob, format) => {
      const ext = format === 'xlsx' ? 'xls' : format
      downloadBlob(blob, `grade-sheet.${ext}`)
      notify({ tone: 'success', title: `Grade sheet ${format.toUpperCase()} downloaded` })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
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
          <p className="text-sm" data-testid="class-roster-count">
            {master.data
              ? rosterCount === 1
                ? '1 student on this class'
                : `${rosterCount} students on this class`
              : 'Open a class record to see the roster.'}
          </p>
          {master.data && rosterCount === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No students are enlisted on this class. Lock stays unavailable until a roster exists.
              </p>
              <FormField id="enlistStudentNumber" label="Registered student number">
                <Input
                  id="enlistStudentNumber"
                  value={enlistNumber}
                  onChange={(e) => setEnlistNumber(e.target.value)}
                />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                className="whitespace-nowrap"
                disabled={enlist.isPending || enlistNumber.trim().length < 3}
                onClick={() => enlist.mutate()}
              >
                Enlist registered student
              </Button>
              {enlistResult ? (
                <p className="text-sm" data-testid="enlist-result">
                  {enlistResult}
                </p>
              ) : null}
            </div>
          ) : null}
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
            disabled={mutation.isPending || !canLock}
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
      notify(notifyGenericError(err)),
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
  const { notify } = useNotification()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['faculty', 'advising-queue'],
    queryFn: fetchAdvisingDashboard,
  })
  const start = useMutation({
    mutationFn: (enrollmentId: string) => startAdvisingSession({ enrollmentId, mode: 'face_to_face' }),
    onSuccess: (result) => {
      notify({ tone: 'success', title: 'Advising session started' })
      const sessionId = result.session?.id
      if (sessionId) {
        navigate(`/faculty/advising/${sessionId}`)
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['faculty', 'advising-queue'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Advising session failed',
        description: getApiErrorMessage(err),
      }),
  })
  return (
    <QueryPage
      title="Academic advising"
      description="Draft enrollments waiting for an adviser. Starting a session moves the enrollment from draft to advising."
      query={query}
      isEmpty={(d) => (d.pendingEnrollments?.length ?? 0) === 0}
      emptyTitle="No drafts waiting"
      emptyDescription="Students appear here after they open a term enrollment and before an adviser starts the session."
    >
      {(dash) => (
        <DataTable
          label="Enrollments waiting for advising"
          columns={[
            { key: 'studentNumber', header: 'Student' },
            { key: 'studentName', header: 'Name' },
            { key: 'yearLevel', header: 'Year' },
            { key: 'semester', header: 'Sem' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            {
              key: 'enrollmentId',
              header: 'Action',
              render: (r) =>
                r.status === 'draft' ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={start.isPending}
                    onClick={() => start.mutate(r.enrollmentId)}
                  >
                    Start advising
                  </Button>
                ) : r.openSessionId ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(`/faculty/advising/${r.openSessionId}`)}
                  >
                    Open advising
                  </Button>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">Session open</span>
                ),
            },
          ]}
          data={dash.pendingEnrollments ?? []}
          keyExtractor={(r) => r.enrollmentId}
        />
      )}
    </QueryPage>
  )
}

export function FacultyAdvisingHistoryPage() {
  return (
    <RequirePermission anyOf={['advising.read', 'advising.write']}>
      <FacultyAdvisingHistoryInner />
    </RequirePermission>
  )
}

function FacultyAdvisingHistoryInner() {
  const query = useQuery({
    queryKey: ['faculty', 'advising-history'],
    queryFn: fetchAdvisingDashboard,
  })
  return (
    <QueryPage
      title="Advising history"
      description="Advising sessions already opened, including endorsed enrollments."
      query={query}
      isEmpty={(d) => (d.recentSessions?.length ?? 0) === 0}
      emptyTitle="No advising sessions"
      emptyDescription="Sessions appear here after an adviser starts advising."
    >
      {(dash) => (
        <DataTable
          label="Advising sessions"
          columns={[
            { key: 'studentNumber', header: 'Student' },
            { key: 'studentName', header: 'Name' },
            { key: 'yearLevel', header: 'Year' },
            { key: 'semester', header: 'Sem' },
            { key: 'status', header: 'Session', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'enrollmentStatus', header: 'Enrollment', render: (r) => <Badge>{r.enrollmentStatus || '—'}</Badge> },
            {
              key: 'subjects',
              header: 'Subjects',
              render: (r) => (r.subjects?.length ? r.subjects.join(', ') : '—'),
            },
            {
              key: 'endorsedAt',
              header: 'Endorsed',
              render: (r) => r.endorsedAt || '—',
            },
          ]}
          data={dash.recentSessions ?? []}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

type SessionSubject = {
  id?: string
  subjectCode: string
  title?: string
  subjectTitle?: string
  units: number
  yearLevel?: number | null
  semester?: number | null
}

function advisingFailureMessage(err: unknown) {
  const data = (err as { response?: { data?: { details?: { issues?: Array<{ message?: string }> } } } })
    ?.response?.data
  const issues = data?.details?.issues?.map((issue) => issue.message).filter(Boolean) ?? []
  if (issues.length) return issues.join(' ')
  return getApiErrorMessage(err)
}

export function FacultyAdvisingSessionPage() {
  return (
    <RequirePermission anyOf={['advising.read', 'advising.write']}>
      <FacultyAdvisingSessionInner />
    </RequirePermission>
  )
}

function sameCourseIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id))
}

function FacultyAdvisingSessionInner() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [courseIds, setCourseIds] = useState<string[]>([])
  const [courseSeeded, setCourseSeeded] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [remarksSeeded, setRemarksSeeded] = useState(false)
  const [underloadApproved, setUnderloadApproved] = useState(false)
  const session = useQuery({
    queryKey: ['faculty', 'advising-session', sessionId],
    queryFn: () => fetchAdvisingSession(sessionId),
    enabled: Boolean(sessionId),
  })
  const recommendations = useQuery({
    queryKey: ['faculty', 'advising-recommendations', sessionId],
    queryFn: () => fetchAdvisingRecommendations(sessionId),
    enabled: Boolean(sessionId),
  })
  useEffect(() => {
    if (courseSeeded || !session.data) return
    const saved = session.data.enrollment?.advisedCurriculumIds
    const single = session.data.enrollment?.advisedCurriculumId
    setCourseIds(saved?.length ? saved : single ? [single] : [])
    setCourseSeeded(true)
  }, [courseSeeded, session.data])
  const assignCourses = useMutation({
    mutationFn: (curriculumIds: string[]) => assignAdvisingCourses(sessionId, curriculumIds),
    onSuccess: () => {
      void session.refetch()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Courses were not saved',
        description: getApiErrorMessage(err),
      }),
  })
  const savedCourseIds = session.data?.enrollment?.advisedCurriculumIds?.length
    ? session.data.enrollment.advisedCurriculumIds
    : session.data?.enrollment?.advisedCurriculumId
      ? [session.data.enrollment.advisedCurriculumId]
      : []
  useEffect(() => {
    if (remarksSeeded || !session.data) return
    const saved = session.data.remarks?.trim()
    if (saved && saved !== 'Endorsed from the advising session.') setRemarks(saved)
    setRemarksSeeded(true)
  }, [remarksSeeded, session.data])
  const endorse = useMutation({
    mutationFn: async (input: { subjects: SessionSubject[]; selectedCodes: string[] }) => {
      if (input.selectedCodes.length === 0) {
        return endorseAdvisingSession(sessionId, {
          underloadApproved,
          remarks: remarks.trim() || 'Endorsed from the advising session.',
        })
      }
      const existing = recommendations.data ?? []
      const keepIds = new Set<string>()
      for (const code of input.selectedCodes) {
        const match = existing.find((row) => row.id && row.subjectCode === code && !keepIds.has(row.id))
        if (match?.id) keepIds.add(match.id)
      }
      for (const row of existing) {
        if (!row.id || keepIds.has(row.id)) continue
        await removeAdvisingRecommendation(sessionId, row.id)
      }
      const keptCodes = new Set(
        existing.filter((row) => row.id && keepIds.has(row.id)).map((row) => row.subjectCode)
      )
      const eligible = session.data?.curriculumEvaluation?.eligibleSubjects ?? []
      for (const subject of input.subjects) {
        if (!input.selectedCodes.includes(subject.subjectCode) || keptCodes.has(subject.subjectCode)) continue
        const match = eligible.find(
          (row) => row.subjectCode === subject.subjectCode || row.id === subject.id
        )
        const openSections = (match as { openSections?: Array<{ id: string }> } | undefined)?.openSections
        const sectionId = openSections?.[0]?.id
        await addAdvisingRecommendation(sessionId, {
          subjectCode: subject.subjectCode,
          subjectId: subject.id,
          subjectTitle: subject.title ?? subject.subjectTitle,
          units: Number(subject.units),
          sectionId,
        })
      }
      return endorseAdvisingSession(sessionId, {
        underloadApproved,
        remarks: remarks.trim() || 'Endorsed from the advising session.',
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Advising endorsed' })
      navigate('/faculty/advising')
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Endorse failed',
        description: advisingFailureMessage(err),
      }),
  })
  return (
    <QueryPage
      title="Advising session"
      description="Select the courses this student may take. The student chooses one of those courses before enrollment continues."
      query={session}
      isEmpty={() => false}
    >
      {(row) => {
        const student = row.enrollment?.student
        const name = [student?.lastName, student?.firstName].filter(Boolean).join(', ')
        const yearLevel = row.enrollment?.yearLevel ?? null
        const semester = row.enrollment?.semester ?? null
        const courseOptions = row.curriculumEvaluation?.advisingCourses ?? []
        const chosen = courseOptions.find(
          (item) => item.id === row.enrollment?.curriculumId && courseIds.includes(item.id)
        )
        const subjects = chosen?.subjects ?? []
        const assessed = row.curriculumEvaluation?.assessedSubjects ?? []
        const load = row.curriculumEvaluation?.allowableUnitLoad
        const selectedUnits = subjects.reduce((sum, subject) => sum + Number(subject.units), 0)
        const overMax = load?.maxUnits != null && selectedUnits > load.maxUnits
        const underMin = load?.minUnits != null && selectedUnits > 0 && selectedUnits < load.minUnits
        const editable = row.status === 'in_progress'
        const loadIssue = !chosen
          ? ''
          : overMax
            ? `Exceeds maximum load of ${load?.maxUnits} units.`
            : underMin && !underloadApproved
              ? `Below the minimum load of ${load?.minUnits} units.`
              : ''
        const coursesReady = courseIds.length > 0 && sameCourseIds(savedCourseIds, courseIds) && !assignCourses.isPending
        const chosenLoadBlocked = Boolean(chosen) && (selectedUnits === 0 || overMax || (underMin && !underloadApproved))
        const toggleCourse = (curriculumId: string) => {
          const next = courseIds.includes(curriculumId)
            ? courseIds.filter((id) => id !== curriculumId)
            : [...courseIds, curriculumId]
          setCourseIds(next)
          if (editable) assignCourses.mutate(next)
        }
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono">{student?.studentNumber}</span>
              <span>{name}</span>
              <Badge>{row.status}</Badge>
              <span>
                Year {yearLevel ?? '—'} · Sem {semester ?? '—'}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => navigate('/faculty/advising')}>
                Back to queue
              </Button>
            </div>
            {assessed.length ? (
              <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="advising-assessed-courses">
                Already assessed: {assessed.join(', ')}.
              </p>
            ) : null}
            <fieldset className="space-y-3" data-testid="advising-courses">
              <legend className="text-sm font-medium">Advisable courses</legend>
              {courseOptions.map((item) => {
                const checked = courseIds.includes(item.id)
                const units = item.subjects.reduce((sum, subject) => sum + Number(subject.units), 0)
                return (
                  <div key={item.id} className="rounded-xl border border-[var(--color-border)] p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        data-testid={`advising-course-${item.code}`}
                        checked={checked}
                        disabled={!editable || endorse.isPending || assignCourses.isPending}
                        onChange={() => toggleCourse(item.id)}
                      />
                      {item.code} — {item.name}
                    </label>
                    {checked ? (
                      item.subjects.length ? (
                        <>
                          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                            {item.code} includes {units} units
                            {load?.minUnits != null ? ` · minimum ${load.minUnits}` : ''}
                            {load?.maxUnits != null ? ` · maximum ${load.maxUnits}` : ''}.
                          </p>
                          <ul className="mt-2 space-y-2 text-sm" data-testid={`advising-course-subjects-${item.code}`}>
                            {item.subjects.map((subject) => (
                              <li key={subject.subjectCode} className="flex flex-wrap items-center gap-3">
                                <span className="font-mono">{subject.subjectCode}</span>
                                <span>{subject.title ?? subject.subjectTitle}</span>
                                <span className="text-[var(--color-muted-foreground)]">{subject.units} units</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                          This course has no remaining subjects for the term.
                        </p>
                      )
                    ) : null}
                  </div>
                )
              })}
            </fieldset>
            {courseIds.length > 0 && sameCourseIds(savedCourseIds, courseIds) ? (
              <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="advising-course-saved">
                These courses are available on the student dashboard.
              </p>
            ) : null}
            {courseIds.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="advising-pick-course">
                Select every course the student may choose.
              </p>
            ) : null}
            {editable && courseIds.length > 0 ? (
              <div className="space-y-4">
                <FormField id="advising-remarks" label="Adviser comments">
                  <Textarea
                    id="advising-remarks"
                    data-testid="advising-remarks"
                    rows={4}
                    value={remarks}
                    disabled={endorse.isPending}
                    placeholder="Advice for the student before this endorsement"
                    onChange={(event) => setRemarks(event.target.value)}
                  />
                </FormField>
                {loadIssue ? (
                  <p className="text-sm text-[var(--color-destructive)]" data-testid="advising-load-issue" role="alert">
                    {loadIssue}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="advising-awaiting-student">
                    Endorse this list. The student then chooses one of these courses.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  {chosen ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={underloadApproved}
                        onChange={(event) => setUnderloadApproved(event.target.checked)}
                      />
                      Endorse below the minimum unit load
                    </label>
                  ) : null}
                  <Button
                    type="button"
                    data-testid="endorse-advising"
                    disabled={endorse.isPending || !coursesReady || chosenLoadBlocked}
                    onClick={() =>
                      endorse.mutate({
                        subjects: chosen ? subjects : [],
                        selectedCodes: chosen ? subjects.map((subject) => subject.subjectCode) : [],
                      })
                    }
                  >
                    Endorse advising
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )
      }}
    </QueryPage>
  )
}
