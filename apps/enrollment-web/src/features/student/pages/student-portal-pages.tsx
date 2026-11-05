import { useState } from 'react'
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
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage, useListControls } from '@/components/query-page'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import {
  createCounselingRequest,
  fetchAnnouncementFeed,
  fetchFacultyEvalPending,
  submitFacultyEvalResponse,
  fetchAcademicRecords,
  fetchAssessments,
  fetchClearanceHints,
  fetchDeficiencies,
  fetchEnrollments,
  fetchGrades,
  fetchPayments,
  fetchRegistrationDocuments,
  fetchScholarships,
  fetchSubjects,
  fetchMyWaitlist,
  joinSectionWaitlist,
  resolveClassCodesLine,
  searchAlternateSections,
  applyClassCodesLine,
  fetchEnrollment,
  issueQueueTicket,
  issueRegistrationDocument,
  resolveStudentForUser,
} from '@/lib/usis-api'
import { StudentTaskCalendarPanel } from '@/features/student/components/student-task-calendar-panel'

export function useMyStudent() {
  const email = useAuthStore((s) => s.user?.email)
  return useQuery({
    queryKey: ['student', 'me', email],
    queryFn: () => resolveStudentForUser(email),
  })
}

export function StudentDashboardPage() {
  const studentQuery = useMyStudent()
  const feedQuery = useQuery({
    queryKey: ['student', 'announcements'],
    queryFn: () => fetchAnnouncementFeed(),
  })
  const studentId = studentQuery.data?.id
  const enrollments = useQuery({
    queryKey: ['student', 'enrollments', studentId],
    queryFn: () => fetchEnrollments({ studentId, limit: 10 }),
    enabled: !!studentId,
  })
  const grades = useQuery({
    queryKey: ['student', 'grades', studentId],
    queryFn: () => fetchGrades({ limit: 10 }),
    enabled: !!studentId,
  })
  const scholarships = useQuery({
    queryKey: ['student', 'scholarships'],
    queryFn: () => fetchScholarships(),
    enabled: !!studentId,
  })

  if (studentQuery.isLoading) return <QueryPage title="Student dashboard" query={studentQuery}>{() => null}</QueryPage>

  const announcements = feedQuery.data?.items ?? []

  if (!studentQuery.data) {
    return (
      <div className="space-y-4">
        {announcements.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="font-medium text-[var(--color-ink)]">{a.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{a.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Alert variant="warning" title="No student profile linked">
          Your account is not linked to a student record yet. Contact the Registrar if you recently completed admission.
        </Alert>
      </div>
    )
  }

  const active = enrollments.data?.data?.[0]
  return (
    <div className="space-y-4">
      {announcements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="font-medium text-[var(--color-ink)]">{a.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <StudentTaskCalendarPanel />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Student number" value={studentQuery.data.studentNumber} />
        <DashboardCard title="Enrollment" value={active?.status ?? '—'} />
        <DashboardCard title="Grade rows" value={String(grades.data?.data.length ?? 0)} />
        <DashboardCard title="Scholarships" value={String(scholarships.data?.length ?? 0)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {studentQuery.data.firstName}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-muted-foreground)]">
          Use the student portal menu for enrollment, advising, assessments, grades, support requests, and queue tickets.
          All panels load from the USiS API.
        </CardContent>
      </Card>
    </div>
  )
}

export function StudentProfilePage() {
  const query = useMyStudent()
  return (
    <QueryPage title="Profile" description="Official student identity from USiS" query={query} isEmpty={(d) => !d}>
      {(student) =>
        student ? (
          <Card>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Student number</p><p className="font-mono">{student.studentNumber}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p>{student.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Name</p><p>{student.lastName}, {student.firstName}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><Badge>{student.status}</Badge></div>
            </CardContent>
          </Card>
        ) : null
      }
    </QueryPage>
  )
}

export function StudentEnrollmentPage() {
  const student = useMyStudent()
  const controls = useListControls()
  const query = useQuery({
    queryKey: ['student', 'enrollments', student.data?.id, controls.page],
    queryFn: () => fetchEnrollments({ studentId: student.data?.id, page: controls.page, limit: 10 }),
    enabled: !!student.data?.id,
  })
  return (
    <QueryPage
      title="Enrollment"
      description="Term enrollment records"
      query={query}
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Enrollments"
          columns={[
            { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
            { key: 'yearLevel', header: 'Year' },
            { key: 'semester', header: 'Sem' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentStatusPage() {
  return <StudentEnrollmentPage />
}

export function StudentAdvisingPage() {
  const student = useMyStudent()
  const enrollments = useQuery({
    queryKey: ['student', 'enroll-advise', student.data?.id],
    queryFn: () => fetchEnrollments({ studentId: student.data?.id, limit: 20 }),
    enabled: !!student.data?.id,
  })
  return (
    <QueryPage title="Academic advising" description="Enrollment advising status from USiS" query={enrollments} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <DataTable
          label="Advising-related enrollments"
          columns={[
            { key: 'status', header: 'Enrollment status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'yearLevel', header: 'Year' },
            { key: 'semester', header: 'Semester' },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
          emptyTitle="No enrollments for advising"
        />
      )}
    </QueryPage>
  )
}

export function StudentSubjectsPage() {
  const controls = useListControls()
  const query = useQuery({
    queryKey: ['student', 'subjects', controls.search],
    queryFn: () => fetchSubjects({ search: controls.search || undefined, limit: 50 }),
  })
  return (
    <QueryPage
      title="Subject selection"
      description="Catalog subjects available for enrollment planning"
      query={query}
      search={controls.search}
      onSearchChange={controls.setSearch}
      isEmpty={(d) => d.length === 0}
    >
      {(rows) => (
        <DataTable
          label="Subjects"
          columns={[
            { key: 'subjectCode', header: 'Code' },
            { key: 'title', header: 'Title' },
            { key: 'units', header: 'Units' },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentSchedulePage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const queryClient = useQueryClient()
  const [waitlistSectionId, setWaitlistSectionId] = useState('')
  const [classCodesLine, setClassCodesLine] = useState('')
  const [conflictSectionId, setConflictSectionId] = useState('')
  const [resolvedPreview, setResolvedPreview] = useState<Awaited<ReturnType<typeof resolveClassCodesLine>> | null>(
    null
  )
  const [alternates, setAlternates] = useState<
    Awaited<ReturnType<typeof searchAlternateSections>>['alternatives'] | null
  >(null)
  const [currentEnrollmentId, setCurrentEnrollmentId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['student', 'schedule', student.data?.id],
    queryFn: async () => {
      const page = await fetchEnrollments({ studentId: student.data!.id, limit: 5 })
      const current = page.data[0]
      if (!current) {
        setCurrentEnrollmentId(null)
        return []
      }
      setCurrentEnrollmentId(current.id)
      const detail = await fetchEnrollment(current.id)
      return detail.lines ?? []
    },
    enabled: !!student.data?.id,
  })
  const waitlist = useQuery({
    queryKey: ['student', 'waitlist'],
    queryFn: fetchMyWaitlist,
    enabled: !!student.data?.id,
  })
  const joinMutation = useMutation({
    mutationFn: (sectionId: string) => joinSectionWaitlist(sectionId),
    onSuccess: (row) => {
      notify({ tone: 'success', title: `Waitlist position #${row.position}` })
      void waitlist.refetch()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Waitlist failed', description: getApiErrorMessage(err) }),
  })

  const resolveCodesMutation = useMutation({
    mutationFn: () => resolveClassCodesLine(classCodesLine.trim()),
    onSuccess: (data) => {
      setResolvedPreview(data)
      if (data.missingCodes.length) {
        notify({
          tone: 'warning',
          title: 'Some codes were not found',
          description: data.missingCodes.join(', '),
        })
      }
    },
    onError: (err) => notify({ tone: 'danger', title: 'Resolve failed', description: getApiErrorMessage(err) }),
  })

  const searchAlternatesMutation = useMutation({
    mutationFn: () =>
      searchAlternateSections({
        conflictingSectionId: conflictSectionId.trim() || undefined,
      }),
    onSuccess: (data) => setAlternates(data.alternatives),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Schedule search failed', description: getApiErrorMessage(err) }),
  })

  const applyCodesMutation = useMutation({
    mutationFn: () => applyClassCodesLine(currentEnrollmentId!, classCodesLine.trim()),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Added ${data.addedCount} section(s) — reassessment required` })
      void queryClient.invalidateQueries({ queryKey: ['student', 'schedule'] })
      setResolvedPreview(null)
    },
    onError: (err) => notify({ tone: 'danger', title: 'Apply failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <QueryPage title="Class schedule" description="Subjects on your current enrollment (ENR-010, ENR-039)" query={query} isEmpty={(d) => d.length === 0}>
        {(lines) => (
          <DataTable
            label="Schedule lines"
            columns={[
              { key: 'subjectCode', header: 'Code' },
              { key: 'subjectTitle', header: 'Subject' },
              { key: 'units', header: 'Units' },
              { key: 'status', header: 'Status' },
            ]}
            data={lines}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <Card>
        <CardHeader>
          <CardTitle>Irregular class codes (ENR-039)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Enter section codes on one line, separated by spaces. Resolve to preview seats, then apply to your current
            enrollment.
          </p>
          <FormField id="classCodesLine" label="Class codes">
            <input
              id="classCodesLine"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              value={classCodesLine}
              onChange={(e) => setClassCodesLine(e.target.value)}
              placeholder="SEC-G-001 SEC-G-002"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!classCodesLine.trim() || resolveCodesMutation.isPending}
              onClick={() => resolveCodesMutation.mutate()}
            >
              Resolve codes
            </Button>
            <Button
              type="button"
              disabled={!classCodesLine.trim() || !currentEnrollmentId || applyCodesMutation.isPending}
              onClick={() => applyCodesMutation.mutate()}
            >
              Apply to enrollment
            </Button>
          </div>
          {resolvedPreview && resolvedPreview.sections.length > 0 ? (
            <DataTable
              label="Resolved sections"
              columns={[
                { key: 'code', header: 'Code' },
                { key: 'name', header: 'Name' },
                {
                  key: 'seatsAvailable',
                  header: 'Seats',
                  render: (r) => (r.seatsAvailable != null ? String(r.seatsAvailable) : '—'),
                },
              ]}
              data={resolvedPreview.sections}
              keyExtractor={(r) => r.sectionId}
            />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open sections (conflict search)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Search alternate sections with no schedule conflict and available seats (same subject as the conflicting
            section when an ID is provided).
          </p>
          <FormField id="conflictSectionId" label="Conflicting section ID (optional)">
            <input
              id="conflictSectionId"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              value={conflictSectionId}
              onChange={(e) => setConflictSectionId(e.target.value)}
            />
          </FormField>
          <Button
            type="button"
            disabled={searchAlternatesMutation.isPending}
            onClick={() => searchAlternatesMutation.mutate()}
          >
            Search open schedules
          </Button>
          {(alternates ?? []).length > 0 ? (
            <DataTable
              label="Alternates"
              columns={[
                { key: 'sectionCode', header: 'Section' },
                { key: 'sectionName', header: 'Name' },
                {
                  key: 'seatsAvailable',
                  header: 'Seats',
                  render: (r) => (r.seatsAvailable != null ? String(r.seatsAvailable) : '—'),
                },
              ]}
              data={alternates ?? []}
              keyExtractor={(r) => r.sectionId}
            />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Section waitlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            When a section is full and waitlisting is enabled, join the queue here instead of forcing registration.
          </p>
          <div className="flex flex-wrap gap-2">
            <FormField id="waitlistSectionId" label="Section ID">
              <input
                id="waitlistSectionId"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                value={waitlistSectionId}
                onChange={(e) => setWaitlistSectionId(e.target.value)}
                placeholder="Section UUID"
              />
            </FormField>
            <Button
              type="button"
              className="self-end"
              disabled={!waitlistSectionId.trim() || joinMutation.isPending}
              onClick={() => joinMutation.mutate(waitlistSectionId.trim())}
            >
              Join waitlist
            </Button>
          </div>
          {(waitlist.data ?? []).length > 0 ? (
            <DataTable
              label="My waitlist"
              columns={[
                { key: 'sectionCode', header: 'Section' },
                { key: 'position', header: 'Position' },
                { key: 'status', header: 'Status' },
              ]}
              data={waitlist.data ?? []}
              keyExtractor={(r) => r.id}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No active waitlist entries.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function StudentAssessmentsPage() {
  const query = useQuery({ queryKey: ['student', 'assessments'], queryFn: () => fetchAssessments({ limit: 20 }) })
  return (
    <QueryPage title="Assessment forms" query={query} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <DataTable
          label="Assessments"
          columns={[
            { key: 'assessmentNumber', header: 'Number' },
            { key: 'status', header: 'Status' },
            { key: 'netAmount', header: 'Net', render: (r) => Number(r.netAmount).toFixed(2) },
            { key: 'ufmsPaymentStatus', header: 'UFMS payment', render: (r) => r.ufmsPaymentStatus ?? '—' },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentPaymentsPage() {
  const query = useQuery({ queryKey: ['student', 'payments'], queryFn: () => fetchPayments({ limit: 20 }) })
  return (
    <QueryPage title="Payment status" description="UFMS-confirmed payment mirrors in USiS" query={query} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <DataTable
          label="Payments"
          columns={[
            { key: 'orNumber', header: 'OR #', render: (r) => r.orNumber ?? '—' },
            { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
            { key: 'paymentType', header: 'Type' },
            { key: 'ufmsConfirmed', header: 'UFMS', render: (r) => (r.ufmsConfirmed ? 'confirmed' : '—') },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentCorPage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const docs = useQuery({ queryKey: ['student', 'docs'], queryFn: () => fetchRegistrationDocuments() })
  const enrollments = useQuery({
    queryKey: ['student', 'cor-enr', student.data?.id],
    queryFn: () => fetchEnrollments({ studentId: student.data?.id, status: 'registered', limit: 5 }),
    enabled: !!student.data?.id,
  })
  const issue = useMutation({
    mutationFn: async () => {
      const enrollmentId = enrollments.data?.data[0]?.id
      if (!enrollmentId) throw new Error('No registered enrollment found for COR')
      return issueRegistrationDocument({ enrollmentId, docType: 'certificate_of_registration' })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'COR issued' })
      qc.invalidateQueries({ queryKey: ['student', 'docs'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'COR failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <QueryPage title="Certificate of Registration" query={docs} isEmpty={(d) => d.length === 0} actions={
        <Button type="button" onClick={() => issue.mutate()} disabled={issue.isPending}>
          Issue COR
        </Button>
      }>
        {(rows) => (
          <DataTable
            label="Registration documents"
            columns={[
              { key: 'documentNumber', header: 'Document #' },
              { key: 'docType', header: 'Type' },
              { key: 'enrollmentId', header: 'Enrollment', render: (r) => <span className="font-mono text-xs">{r.enrollmentId.slice(0, 8)}</span> },
            ]}
            data={rows.filter((r) => r.docType === 'certificate_of_registration')}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function StudentGradesPage() {
  const query = useQuery({ queryKey: ['student', 'grades'], queryFn: () => fetchGrades({ limit: 50 }) })
  return (
    <QueryPage title="Grades" query={query} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <DataTable
          label="Grades"
          columns={[
            { key: 'courseCode', header: 'Code' },
            { key: 'courseTitle', header: 'Course' },
            { key: 'units', header: 'Units' },
            { key: 'markCode', header: 'Mark', render: (r) => r.markCode ?? r.grade ?? '—' },
            { key: 'status', header: 'Status', render: (r) => r.status ?? '—' },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentHistoryPage() {
  const student = useMyStudent()
  const query = useQuery({
    queryKey: ['student', 'history', student.data?.id],
    queryFn: () => fetchAcademicRecords(student.data!.id),
    enabled: !!student.data?.id,
  })
  return (
    <QueryPage title="Academic history" query={query} isEmpty={(d) => (d.grades?.length ?? 0) === 0}>
      {(records) => (
        <DataTable
          label="Academic history"
          columns={[
            { key: 'courseCode', header: 'Code', render: (r) => String(r.courseCode ?? '') },
            { key: 'courseTitle', header: 'Title', render: (r) => String(r.courseTitle ?? '') },
            { key: 'markCode', header: 'Mark', render: (r) => String(r.markCode ?? r.grade ?? '') },
            { key: 'originalMarkCode', header: 'Original', render: (r) => String(r.originalMarkCode ?? '—') },
          ]}
          data={records.grades as Array<Record<string, unknown>>}
          keyExtractor={(r) => String(r.id ?? r.courseCode ?? 'row')}
        />
      )}
    </QueryPage>
  )
}

export function StudentRequirementsPage() {
  const query = useQuery({ queryKey: ['student', 'deficiencies'], queryFn: () => fetchDeficiencies() })
  return (
    <QueryPage title="Student requirements" query={query} isEmpty={(d) => d.length === 0}>
      {(rows) => (
        <DataTable
          label="Requirements"
          columns={[
            { key: 'requirementCode', header: 'Code' },
            { key: 'description', header: 'Description' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function StudentScholarshipsPage() {
  const query = useQuery({ queryKey: ['student', 'scholarships'], queryFn: () => fetchScholarships() })
  return (
    <QueryPage title="Scholarship information" query={query} isEmpty={(d) => d.length === 0}>
      {(rows) => (
        <DataTable
          label="Scholarships"
          columns={[
            { key: 'scholarshipCode', header: 'Code' },
            { key: 'name', header: 'Name' },
            { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
            { key: 'status', header: 'Status' },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

const supportSchema = z.object({
  channel: z.enum(['online', 'walk_in']),
})

export function StudentSupportPage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { channel: 'online' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof supportSchema>) => {
      if (!student.data?.id) throw new Error('Student profile required')
      return createCounselingRequest({ studentId: student.data.id, channel: values.channel })
    },
    onSuccess: () => notify({ tone: 'success', title: 'Support request submitted' }),
    onError: (err) => notify({ tone: 'danger', title: 'Request failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Student support requests</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-md gap-3"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField id="channel" label="Channel" error={form.formState.errors.channel?.message}>
              <Select id="channel" {...form.register('channel')}>
                <option value="online">Online</option>
                <option value="walk_in">Walk-in</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={mutation.isPending || !student.data}>Submit counseling request</Button>
          </form>
        </CardContent>
      </Card>
      {student.data?.id ? (
        <StudentClearanceHints studentId={student.data.id} />
      ) : null}
    </div>
  )
}

function StudentClearanceHints({ studentId }: { studentId: string }) {
  const query = useQuery({
    queryKey: ['student', 'clearance-hints', studentId],
    queryFn: () => fetchClearanceHints(studentId),
  })
  return (
    <QueryPage title="Cross-office status" query={query}>
      {(data) => (
        <pre className="overflow-auto rounded-xl bg-[var(--color-muted)] p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
    </QueryPage>
  )
}

export function StudentQueuePage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const [office, setOffice] = useState('guidance')
  const [ticket, setTicket] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      issueQueueTicket({
        office,
        serviceCode: office === 'guidance' ? 'counseling' : 'service',
        studentId: student.data?.id,
      }),
    onSuccess: (data) => {
      setTicket(data.ticketNo)
      notify({ tone: 'success', title: `Ticket ${data.ticketNo}` })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Queue failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue and appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormField id="office" label="Office">
          <Select id="office" value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="guidance">Guidance</option>
            <option value="health">Health</option>
            <option value="osa">Student Affairs</option>
          </Select>
        </FormField>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Get queue ticket
        </Button>
        {ticket ? <Alert variant="success" title="Current ticket">{ticket}</Alert> : null}
      </CardContent>
    </Card>
  )
}

export function StudentAdmissionPage() {
  const student = useMyStudent()
  return (
    <QueryPage title="Admission status" description="Linked student record after admission" query={student} isEmpty={(d) => !d}>
      {(row) =>
        row ? (
          <Alert variant="success" title="Admitted / active student">
            {row.studentNumber} · {row.status}
          </Alert>
        ) : null
      }
    </QueryPage>
  )
}

export function StudentFacultyEvalPage() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const pending = useQuery({ queryKey: ['student', 'faculty-eval'], queryFn: () => fetchFacultyEvalPending() })
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const submit = useMutation({
    mutationFn: () => {
      if (!activeTarget) throw new Error('Select an evaluation')
      const parsed: Record<string, number | string> = {}
      for (const [k, v] of Object.entries(answers)) {
        const num = Number(v)
        parsed[k] = Number.isFinite(num) && v.trim() !== '' ? num : v
      }
      return submitFacultyEvalResponse({ targetId: activeTarget, answers: parsed })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Evaluation submitted' })
      setActiveTarget(null)
      setAnswers({})
      qc.invalidateQueries({ queryKey: ['student', 'faculty-eval'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Could not submit', description: getApiErrorMessage(err) }),
  })

  const items = pending.data?.items ?? []
  const questions = pending.data?.questions ?? []
  const active = items.find((i) => i.targetId === activeTarget)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Faculty evaluation</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Complete scheduled teacher evaluations online (ENR-048 / ENR-050). Responses are stored for aggregate reporting.
      </p>
      {pending.data?.studentLinked === false ? (
        <Alert variant="warning" title="No student profile linked">
          Your account must be linked to a student record with active section enrollment to receive evaluation forms.
        </Alert>
      ) : null}
      <QueryPage title="Pending evaluations" query={pending} isEmpty={(d) => d.items.length === 0}>
        {(data) => (
          <div className="grid gap-3">
            {data.items.map((item) => (
              <Card key={item.targetId}>
                <CardHeader>
                  <CardTitle className="text-base">{item.facultyName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
                  <p>{item.scheduleTitle} · {item.sectionLabel}</p>
                  <Button type="button" variant={activeTarget === item.targetId ? 'default' : 'outline'} onClick={() => setActiveTarget(item.targetId)}>
                    {activeTarget === item.targetId ? 'Selected' : 'Evaluate'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryPage>
      {active ? (
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire — {active.facultyName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions
              .filter((q) => active.questionIds.includes(q.id))
              .map((q) => (
                <FormField key={q.id} id={`q-${q.id}`} label={q.prompt}>
                  {q.questionType === 'likert' ? (
                    <Select
                      id={`q-${q.id}`}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    >
                      <option value="">Select rating</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <input
                      id={`q-${q.id}`}
                      className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}
                </FormField>
              ))}
            <Button type="button" disabled={submit.isPending} onClick={() => submit.mutate()}>
              Submit evaluation
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
