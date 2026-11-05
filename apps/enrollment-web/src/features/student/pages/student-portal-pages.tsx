import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage, useListControls } from '@/components/query-page'
import { EnrollmentWorkflowPanel } from '@/components/enrollment-workflow-panel'
import { useInfiniteListQuery, usePaginatedQuery } from '@/lib/list-query'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import {
  createCounselingRequest,
  downloadDigitalStudentIdPdf,
  fetchOrgApplications,
  fetchStudentIdRequests,
  fetchStudentOrganizations,
  submitOrgApplication,
  submitStudentIdRequest,
  fetchAnnouncementFeed,
  toggleAnnouncementLike,
  commentOnAnnouncement,
  fetchFacultyEvalPending,
  submitFacultyEvalResponse,
  fetchAcademicRecords,
  fetchAssessments,
  fetchClearanceHints,
  fetchDeficiencies,
  fetchEnrollments,
  fetchStudentEnrollmentWorkflow,
  fetchMyCurriculumPlan,
  fetchStudentOpenAcademicYears,
  startMyEnrollment,
  fetchGrades,
  fetchStudentGradeFeedback,
  fetchPayments,
  fetchRegistrationDocuments,
  fetchMyAccountMonitor,
  fetchScholarships,
  fetchSubjects,
  fetchMyWaitlist,
  joinSectionWaitlist,
  leaveSectionWaitlist,
  resolveClassCodesLine,
  searchAlternateSections,
  applyClassCodesLine,
  encodeBlockGroup,
  fetchMyScheduleNotifications,
  markScheduleNotificationRead,
  issueQueueTicket,
  fetchQueueDisplay,
  fetchQueueTickets,
  issueRegistrationDocument,
  resolveStudentForUser,
  fetchMyStudentProfile,
} from '@/lib/usis-api'
import { StudentTaskCalendarPanel } from '@/features/student/components/student-task-calendar-panel'

export function useMyStudent() {
  const email = useAuthStore((s) => s.user?.email)
  return useQuery({
    queryKey: ['student', 'me', email],
    queryFn: () => resolveStudentForUser(email),
  })
}

function StudentAnnouncementFeed() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const feedQuery = useQuery({
    queryKey: ['student', 'announcements'],
    queryFn: () => fetchAnnouncementFeed(),
  })
  const socialEnabled = feedQuery.data?.settings?.socialFeaturesEnabled ?? false
  const likeMutation = useMutation({
    mutationFn: (id: string) => toggleAnnouncementLike(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'announcements'] }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Like failed', description: getApiErrorMessage(err) }),
  })
  const commentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => commentOnAnnouncement(id, body),
    onSuccess: (_row, vars) => {
      setCommentDraft((prev) => ({ ...prev, [vars.id]: '' }))
      qc.invalidateQueries({ queryKey: ['student', 'announcements'] })
      notify({ tone: 'success', title: 'Comment posted' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Comment failed', description: getApiErrorMessage(err) }),
  })

  const announcements = feedQuery.data?.items ?? []
  if (!announcements.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              {a.isPinned ? <Badge>Pinned</Badge> : null}
              <p className="font-medium text-[var(--color-ink)]">{a.title}</p>
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{a.body}</p>
            {socialEnabled ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={a.likedByMe ? 'default' : 'outline'}
                    disabled={likeMutation.isPending}
                    onClick={() => likeMutation.mutate(a.id)}
                  >
                    {a.likedByMe ? 'Liked' : 'Like'} ({a.likeCount ?? 0})
                  </Button>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {a.commentCount ?? 0} comment{(a.commentCount ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
                {(a.comments ?? []).map((c) => (
                  <p key={c.id} className="text-xs text-[var(--color-muted-foreground)]">
                    {c.body}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  <input
                    className="min-w-[12rem] flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
                    placeholder="Add a comment"
                    value={commentDraft[a.id] ?? ''}
                    onChange={(e) =>
                      setCommentDraft((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={commentMutation.isPending || !(commentDraft[a.id] ?? '').trim()}
                    onClick={() =>
                      commentMutation.mutate({ id: a.id, body: (commentDraft[a.id] ?? '').trim() })
                    }
                  >
                    Comment
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function StudentDashboardPage() {
  const studentQuery = useMyStudent()
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

  if (studentQuery.isLoading)
    return (
      <QueryPage title="Student dashboard" query={studentQuery}>
        {() => null}
      </QueryPage>
    )

  if (!studentQuery.data) {
    return (
      <div className="space-y-4">
        <StudentAnnouncementFeed />
        <Alert variant="warning" title="No student profile linked">
          Your account is not linked to a student record yet. Contact the Registrar if you recently
          completed admission.
        </Alert>
      </div>
    )
  }

  const active = enrollments.data?.data?.[0]
  return (
    <div className="space-y-4">
      <StudentAnnouncementFeed />
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
          Use the student portal menu for enrollment, advising, assessments, grades, support
          requests, and queue tickets. All panels load from the USiS API.
        </CardContent>
      </Card>
    </div>
  )
}

export function StudentProfilePage() {
  const profile = useQuery({
    queryKey: ['student', 'full-profile'],
    queryFn: fetchMyStudentProfile,
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Student profile</h1>
          <p className="text-sm text-muted-foreground">
            Performance, absences, violations, and academic standing. Official transcript remains
            TORMS.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print profile
        </Button>
      </div>
      {profile.isLoading ? <p className="text-sm text-muted-foreground">Loading profile…</p> : null}
      {profile.data ? (
        <div id="student-profile-print" className="space-y-4 print:space-y-3">
          <Card>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Student number</p>
                <p className="font-mono">{profile.data.student.studentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p>
                  {profile.data.student.lastName}, {profile.data.student.firstName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Program</p>
                <p>
                  {profile.data.student.programCode ?? '—'} {profile.data.student.programName ?? ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classification / standing</p>
                <p>
                  {profile.data.student.classification ?? '—'} ·{' '}
                  {profile.data.performance.academicStanding ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{profile.data.student.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge>{profile.data.student.status}</Badge>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-4">
            <DashboardCard title="Grades" value={profile.data.performance.gradeCount} />
            <DashboardCard
              title="Term GWA"
              value={profile.data.performance.gwa?.termGwa?.toFixed?.(4) ?? '—'}
            />
            <DashboardCard title="Absences" value={profile.data.absences.summary.absent} />
            <DashboardCard title="Violations" value={profile.data.violations.academic.length} />
          </div>
          <DataTable
            label="Academic performance (grades)"
            emptyTitle="No grades posted yet"
            emptyDescription="Course marks will appear here after faculty encode and submit grades for your enrolled subjects."
            columns={[
              { key: 'courseCode', header: 'Code', render: (r) => String(r.courseCode ?? '') },
              { key: 'courseTitle', header: 'Course', render: (r) => String(r.courseTitle ?? '') },
              {
                key: 'markCode',
                header: 'Mark',
                render: (r) => String(r.markCode ?? r.grade ?? '—'),
              },
              { key: 'status', header: 'Status', render: (r) => String(r.status ?? '—') },
            ]}
            data={profile.data.performance.grades}
            keyExtractor={(r) => String(r.id ?? r.courseCode)}
          />
          <DataTable
            label="Attendance / absences"
            emptyTitle="No absences recorded"
            emptyDescription="Class attendance records will show here when faculty mark you absent or late."
            columns={[
              { key: 'sessionDate', header: 'Date' },
              { key: 'status', header: 'Status' },
              { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
            ]}
            data={profile.data.absences.records}
            keyExtractor={(r) => r.id}
          />
          <DataTable
            label="Academic violations"
            emptyTitle="No academic violations"
            emptyDescription="Disciplinary or academic violation cases linked to your student record will list here."
            columns={[
              { key: 'violationCode', header: 'Code' },
              { key: 'title', header: 'Title' },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
            data={profile.data.violations.academic}
            keyExtractor={(r) => r.id}
          />
          <p className="text-xs text-muted-foreground">{profile.data.transcriptNote}</p>
        </div>
      ) : null}
    </div>
  )
}

export function StudentEnrollmentPage() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const student = useMyStudent()
  const controls = useListControls('', 10)
  const [academicYearId, setAcademicYearId] = useState('')
  const [semester, setSemester] = useState('1')
  const workflow = useQuery({
    queryKey: ['student', 'enrollment-workflow'],
    queryFn: fetchStudentEnrollmentWorkflow,
    enabled: !!student.data?.id,
  })
  const years = useQuery({
    queryKey: ['student', 'open-years'],
    queryFn: fetchStudentOpenAcademicYears,
    enabled: !!student.data?.id,
  })
  const query = usePaginatedQuery({
    queryKey: ['student', 'enrollments', student.data?.id, controls.page],
    queryFn: () =>
      fetchEnrollments({
        studentId: student.data?.id,
        page: controls.page,
        limit: controls.pageSize,
      }),
    enabled: !!student.data?.id,
  })
  const startMutation = useMutation({
    mutationFn: () =>
      startMyEnrollment({
        academicYearId,
        semester: Number(semester),
        yearLevel: student.data?.yearLevel ?? undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Enrollment draft started' })
      void qc.invalidateQueries({ queryKey: ['student', 'enrollments'] })
      void qc.invalidateQueries({ queryKey: ['student', 'enrollment-workflow'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Could not start enrollment',
        description: getApiErrorMessage(err),
      }),
  })
  return (
    <div className="space-y-6">
      {workflow.isLoading ? <LoadingState label="Enrollment workflow" /> : null}
      {workflow.data ? <EnrollmentWorkflowPanel data={workflow.data} showSchedule={false} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Start term enrollment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Open a draft for the active academic year, then complete advising, assessment, cashier
            payment, and registrar registration.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="stuAy" label="Academic year">
              <Select
                id="stuAy"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
              >
                <option value="">Select year…</option>
                {(years.data ?? []).map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.code} — {y.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="stuSem" label="Semester">
              <Select id="stuSem" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">Midyear / 3</option>
              </Select>
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!academicYearId || startMutation.isPending}
                onClick={() => startMutation.mutate()}
              >
                Start enrollment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
              {
                key: 'id',
                header: 'ID',
                render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>,
              },
              { key: 'yearLevel', header: 'Year' },
              { key: 'semester', header: 'Sem' },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ]}
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
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
    <QueryPage
      title="Academic advising"
      description="Enrollment advising status from USiS"
      query={enrollments}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Advising-related enrollments"
          columns={[
            {
              key: 'status',
              header: 'Enrollment status',
              render: (r) => <Badge>{r.status}</Badge>,
            },
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
  const plan = useQuery({
    queryKey: ['student', 'curriculum-plan'],
    queryFn: async () => (await fetchMyCurriculumPlan()).data,
  })
  const list = useInfiniteListQuery({
    queryKey: ['student', 'subjects', controls.debouncedSearch],
    queryFn: (page) =>
      fetchSubjects({
        search: controls.debouncedSearch || undefined,
        page,
        limit: controls.pageSize,
      }),
  })
  const yearLevel = plan.data?.student?.yearLevel ?? null
  const currentTerm = plan.data?.currentTermRemaining ?? []
  const planByTerm = plan.data?.planByTerm ?? []
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject selection"
        description="Curriculum subjects by year and semester, plus the open catalog for irregular encoding"
      />
      {plan.isLoading ? <LoadingState label="Loading curriculum plan" /> : null}
      {plan.data ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Recommended for year {yearLevel ?? '—'} · standing{' '}
              <Badge>{plan.data.academicStanding}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataTable
              label="Current year remaining"
              emptyTitle="No remaining subjects for your year level"
              emptyDescription="All curriculum subjects for this year are completed or credited, or no active curriculum is linked to your program."
              columns={[
                { key: 'subjectCode', header: 'Code' },
                { key: 'title', header: 'Title' },
                { key: 'units', header: 'Units' },
                {
                  key: 'semester',
                  header: 'Sem',
                  render: (r) => r.semester ?? '—',
                },
              ]}
              data={currentTerm}
              keyExtractor={(r) => r.id}
            />
            {planByTerm.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--color-ink)]">Full curriculum plan</p>
                {planByTerm.map((term) => (
                  <DataTable
                    key={`${term.yearLevel}-${term.semester}`}
                    label={`Year ${term.yearLevel || '—'} · Sem ${term.semester || '—'}`}
                    columns={[
                      { key: 'subjectCode', header: 'Code' },
                      { key: 'title', header: 'Title' },
                      { key: 'units', header: 'Units' },
                    ]}
                    data={term.subjects}
                    keyExtractor={(r) => r.id}
                  />
                ))}
              </div>
            ) : null}
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Passed {plan.data.passed.length} · Failed {plan.data.failed.length} · Remaining{' '}
              {plan.data.remaining.length}
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Open catalog</h2>
        <SearchInput
          value={controls.search}
          onChange={(e) => controls.setSearch(e.target.value)}
          placeholder="Search subjects…"
          aria-label="Search subjects"
        />
        {list.isLoading && !list.flatRows.length ? <LoadingState label="Loading Subjects" /> : null}
        {list.isSuccess && list.flatRows.length === 0 ? (
          <EmptyState title="No records" description="Nothing matched the current filters." />
        ) : null}
        {list.flatRows.length > 0 ? (
          <div className="space-y-3">
            <DataTable
              label="Subjects"
              columns={[
                { key: 'subjectCode', header: 'Code' },
                { key: 'title', header: 'Title' },
                { key: 'units', header: 'Units' },
              ]}
              data={list.flatRows}
              keyExtractor={(r) => r.id}
            />
            {list.hasNextPage ? (
              <div ref={list.loadMoreRef} className="flex h-10 items-center justify-center">
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {list.isFetchingNextPage ? 'Loading more subjects…' : 'Scroll for more'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Showing {list.flatRows.length}
                {typeof list.data?.pages[0]?.meta.total === 'number'
                  ? ` of ${list.data.pages[0].meta.total}`
                  : ''}{' '}
                subjects
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function StudentSchedulePage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const queryClient = useQueryClient()
  const [waitlistSectionId, setWaitlistSectionId] = useState('')
  const [classCodesLine, setClassCodesLine] = useState('')
  const [blockGroupCode, setBlockGroupCode] = useState('')
  const [conflictSectionId, setConflictSectionId] = useState('')
  const [resolvedPreview, setResolvedPreview] = useState<Awaited<
    ReturnType<typeof resolveClassCodesLine>
  > | null>(null)
  const [alternates, setAlternates] = useState<
    Awaited<ReturnType<typeof searchAlternateSections>>['alternatives'] | null
  >(null)
  const [currentEnrollmentId, setCurrentEnrollmentId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['student', 'schedule', student.data?.id],
    queryFn: async () => {
      const workflow = await fetchStudentEnrollmentWorkflow()
      if (workflow?.enrollment?.id) {
        setCurrentEnrollmentId(workflow.enrollment.id)
        return workflow.scheduleRows
      }
      setCurrentEnrollmentId(null)
      return []
    },
    enabled: !!student.data?.id,
  })
  const waitlist = useQuery({
    queryKey: ['student', 'waitlist'],
    queryFn: fetchMyWaitlist,
    enabled: !!student.data?.id,
  })
  const scheduleNotifs = useQuery({
    queryKey: ['student', 'schedule-notifications'],
    queryFn: fetchMyScheduleNotifications,
    enabled: !!student.data?.id,
  })
  const joinMutation = useMutation({
    mutationFn: (sectionId: string) => joinSectionWaitlist(sectionId),
    onSuccess: (row) => {
      notify({ tone: 'success', title: `Waitlist position #${row.position}` })
      void waitlist.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Waitlist failed', description: getApiErrorMessage(err) }),
  })
  const leaveMutation = useMutation({
    mutationFn: (entryId: string) => leaveSectionWaitlist(entryId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Left waitlist' })
      void waitlist.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Leave failed', description: getApiErrorMessage(err) }),
  })
  const markNotifRead = useMutation({
    mutationFn: (id: string) => markScheduleNotificationRead(id),
    onSuccess: () => void scheduleNotifs.refetch(),
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
    onError: (err) =>
      notify({ tone: 'danger', title: 'Resolve failed', description: getApiErrorMessage(err) }),
  })

  const searchAlternatesMutation = useMutation({
    mutationFn: () =>
      searchAlternateSections({
        conflictingSectionId: conflictSectionId.trim() || undefined,
      }),
    onSuccess: (data) => setAlternates(data.alternatives),
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Schedule search failed',
        description: getApiErrorMessage(err),
      }),
  })

  const applyCodesMutation = useMutation({
    mutationFn: () => applyClassCodesLine(currentEnrollmentId!, classCodesLine.trim()),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: `Added ${data.addedCount} section(s)`,
        description: `Auto-reassess: ${data.autoReassessment}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['student', 'schedule'] })
      setResolvedPreview(null)
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Apply failed', description: getApiErrorMessage(err) }),
  })

  const encodeBlockMutation = useMutation({
    mutationFn: () => encodeBlockGroup(currentEnrollmentId!, blockGroupCode.trim()),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: `Block ${data.blockGroupCode}: added ${data.addedCount} section(s)`,
        description: `Auto-reassess: ${data.autoReassessment}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['student', 'schedule'] })
      setBlockGroupCode('')
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Block encode failed',
        description: getApiErrorMessage(err),
      }),
  })

  return (
    <div className="space-y-4">
      <QueryPage
        title="Class schedule"
        description="Subjects on your current enrollment"
        query={query}
        isEmpty={(d) => d.length === 0}
      >
        {(rows) => (
          <DataTable
            label="Schedule lines"
            columns={[
              { key: 'subjectCode', header: 'Code' },
              { key: 'subjectTitle', header: 'Subject' },
              { key: 'sectionCode', header: 'Section', render: (r) => r.sectionCode ?? '—' },
              {
                key: 'meetingLabels',
                header: 'Schedule',
                render: (r) => (r.meetingLabels?.length ? r.meetingLabels.join('; ') : '—'),
              },
              {
                key: 'facultyNames',
                header: 'Faculty',
                render: (r) => (r.facultyNames?.length ? r.facultyNames.join('; ') : '—'),
              },
              { key: 'units', header: 'Units' },
              { key: 'status', header: 'Status' },
            ]}
            data={rows}
            keyExtractor={(r) => r.lineId}
          />
        )}
      </QueryPage>
      <Card>
        <CardHeader>
          <CardTitle>Schedule notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(scheduleNotifs.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No schedule change notices yet.
            </p>
          ) : (
            (scheduleNotifs.data ?? []).slice(0, 10).map((n) => (
              <div key={n.id} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{n.eventType}</Badge>
                  {n.readAt ? null : <Badge>Unread</Badge>}
                  <span className="font-medium">{n.title}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{n.body}</p>
                {!n.readAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={markNotifRead.isPending}
                    onClick={() => markNotifRead.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Irregular class codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Enter section codes on one line, separated by spaces. Resolve to preview seats, then
            apply to your current enrollment.
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
              disabled={
                !classCodesLine.trim() || !currentEnrollmentId || applyCodesMutation.isPending
              }
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
          <CardTitle>Regular block encode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Encode all active subject sections that share a block group code. Reassessment runs
            automatically when re-advising is not required (or advising is waived).
          </p>
          <FormField id="blockGroupCode" label="Block group code">
            <input
              id="blockGroupCode"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              value={blockGroupCode}
              onChange={(e) => setBlockGroupCode(e.target.value)}
              placeholder="BSIT-1A"
            />
          </FormField>
          <Button
            type="button"
            disabled={
              !blockGroupCode.trim() || !currentEnrollmentId || encodeBlockMutation.isPending
            }
            onClick={() => encodeBlockMutation.mutate()}
          >
            Encode block
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open sections (conflict search)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Search alternate sections with no schedule conflict and available seats (same subject as
            the conflicting section when an ID is provided).
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
            When a section is full and waitlisting is enabled, join the queue here instead of
            forcing registration.
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
                {
                  key: 'id',
                  header: 'Action',
                  render: (r) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={leaveMutation.isPending}
                      onClick={() => leaveMutation.mutate(r.id)}
                    >
                      Leave
                    </Button>
                  ),
                },
              ]}
              data={waitlist.data ?? []}
              keyExtractor={(r) => r.id}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No active waitlist entries.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AssessmentFormPrintView({
  doc,
}: {
  doc: {
    documentNumber: string
    issuedAt?: string | null
    snapshot?: Record<string, unknown>
  }
}) {
  const snapshot = (doc.snapshot ?? {}) as {
    student?: { studentNumber?: string; name?: string }
    enrollment?: {
      academicYear?: string | null
      semester?: number
      yearLevel?: number
      status?: string
    }
    subjects?: Array<{ code: string; title: string; units: number }>
    assessment?: {
      assessmentNumber?: string
      tuitionFee?: number
      miscFees?: number
      discount?: number
      netAmount?: number
      lines?: Array<{ feeCode: string; description: string; amount: number; isAid?: boolean }>
    }
  }
  return (
    <div
      id="assessment-form-print"
      className="rounded-xl border border-[var(--color-border)] bg-white p-6 print:border-0"
    >
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
        WMSU USiS assessment form
      </p>
      <h2 className="text-xl font-semibold">{doc.documentNumber}</h2>
      <p className="mt-1 font-mono text-sm">{snapshot.student?.studentNumber}</p>
      <p className="text-sm text-[var(--color-muted-foreground)]">{snapshot.student?.name}</p>
      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
        {snapshot.enrollment?.academicYear ?? '—'} · Sem {snapshot.enrollment?.semester ?? '—'} ·
        Year {snapshot.enrollment?.yearLevel ?? '—'} · {snapshot.enrollment?.status ?? '—'}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Code</th>
              <th className="py-1">Subject</th>
              <th className="py-1">Units</th>
            </tr>
          </thead>
          <tbody>
            {(snapshot.subjects ?? []).map((s) => (
              <tr key={`${s.code}-${s.title}`} className="border-b border-[var(--color-border)]/60">
                <td className="py-1 font-mono text-xs">{s.code}</td>
                <td className="py-1">{s.title}</td>
                <td className="py-1">{s.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {snapshot.assessment ? (
        <div className="mt-4 space-y-1 text-sm">
          <p>
            Assessment <span className="font-mono">{snapshot.assessment.assessmentNumber}</span>
          </p>
          {Array.isArray((snapshot.assessment as { lines?: unknown[] }).lines) &&
          (
            snapshot.assessment as {
              lines: Array<{
                feeCode: string
                description: string
                amount: number
                isAid?: boolean
              }>
            }
          ).lines.filter((l) => !l.isAid).length ? (
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-1">Fee</th>
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(
                  snapshot.assessment as {
                    lines: Array<{
                      feeCode: string
                      description: string
                      amount: number
                      isAid?: boolean
                    }>
                  }
                ).lines
                  .filter((l) => !l.isAid)
                  .map((l) => (
                    <tr key={l.feeCode + l.description}>
                      <td className="py-0.5 font-mono">{l.feeCode}</td>
                      <td className="py-0.5">{l.description}</td>
                      <td className="py-0.5 text-right">{Number(l.amount).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <>
              <p>Tuition: {Number(snapshot.assessment.tuitionFee ?? 0).toFixed(2)}</p>
              <p>Misc: {Number(snapshot.assessment.miscFees ?? 0).toFixed(2)}</p>
            </>
          )}
          <p>Discount: {Number(snapshot.assessment.discount ?? 0).toFixed(2)}</p>
          <p className="font-semibold">
            Net: {Number(snapshot.assessment.netAmount ?? 0).toFixed(2)}
          </p>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
        Issued {doc.issuedAt ? new Date(doc.issuedAt).toLocaleString() : '—'}
      </p>
    </div>
  )
}

export function StudentAssessmentsPage() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const student = useMyStudent()
  const assessControls = useListControls()
  const query = usePaginatedQuery({
    queryKey: ['student', 'assessments', assessControls.page],
    queryFn: () => fetchAssessments({ page: assessControls.page, limit: assessControls.pageSize }),
  })
  const monitor = useQuery({
    queryKey: ['student', 'account-monitor'],
    queryFn: fetchMyAccountMonitor,
  })
  const enrollments = useQuery({
    queryKey: ['student', 'assess-enr', student.data?.id],
    queryFn: () => fetchEnrollments({ studentId: student.data?.id, limit: 10 }),
    enabled: !!student.data?.id,
  })
  const [printDoc, setPrintDoc] = useState<{
    documentNumber: string
    issuedAt?: string | null
    snapshot?: Record<string, unknown>
  } | null>(null)

  const issue = useMutation({
    mutationFn: async () => {
      const enrollmentId =
        monitor.data?.latestAssessment?.enrollmentId ||
        enrollments.data?.data.find((e) =>
          ['assessed', 'payment_verified', 'registered'].includes(e.status)
        )?.id ||
        enrollments.data?.data[0]?.id
      if (!enrollmentId) throw new Error('No enrollment available for assessment form')
      return issueRegistrationDocument({ enrollmentId, docType: 'assessment_form' })
    },
    onSuccess: (doc) => {
      notify({ tone: 'success', title: 'Assessment form issued' })
      setPrintDoc(doc)
      void qc.invalidateQueries({ queryKey: ['student', 'account-monitor'] })
      void qc.invalidateQueries({ queryKey: ['student', 'docs'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Assessment form failed',
        description: getApiErrorMessage(err),
      }),
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account monitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {monitor.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading monitor…</p>
          ) : monitor.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard title="Open deficiencies" value={monitor.data.openDeficiencyCount} />
                <DashboardCard
                  title="Tuition balance"
                  value={
                    monitor.data.tuitionBalance
                      ? Number(monitor.data.tuitionBalance.balanceAmount).toFixed(2)
                      : '—'
                  }
                />
                <DashboardCard
                  title="Minimum due"
                  value={
                    monitor.data.tuitionBalance?.minimumDueRequired != null
                      ? Number(monitor.data.tuitionBalance.minimumDueRequired).toFixed(2)
                      : monitor.data.paymentSchedule?.minimumDueRequired != null
                        ? Number(monitor.data.paymentSchedule.minimumDueRequired).toFixed(2)
                        : '—'
                  }
                />
                <DashboardCard title="Running grades" value={monitor.data.runningGrades.length} />
              </div>
              {monitor.data.assessmentBreakdown?.length ? (
                <DataTable
                  label="Assessment fee breakdown"
                  columns={[
                    { key: 'feeCode', header: 'Code', className: 'font-mono text-xs' },
                    { key: 'description', header: 'Description' },
                    {
                      key: 'feeType',
                      header: 'Type',
                      render: (row) => <Badge>{row.feeType}</Badge>,
                    },
                    {
                      key: 'quantity',
                      header: 'Qty',
                      className: 'text-right',
                      render: (row) => Number(row.quantity).toFixed(row.quantity % 1 ? 1 : 0),
                    },
                    {
                      key: 'amount',
                      header: 'Amount',
                      className: 'text-right whitespace-nowrap',
                      render: (row) => Number(row.amount).toFixed(2),
                    },
                  ]}
                  data={monitor.data.assessmentBreakdown}
                  keyExtractor={(row) => `${row.feeCode}-${row.description}`}
                />
              ) : null}
              {monitor.data.paymentSchedule?.installments?.length ? (
                <DataTable
                  label="Installment schedule"
                  columns={[
                    { key: 'sequence', header: '#', className: 'w-10' },
                    { key: 'label', header: 'Period' },
                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (row) => Number(row.amount).toFixed(2),
                    },
                    {
                      key: 'paidAmount',
                      header: 'Paid',
                      render: (row) => Number(row.paidAmount).toFixed(2),
                    },
                    {
                      key: 'dueDate',
                      header: 'Due',
                      render: (row) =>
                        row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—',
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <Badge>{row.status}</Badge>,
                    },
                  ]}
                  data={monitor.data.paymentSchedule.installments}
                  keyExtractor={(row) => String(row.sequence)}
                />
              ) : null}
              <DataTable
                label="Enrollment deficiencies"
                columns={[
                  { key: 'requirementCode', header: 'Code' },
                  { key: 'description', header: 'Description' },
                  { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                ]}
                data={monitor.data.deficiencies}
                keyExtractor={(r) => r.id}
              />
              <DataTable
                label="Running grades"
                columns={[
                  { key: 'courseCode', header: 'Code' },
                  { key: 'courseTitle', header: 'Course' },
                  { key: 'markCode', header: 'Mark', render: (r) => r.markCode ?? r.grade ?? '—' },
                  { key: 'status', header: 'Status' },
                ]}
                data={monitor.data.runningGrades}
                keyExtractor={(r) => r.id}
              />
            </>
          ) : (
            <Alert variant="warning" title="Monitor unavailable">
              Link a student profile to view deficiencies, balances, and running grades.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Print assessment form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Issue a printable assessment form from your latest assessed enrollment. Existing COR
            flow is unchanged.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => issue.mutate()} disabled={issue.isPending}>
              Issue assessment form
            </Button>
            {printDoc ? (
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Print
              </Button>
            ) : null}
          </div>
          {printDoc ? <AssessmentFormPrintView doc={printDoc} /> : null}
          {monitor.data?.assessmentForms?.length ? (
            <DataTable
              label="Issued assessment forms"
              columns={[
                { key: 'documentNumber', header: 'Document #' },
                {
                  key: 'issuedAt',
                  header: 'Issued',
                  render: (r) => (r.issuedAt ? new Date(r.issuedAt).toLocaleString() : '—'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPrintDoc(r)}
                    >
                      View / print
                    </Button>
                  ),
                },
              ]}
              data={monitor.data.assessmentForms}
              keyExtractor={(r) => r.id}
            />
          ) : null}
        </CardContent>
      </Card>

      <QueryPage
        title="Assessment records"
        query={query}
        page={assessControls.page}
        lastPage={query.data?.meta.lastPage}
        onPageChange={assessControls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Assessments"
            columns={[
              { key: 'assessmentNumber', header: 'Number' },
              { key: 'status', header: 'Status' },
              { key: 'netAmount', header: 'Net', render: (r) => Number(r.netAmount).toFixed(2) },
              {
                key: 'ufmsPaymentStatus',
                header: 'UFMS payment',
                render: (r) => r.ufmsPaymentStatus ?? '—',
              },
            ]}
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function StudentPaymentsPage() {
  const controls = useListControls()
  const monitor = useQuery({
    queryKey: ['student', 'account-monitor'],
    queryFn: fetchMyAccountMonitor,
  })
  const query = usePaginatedQuery({
    queryKey: ['student', 'payments', controls.page],
    queryFn: () => fetchPayments({ page: controls.page, limit: controls.pageSize }),
  })
  const minDue =
    monitor.data?.paymentSchedule?.minimumDueRequired ??
    monitor.data?.tuitionBalance?.minimumDueRequired ??
    null
  const balance = monitor.data?.tuitionBalance?.balanceAmount ?? null
  return (
    <div className="space-y-6">
      <Alert variant="info" title="How to pay (PH SUC process)">
        Online gateway payment is not enabled yet. Settle at least the registration minimum at the
        UFMS cashier (Cashier &amp; AR). After the OR is posted, the registrar verifies payment and
        continues registration.
        {minDue != null ? (
          <>
            {' '}
            Minimum due now: <strong>{Number(minDue).toFixed(2)}</strong>
            {balance != null ? <> · Balance: {Number(balance).toFixed(2)}</> : null}.
          </>
        ) : null}
      </Alert>
      {monitor.data?.assessmentBreakdown?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessed fees</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              label="Fee breakdown"
              columns={[
                { key: 'feeCode', header: 'Code' },
                { key: 'description', header: 'Description' },
                { key: 'feeType', header: 'Type', render: (r) => <Badge>{r.feeType}</Badge> },
                { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
              ]}
              data={monitor.data.assessmentBreakdown}
              keyExtractor={(r) => `${r.feeCode}-${r.description}`}
            />
          </CardContent>
        </Card>
      ) : null}
      {monitor.data?.paymentSchedule?.installments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Installment schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {monitor.data.assessmentBreakdown?.length ? (
              <div className="mb-6">
                <DataTable
                  label="Fees assessed"
                  columns={[
                    { key: 'feeCode', header: 'Code' },
                    { key: 'description', header: 'Description' },
                    {
                      key: 'amount',
                      header: 'Amount',
                      render: (r) => Number(r.amount).toFixed(2),
                    },
                  ]}
                  data={monitor.data.assessmentBreakdown}
                  keyExtractor={(r) => `${r.feeCode}-${r.description}`}
                />
              </div>
            ) : null}
            <DataTable
              label="Installments"
              columns={[
                { key: 'label', header: 'Period' },
                { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
                {
                  key: 'paidAmount',
                  header: 'Paid',
                  render: (r) => Number(r.paidAmount).toFixed(2),
                },
                { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              ]}
              data={monitor.data.paymentSchedule.installments}
              keyExtractor={(r) => String(r.sequence)}
            />
          </CardContent>
        </Card>
      ) : null}
      <QueryPage
        title="Payment status"
        description="UFMS-confirmed payment mirrors in USiS"
        query={query}
        page={controls.page}
        lastPage={query.data?.meta.lastPage}
        onPageChange={controls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Payments"
            columns={[
              { key: 'orNumber', header: 'OR #', render: (r) => r.orNumber ?? '—' },
              { key: 'amount', header: 'Amount', render: (r) => Number(r.amount).toFixed(2) },
              { key: 'paymentType', header: 'Type' },
              {
                key: 'ufmsConfirmed',
                header: 'UFMS',
                render: (r) => (r.ufmsConfirmed ? 'confirmed' : '—'),
              },
            ]}
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function StudentCorPage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const docs = useQuery({
    queryKey: ['student', 'docs'],
    queryFn: () => fetchRegistrationDocuments(),
  })
  const enrollments = useQuery({
    queryKey: ['student', 'cor-enr', student.data?.id],
    queryFn: () =>
      fetchEnrollments({ studentId: student.data?.id, status: 'registered', limit: 5 }),
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
    onError: (err) =>
      notify({ tone: 'danger', title: 'COR failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <QueryPage
        title="Certificate of Registration"
        query={docs}
        isEmpty={(d) => d.length === 0}
        actions={
          <Button type="button" onClick={() => issue.mutate()} disabled={issue.isPending}>
            Issue COR
          </Button>
        }
      >
        {(rows) => (
          <DataTable
            label="Registration documents"
            columns={[
              { key: 'documentNumber', header: 'Document #' },
              { key: 'docType', header: 'Type' },
              {
                key: 'enrollmentId',
                header: 'Enrollment',
                render: (r) => (
                  <span className="font-mono text-xs">{r.enrollmentId.slice(0, 8)}</span>
                ),
              },
            ]}
            data={rows.filter((r) => r.docType === 'certificate_of_registration')}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function StudentTaskCalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Task calendar
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Deadlines, faculty evaluations, and live grade feedback countdown
        </p>
      </div>
      <StudentTaskCalendarPanel />
    </div>
  )
}

export function StudentGradesPage() {
  const { notify } = useNotification()
  const seenIds = useRef<Set<string>>(new Set())
  const seeded = useRef(false)
  const gradeControls = useListControls()
  const query = usePaginatedQuery({
    queryKey: ['student', 'grades', gradeControls.page],
    queryFn: () => fetchGrades({ page: gradeControls.page, limit: gradeControls.pageSize }),
    refetchInterval: 15_000,
  })
  const feedback = useQuery({
    queryKey: ['student', 'grade-feedback'],
    queryFn: () => fetchStudentGradeFeedback(120),
    refetchInterval: 15_000,
  })

  useEffect(() => {
    const items = feedback.data?.items ?? []
    if (!items.length) return
    if (!seeded.current) {
      for (const item of items) seenIds.current.add(item.id)
      seeded.current = true
      return
    }
    const fresh = items.filter((item) => !seenIds.current.has(item.id))
    for (const item of fresh) {
      seenIds.current.add(item.id)
      notify({
        tone: 'success',
        title: `Grade posted: ${item.courseCode}`,
        description: `${item.markCode}${item.remarks ? ` · ${item.remarks}` : ''}`,
      })
    }
  }, [feedback.data, notify])

  const justPostedIds = new Set(
    (feedback.data?.items ?? []).filter((i) => i.justPosted).map((i) => i.id)
  )

  return (
    <div className="space-y-4">
      {(feedback.data?.items ?? []).some((i) => i.justPosted) ? (
        <Alert variant="success" title="Instant grade feedback">
          {(feedback.data?.items ?? [])
            .filter((i) => i.justPosted)
            .slice(0, 3)
            .map((i) => `${i.courseCode}: ${i.markCode}`)
            .join(' · ')}
        </Alert>
      ) : null}
      <QueryPage
        title="Grades"
        query={query}
        page={gradeControls.page}
        lastPage={query.data?.meta.lastPage}
        onPageChange={gradeControls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Grades"
            columns={[
              { key: 'courseCode', header: 'Code' },
              { key: 'courseTitle', header: 'Course' },
              { key: 'units', header: 'Units' },
              {
                key: 'markCode',
                header: 'Mark',
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    {r.markCode ?? r.grade ?? '—'}
                    {justPostedIds.has(r.id) ? <Badge>Just posted</Badge> : null}
                  </span>
                ),
              },
              { key: 'status', header: 'Status', render: (r) => r.status ?? '—' },
            ]}
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
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
    <QueryPage
      title="Academic history"
      query={query}
      isEmpty={(d) => (d.grades?.length ?? 0) === 0}
    >
      {(records) => (
        <DataTable
          label="Academic history"
          columns={[
            { key: 'courseCode', header: 'Code', render: (r) => String(r.courseCode ?? '') },
            { key: 'courseTitle', header: 'Title', render: (r) => String(r.courseTitle ?? '') },
            { key: 'markCode', header: 'Mark', render: (r) => String(r.markCode ?? r.grade ?? '') },
            {
              key: 'originalMarkCode',
              header: 'Original',
              render: (r) => String(r.originalMarkCode ?? '—'),
            },
          ]}
          data={records.grades as Array<Record<string, unknown>>}
          keyExtractor={(r) => String(r.id ?? r.courseCode ?? 'row')}
        />
      )}
    </QueryPage>
  )
}

export function StudentRequirementsPage() {
  const query = useQuery({
    queryKey: ['student', 'deficiencies'],
    queryFn: () => fetchDeficiencies(),
  })
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
  const query = useQuery({
    queryKey: ['student', 'scholarships'],
    queryFn: () => fetchScholarships(),
  })
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

const orgApplySchema = z.object({
  proposedName: z.string().min(3),
  applicationType: z.enum(['new', 'renewal']),
})

export function StudentSupportPage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { channel: 'online' },
  })
  const orgForm = useForm<z.infer<typeof orgApplySchema>>({
    resolver: zodResolver(orgApplySchema),
    defaultValues: { proposedName: '', applicationType: 'new' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof supportSchema>) => {
      if (!student.data?.id) throw new Error('Student profile required')
      return createCounselingRequest({ studentId: student.data.id, channel: values.channel })
    },
    onSuccess: () => notify({ tone: 'success', title: 'Support request submitted' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Request failed', description: getApiErrorMessage(err) }),
  })
  const orgApps = useQuery({
    queryKey: ['student', 'org-apps'],
    queryFn: fetchOrgApplications,
    enabled: Boolean(student.data?.id),
  })
  const orgs = useQuery({
    queryKey: ['student', 'orgs'],
    queryFn: fetchStudentOrganizations,
    enabled: Boolean(student.data?.id),
  })
  const idRequests = useQuery({
    queryKey: ['student', 'id-requests'],
    queryFn: () => fetchStudentIdRequests(),
    enabled: Boolean(student.data?.id),
  })
  const submitId = useMutation({
    mutationFn: (requestType: 'new' | 'replacement') => submitStudentIdRequest({ requestType }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Student ID request submitted' })
      void qc.invalidateQueries({ queryKey: ['student', 'id-requests'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'ID request failed', description: getApiErrorMessage(err) }),
  })
  const digitalPdf = useMutation({
    mutationFn: async (requestId: string) => {
      const blob = await downloadDigitalStudentIdPdf(requestId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `digital-id-${requestId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => notify({ tone: 'success', title: 'Digital ID PDF downloaded' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Digital PDF failed', description: getApiErrorMessage(err) }),
  })
  const submitOrg = useMutation({
    mutationFn: (values: z.infer<typeof orgApplySchema>) =>
      submitOrgApplication({
        proposedName: values.proposedName,
        applicationType: values.applicationType,
        requirementsJson: {
          documents: [
            { key: 'constitution_bylaws', label: 'constitution bylaws', submitted: true },
            { key: 'list_of_officers', label: 'list of officers', submitted: true },
            { key: 'membership_roster', label: 'membership roster', submitted: true },
            { key: 'adviser_endorsement', label: 'adviser endorsement', submitted: true },
          ],
        },
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Organization application submitted' })
      void qc.invalidateQueries({ queryKey: ['student', 'org-apps'] })
      orgForm.reset({ proposedName: '', applicationType: 'new' })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Org apply failed', description: getApiErrorMessage(err) }),
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
            <Button type="submit" disabled={mutation.isPending || !student.data}>
              Submit counseling request
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization accreditation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid max-w-md gap-3"
            onSubmit={orgForm.handleSubmit((values) => submitOrg.mutate(values))}
          >
            <FormField
              id="orgName"
              label="Proposed organization name"
              error={orgForm.formState.errors.proposedName?.message}
            >
              <Input id="orgName" {...orgForm.register('proposedName')} />
            </FormField>
            <FormField id="orgType" label="Application type">
              <Select id="orgType" {...orgForm.register('applicationType')}>
                <option value="new">New</option>
                <option value="renewal">Renewal</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={submitOrg.isPending || !student.data}>
              Submit accreditation application
            </Button>
          </form>
          {orgApps.data?.length ? (
            <ul className="space-y-2 text-sm">
              {orgApps.data.map((app) => (
                <li key={app.id}>
                  {app.proposedName} · {app.workflowStatus}
                  {app.allowedNextStatuses.length
                    ? ` · next: ${app.allowedNextStatuses.join(', ')}`
                    : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {orgs.data?.length ? (
            <Alert variant="success" title="Accredited organizations">
              {orgs.data.map((o) => `${o.code} — ${o.name}`).join('; ')}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Student ID request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Apply for a new ID or replacement. OSA verifies records; after payment validation a
            provisional digital ID (PDF+QR) can be issued while RFID/print hardware remains
            university-confirmed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!student.data || submitId.isPending}
              onClick={() => submitId.mutate('new')}
            >
              Request new ID
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!student.data || submitId.isPending}
              onClick={() => submitId.mutate('replacement')}
            >
              Request replacement
            </Button>
          </div>
          {idRequests.data?.length ? (
            <ul className="space-y-2 text-sm">
              {idRequests.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {r.requestType} · {r.status} · print {r.printUnitStatus ?? '—'}
                  </span>
                  {r.digitalDocumentToken ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={digitalPdf.isPending}
                      onClick={() => digitalPdf.mutate(r.id)}
                    >
                      Download digital ID
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      {student.data?.id ? <StudentClearanceHints studentId={student.data.id} /> : null}
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
        <pre className="overflow-auto rounded-xl bg-[var(--color-muted)] p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </QueryPage>
  )
}

export function StudentQueuePage() {
  const student = useMyStudent()
  const { notify } = useNotification()
  const [office, setOffice] = useState('guidance')
  const [ticket, setTicket] = useState<string | null>(null)
  const display = useQuery({
    queryKey: ['student', 'queue-display', office],
    queryFn: () => fetchQueueDisplay(office),
    refetchInterval: 10000,
  })
  const myTickets = useQuery({
    queryKey: ['student', 'queue-tickets', student.data?.id],
    queryFn: () => fetchQueueTickets({ studentId: student.data?.id, todayOnly: true }),
    enabled: Boolean(student.data?.id),
    refetchInterval: 10000,
  })
  const mutation = useMutation({
    mutationFn: () =>
      issueQueueTicket({
        office,
        serviceCode:
          office === 'guidance' ? 'counseling' : office === 'registrar' ? 'registrar' : 'service',
        studentId: student.data?.id,
      }),
    onSuccess: (data) => {
      setTicket(data.ticketNo)
      notify({ tone: 'success', title: `Ticket ${data.ticketNo}` })
      void myTickets.refetch()
      void display.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Queue failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue and appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="info" title="Software queue">
          Ticket numbers and status refresh here. Hardware slip printers / public boards are out of
          software scope.
        </Alert>
        <FormField id="office" label="Office">
          <Select id="office" value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="guidance">Guidance</option>
            <option value="health">Health</option>
            <option value="osa">Student Affairs</option>
            <option value="registrar">Registrar</option>
          </Select>
        </FormField>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Get queue ticket
        </Button>
        {ticket ? (
          <Alert variant="success" title="Current ticket">
            {ticket}
          </Alert>
        ) : null}
        {display.data ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            {office}: waiting {display.data.waitingCount} · serving {display.data.calledCount}
            {display.data.nowServing[0] ? ` · now ${display.data.nowServing[0].ticketNo}` : ''}
          </div>
        ) : null}
        {myTickets.data?.length ? (
          <ul className="space-y-1 text-sm">
            {myTickets.data.map((t) => (
              <li key={t.id} className="font-mono">
                {t.ticketNo} · {t.status} · {t.office}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function StudentAdmissionPage() {
  const student = useMyStudent()
  return (
    <div className="space-y-4">
      <Alert variant="info" title="Applicant self-service">
        Before admission, monitor an application with the application number and email at{' '}
        <a className="underline" href="/apply/status" target="_blank" rel="noreferrer">
          /apply/status
        </a>
        .
      </Alert>
      <QueryPage
        title="Admission status"
        description="Linked student record after admission"
        query={student}
        isEmpty={(d) => !d}
      >
        {(row) =>
          row ? (
            <Alert variant="success" title="Admitted / active student">
              {row.studentNumber} · {row.status}
            </Alert>
          ) : null
        }
      </QueryPage>
    </div>
  )
}

export function StudentFacultyEvalPage() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const pending = useQuery({
    queryKey: ['student', 'faculty-eval'],
    queryFn: () => fetchFacultyEvalPending(),
  })
  const [activeTarget, setActiveTarget] = useState<string | null>(searchParams.get('target'))
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    const fromQuery = searchParams.get('target')
    if (fromQuery) setActiveTarget(fromQuery)
  }, [searchParams])

  useEffect(() => {
    if (activeTarget) return
    const first = pending.data?.items?.[0]?.targetId
    if (first && searchParams.get('target')) setActiveTarget(searchParams.get('target'))
  }, [pending.data, activeTarget, searchParams])

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
      qc.invalidateQueries({ queryKey: ['student', 'task-calendar'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Could not submit', description: getApiErrorMessage(err) }),
  })

  const items = pending.data?.items ?? []
  const questions = pending.data?.questions ?? []
  const active = items.find((i) => i.targetId === activeTarget)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Faculty evaluation
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Complete scheduled teacher evaluations online. Responses are stored for aggregate reporting.
      </p>
      {pending.data?.studentLinked === false ? (
        <Alert variant="warning" title="No student profile linked">
          Your account must be linked to a student record with active section enrollment to receive
          evaluation forms.
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
                  <p>
                    {item.scheduleTitle} · {item.sectionLabel}
                  </p>
                  <Button
                    type="button"
                    variant={activeTarget === item.targetId ? 'default' : 'outline'}
                    onClick={() => setActiveTarget(item.targetId)}
                  >
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
