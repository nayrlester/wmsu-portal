import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
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
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage, useListControls } from '@/components/query-page'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  admitApplicant,
  createAnnouncement,
  createFacultyEvalCode,
  createFacultyEvalQuestion,
  createFacultyEvalSchedule,
  dispatchAnnouncement,
  fetchAcademicYears,
  fetchAnnouncements,
  fetchFacultyEvalAssignmentOptions,
  fetchFacultyEvalCodes,
  fetchFacultyEvalQuestions,
  fetchFacultyEvalReport,
  fetchApplicants,
  fetchDeficiencies,
  fetchEnrollments,
  fetchGrades,
  fetchPrograms,
  fetchSections,
  fetchSectionMeetings,
  fetchSectionSchedulingSummary,
  addSectionMeeting,
  deleteSectionMeeting,
  dropSectionEnrollmentLine,
  transferSectionEnrollmentLine,
  dissolveSection,
  fetchBuildings,
  fetchRooms,
  fetchRoomCategories,
  createBuilding,
  createRoom,
  createRoomCategory,
  fetchAcademicPolicies,
  updateAcademicPolicies,
  fetchInstitutionalProfile,
  updateInstitutionalProfile,
  fetchStudents,
  fetchSubjects,
  fetchEnrollment,
  registerEnrollment,
  verifyEnrollmentPayment,
  approveRegistrarEnrollment,
} from '@/lib/usis-api'

export function RegistrarDashboardPage() {
  return (
    <RequirePermission anyOf={['enrollments.read', 'applicants.read', 'students.read']}>
      <RegistrarDashboardInner />
    </RequirePermission>
  )
}

function RegistrarDashboardInner() {
  const applicants = useQuery({ queryKey: ['reg', 'applicants'], queryFn: () => fetchApplicants({ limit: 50 }) })
  const students = useQuery({ queryKey: ['reg', 'students'], queryFn: () => fetchStudents({ limit: 50 }) })
  const enrollments = useQuery({ queryKey: ['reg', 'enrollments'], queryFn: () => fetchEnrollments({ limit: 50 }) })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Registrar portal</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Applicant intake, student records, enrollment, grades, and registration workflows.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardCard title="Applicants" value={applicants.data?.data.length ?? 0} />
        <DashboardCard title="Students" value={students.data?.data.length ?? 0} />
        <DashboardCard title="Enrollments" value={enrollments.data?.data.length ?? 0} />
      </div>
    </div>
  )
}

export function RegistrarApplicantsPage() {
  return (
    <RequirePermission anyOf={['applicants.read']}>
      <RegistrarApplicantsInner />
    </RequirePermission>
  )
}

function RegistrarApplicantsInner() {
  const controls = useListControls()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['reg', 'applicants', controls.search, controls.page],
    queryFn: () => fetchApplicants({ search: controls.search || undefined, page: controls.page, limit: 20 }),
  })
  const admit = useMutation({
    mutationFn: (id: string) => admitApplicant(id, `STU-${Date.now().toString().slice(-8)}`),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Applicant admitted' })
      qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Admit failed', description: getApiErrorMessage(err) }),
  })

  return (
    <QueryPage
      title="Applicant management"
      query={query}
      search={controls.search}
      onSearchChange={controls.setSearch}
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Applicants"
          columns={[
            { key: 'name', header: 'Name', render: (r) => `${r.lastName}, ${r.firstName}` },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) =>
                r.status === 'pending' ? (
                  <Button type="button" size="sm" onClick={() => admit.mutate(r.id)}>
                    Admit
                  </Button>
                ) : (
                  '—'
                ),
            },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function RegistrarStudentsPage() {
  return (
    <RequirePermission anyOf={['students.read']}>
      <RegistrarStudentsInner />
    </RequirePermission>
  )
}

function RegistrarStudentsInner() {
  const controls = useListControls()
  const query = useQuery({
    queryKey: ['reg', 'students', controls.search, controls.page],
    queryFn: () => fetchStudents({ search: controls.search || undefined, page: controls.page, limit: 20 }),
  })
  return (
    <QueryPage
      title="Student records"
      query={query}
      search={controls.search}
      onSearchChange={controls.setSearch}
      searchPlaceholder="Search student number, name, email"
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Students"
          columns={[
            { key: 'studentNumber', header: 'Student #' },
            { key: 'name', header: 'Name', render: (r) => `${r.lastName}, ${r.firstName}` },
            { key: 'email', header: 'Email' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          data={page.data}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function RegistrarEnrollmentsPage() {
  return (
    <RequirePermission anyOf={['enrollments.read']}>
      <RegistrarEnrollmentsInner />
    </RequirePermission>
  )
}

function RegistrarEnrollmentsInner() {
  const controls = useListControls()
  const query = useQuery({
    queryKey: ['reg', 'enrollments', controls.page, controls.search],
    queryFn: () => fetchEnrollments({ page: controls.page, limit: 20, status: controls.search || undefined }),
  })
  return (
    <QueryPage
      title="Enrollment management"
      description="Filter by enrollment status"
      query={query}
      search={controls.search}
      onSearchChange={controls.setSearch}
      searchPlaceholder="Status filter (e.g. registered)"
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Enrollments"
          columns={[
            { key: 'student', header: 'Student', render: (r) => r.student?.studentNumber ?? r.studentId.slice(0, 8) },
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

export function RegistrarAcademicPage() {
  return (
    <RequirePermission anyOf={['academic.read', 'academic.write']}>
      <RegistrarAcademicInner />
    </RequirePermission>
  )
}

function RegistrarAcademicInner() {
  const years = useQuery({ queryKey: ['reg', 'years'], queryFn: fetchAcademicYears })
  const programs = useQuery({ queryKey: ['reg', 'programs'], queryFn: () => fetchPrograms() })
  const sections = useQuery({ queryKey: ['reg', 'sections'], queryFn: () => fetchSections() })
  return (
    <div className="space-y-6">
      <QueryPage title="Academic years" query={years} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Academic years"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'isActive', header: 'Active', render: (r) => (r.isActive ? 'yes' : 'no') },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <QueryPage title="Programs" query={programs} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Programs"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <QueryPage title="Sections" query={sections} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Sections"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'yearLevel', header: 'Year' },
              { key: 'semester', header: 'Sem' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <RegistrarInstitutionalProfilePanel />
      <RegistrarFacilitiesPanel />
      <RegistrarAcademicPoliciesPanel />
      <RegistrarSectionSlotTools sections={sections.data ?? []} />
    </div>
  )
}

function RegistrarInstitutionalProfilePanel() {
  const { notify } = useNotification()
  const profile = useQuery({ queryKey: ['reg', 'institution'], queryFn: fetchInstitutionalProfile })
  const [legalName, setLegalName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [sigRole, setSigRole] = useState('registrar')
  const [sigName, setSigName] = useState('')
  const [sigTitle, setSigTitle] = useState('University Registrar')

  useEffect(() => {
    if (!profile.data) return
    setLegalName(profile.data.legalName)
    setDisplayName(profile.data.displayName ?? '')
    setLogoUrl(profile.data.logoUrl ?? '')
    const first = profile.data.signatories[0]
    if (first) {
      setSigRole(first.role)
      setSigName(first.name)
      setSigTitle(first.title ?? '')
    }
  }, [profile.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateInstitutionalProfile({
        legalName: legalName.trim(),
        displayName: displayName.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        signatories: sigName.trim()
          ? [{ role: sigRole.trim(), name: sigName.trim(), title: sigTitle.trim() || undefined }]
          : [],
      }),
    onSuccess: () => notify({ tone: 'success', title: 'Institutional profile saved' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Profile failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institutional profile (ENR-004)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="legalName" label="Legal name">
          <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </FormField>
        <FormField id="displayName" label="Display name">
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </FormField>
        <FormField id="logoUrl" label="Logo URL">
          <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </FormField>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField id="instSigRole" label="Signatory role">
            <Input id="instSigRole" value={sigRole} onChange={(e) => setSigRole(e.target.value)} />
          </FormField>
          <FormField id="instSigName" label="Signatory name">
            <Input id="instSigName" value={sigName} onChange={(e) => setSigName(e.target.value)} />
          </FormField>
          <FormField id="instSigTitle" label="Signatory title">
            <Input id="instSigTitle" value={sigTitle} onChange={(e) => setSigTitle(e.target.value)} />
          </FormField>
        </div>
        <Button type="button" disabled={!legalName.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save profile
        </Button>
      </CardContent>
    </Card>
  )
}

function RegistrarFacilitiesPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const categories = useQuery({ queryKey: ['reg', 'room-categories'], queryFn: fetchRoomCategories })
  const buildings = useQuery({ queryKey: ['reg', 'buildings'], queryFn: fetchBuildings })
  const rooms = useQuery({ queryKey: ['reg', 'rooms'], queryFn: () => fetchRooms() })
  const [categoryCode, setCategoryCode] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [buildingCode, setBuildingCode] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [roomBuildingId, setRoomBuildingId] = useState('')
  const [roomCategoryId, setRoomCategoryId] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomCapacity, setRoomCapacity] = useState('40')

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createRoomCategory({
        code: categoryCode.trim(),
        name: categoryName.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Room category saved' })
      setCategoryCode('')
      setCategoryName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'room-categories'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Category failed', description: getApiErrorMessage(err) }),
  })

  const createBuildingMutation = useMutation({
    mutationFn: () =>
      createBuilding({
        code: buildingCode.trim(),
        name: buildingName.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Building saved' })
      setBuildingCode('')
      setBuildingName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'buildings'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Building failed', description: getApiErrorMessage(err) }),
  })

  const createRoomMutation = useMutation({
    mutationFn: () =>
      createRoom({
        buildingId: roomBuildingId,
        categoryId: roomCategoryId || undefined,
        code: roomCode.trim(),
        name: roomName.trim(),
        capacity: Number(roomCapacity) || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Room saved' })
      setRoomCode('')
      setRoomName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'rooms'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Room failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buildings and rooms (ENR-007)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="categoryCode" label="Category code">
            <Input id="categoryCode" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} />
          </FormField>
          <FormField id="categoryName" label="Category name">
            <Input id="categoryName" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!categoryCode.trim() || !categoryName.trim() || createCategoryMutation.isPending}
          onClick={() => createCategoryMutation.mutate()}
        >
          Add room category
        </Button>
        {(categories.data ?? []).length > 0 ? (
          <DataTable
            label="Room categories"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
            ]}
            data={categories.data ?? []}
            keyExtractor={(r) => r.id}
          />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="buildingCode" label="Building code">
            <Input id="buildingCode" value={buildingCode} onChange={(e) => setBuildingCode(e.target.value)} />
          </FormField>
          <FormField id="buildingName" label="Building name">
            <Input id="buildingName" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!buildingCode.trim() || !buildingName.trim() || createBuildingMutation.isPending}
          onClick={() => createBuildingMutation.mutate()}
        >
          Add building
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="roomBuildingId" label="Building">
            <Select id="roomBuildingId" value={roomBuildingId} onChange={(e) => setRoomBuildingId(e.target.value)}>
              <option value="">Select building…</option>
              {(buildings.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="roomCategoryId" label="Room category">
            <Select id="roomCategoryId" value={roomCategoryId} onChange={(e) => setRoomCategoryId(e.target.value)}>
              <option value="">Optional category…</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="roomCapacity" label="Capacity">
            <Input id="roomCapacity" value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)} />
          </FormField>
          <FormField id="roomCode" label="Room code">
            <Input id="roomCode" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
          </FormField>
          <FormField id="roomName" label="Room name">
            <Input id="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={
            !roomBuildingId || !roomCode.trim() || !roomName.trim() || createRoomMutation.isPending
          }
          onClick={() => createRoomMutation.mutate()}
        >
          Add room
        </Button>
        {(rooms.data ?? []).length > 0 ? (
          <DataTable
            label="Rooms"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'buildingCode', header: 'Building' },
              {
                key: 'categoryCode',
                header: 'Category',
                render: (r) => r.categoryCode ?? '—',
              },
              { key: 'capacity', header: 'Cap.', render: (r) => (r.capacity != null ? String(r.capacity) : '—') },
            ]}
            data={rooms.data ?? []}
            keyExtractor={(r) => r.id}
          />
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">No rooms registered yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function RegistrarAcademicPoliciesPanel() {
  const { notify } = useNotification()
  const policies = useQuery({ queryKey: ['reg', 'academic-policies'], queryFn: fetchAcademicPolicies })
  const [gradeDisplayMode, setGradeDisplayMode] = useState<'immediate' | 'after_deadline' | 'manual_release'>(
    'after_deadline'
  )
  const [approvalSteps, setApprovalSteps] = useState('adviser, assessment, registrar')
  const [sigDocType, setSigDocType] = useState('grade_report')
  const [sigRole, setSigRole] = useState('registrar')
  const [sigName, setSigName] = useState('')

  useEffect(() => {
    if (!policies.data) return
    setGradeDisplayMode(policies.data.gradeDisplayMode)
    setApprovalSteps(policies.data.enrollmentApprovalSteps.join(', '))
    const first = policies.data.gradeDocumentSignatories[0]
    if (first) {
      setSigDocType(first.docType)
      setSigRole(first.role)
      setSigName(first.name)
    }
  }, [policies.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAcademicPolicies({
        gradeDisplayMode,
        enrollmentApprovalSteps: approvalSteps
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        gradeDocumentSignatories: sigName.trim()
          ? [{ docType: sigDocType.trim(), role: sigRole.trim(), name: sigName.trim() }]
          : [],
      }),
    onSuccess: () => notify({ tone: 'success', title: 'Academic policies saved' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Policies failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment and grade display (ENR-008)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="approvalSteps" label="Enrollment approval steps (comma-separated)">
          <Input id="approvalSteps" value={approvalSteps} onChange={(e) => setApprovalSteps(e.target.value)} />
        </FormField>
        <FormField id="gradeDisplayMode" label="Grade display mode">
          <Select
            id="gradeDisplayMode"
            value={gradeDisplayMode}
            onChange={(e) =>
              setGradeDisplayMode(e.target.value as 'immediate' | 'after_deadline' | 'manual_release')
            }
          >
            <option value="immediate">Immediate</option>
            <option value="after_deadline">After encoding deadline</option>
            <option value="manual_release">Manual release</option>
          </Select>
        </FormField>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField id="sigDocType" label="Signatory document">
            <Input id="sigDocType" value={sigDocType} onChange={(e) => setSigDocType(e.target.value)} />
          </FormField>
          <FormField id="sigRole" label="Signatory role">
            <Input id="sigRole" value={sigRole} onChange={(e) => setSigRole(e.target.value)} />
          </FormField>
          <FormField id="sigName" label="Signatory name">
            <Input id="sigName" value={sigName} onChange={(e) => setSigName(e.target.value)} />
          </FormField>
        </div>
        <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save policies
        </Button>
      </CardContent>
    </Card>
  )
}

function RegistrarSectionSlotTools(props: { sections: Array<{ id: string; code: string; name: string }> }) {
  const { notify } = useNotification()
  const queryClient = useQueryClient()
  const [sectionId, setSectionId] = useState('')
  const [lineId, setLineId] = useState('')
  const [transferTargetId, setTransferTargetId] = useState('')
  const [dissolveReason, setDissolveReason] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startMinute, setStartMinute] = useState('480')
  const [endMinute, setEndMinute] = useState('570')
  const [roomCode, setRoomCode] = useState('')

  const summary = useQuery({
    queryKey: ['reg', 'section-summary', sectionId],
    queryFn: () => fetchSectionSchedulingSummary(sectionId),
    enabled: Boolean(sectionId),
  })
  const meetings = useQuery({
    queryKey: ['reg', 'section-meetings', sectionId],
    queryFn: () => fetchSectionMeetings(sectionId),
    enabled: Boolean(sectionId),
  })

  const refresh = () => {
    void summary.refetch()
    void meetings.refetch()
    void queryClient.invalidateQueries({ queryKey: ['reg', 'sections'] })
  }

  const addMeetingMutation = useMutation({
    mutationFn: () =>
      addSectionMeeting(sectionId, {
        dayOfWeek: Number(dayOfWeek),
        startMinute: Number(startMinute),
        endMinute: Number(endMinute),
        roomCode: roomCode.trim() || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Meeting slot added' })
      refresh()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Add failed', description: getApiErrorMessage(err) }),
  })

  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: string) => deleteSectionMeeting(meetingId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Meeting removed' })
      refresh()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Remove failed', description: getApiErrorMessage(err) }),
  })

  const dropMutation = useMutation({
    mutationFn: () => dropSectionEnrollmentLine(sectionId, { enrollmentLineId: lineId.trim() }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: data.promotedWaitlistEntryId ? 'Dropped — waitlist promoted' : 'Student dropped from section',
      })
      refresh()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Drop failed', description: getApiErrorMessage(err) }),
  })

  const transferMutation = useMutation({
    mutationFn: () =>
      transferSectionEnrollmentLine(sectionId, {
        enrollmentLineId: lineId.trim(),
        toSectionId: transferTargetId.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Student transferred' })
      refresh()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Transfer failed', description: getApiErrorMessage(err) }),
  })

  const dissolveMutation = useMutation({
    mutationFn: () => dissolveSection(sectionId, dissolveReason.trim() || undefined),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Section dissolved (${data.droppedLines} lines dropped)` })
      refresh()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Dissolve failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Section slot tools (ENR-011)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="slotSection" label="Section">
          <Select id="slotSection" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">Select section…</option>
            {props.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>
        </FormField>
        {sectionId && summary.data ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {summary.data.sectionCode}: {summary.data.seated}/{summary.data.capacity} seated · waitlist{' '}
            {summary.data.waitlistCount}
            {summary.data.waitlistEnabled ? '' : ' (off)'}
          </p>
        ) : null}
        {sectionId ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="slotDay" label="Day (0=Sun)">
                <Input id="slotDay" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} />
              </FormField>
              <FormField id="slotRoom" label="Room code">
                <Input id="slotRoom" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
              </FormField>
              <FormField id="slotStart" label="Start minute">
                <Input id="slotStart" value={startMinute} onChange={(e) => setStartMinute(e.target.value)} />
              </FormField>
              <FormField id="slotEnd" label="End minute">
                <Input id="slotEnd" value={endMinute} onChange={(e) => setEndMinute(e.target.value)} />
              </FormField>
            </div>
            <Button type="button" disabled={addMeetingMutation.isPending} onClick={() => addMeetingMutation.mutate()}>
              Add meeting slot
            </Button>
            {(meetings.data ?? []).length > 0 ? (
              <DataTable
                label="Meeting slots"
                columns={[
                  { key: 'dayOfWeek', header: 'Day' },
                  { key: 'startMinute', header: 'Start' },
                  { key: 'endMinute', header: 'End' },
                  { key: 'roomCode', header: 'Room', render: (r) => r.roomCode ?? '—' },
                  {
                    key: 'id',
                    header: 'Action',
                    render: (r) => (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleteMeetingMutation.isPending}
                        onClick={() => deleteMeetingMutation.mutate(r.id)}
                      >
                        Remove
                      </Button>
                    ),
                  },
                ]}
                data={meetings.data ?? []}
                keyExtractor={(r) => r.id}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No meeting slots yet.</p>
            )}
            <FormField id="enrollmentLineId" label="Enrollment line ID (drop / transfer)">
              <Input id="enrollmentLineId" value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </FormField>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!lineId.trim() || dropMutation.isPending}
                onClick={() => dropMutation.mutate()}
              >
                Drop student
              </Button>
              <FormField id="transferSectionId" label="Transfer to section ID">
                <Input
                  id="transferSectionId"
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                />
              </FormField>
              <Button
                type="button"
                disabled={!lineId.trim() || !transferTargetId.trim() || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
              >
                Transfer student
              </Button>
            </div>
            <FormField id="dissolveReason" label="Dissolve reason">
              <Input id="dissolveReason" value={dissolveReason} onChange={(e) => setDissolveReason(e.target.value)} />
            </FormField>
            <Button
              type="button"
              variant="destructive"
              disabled={dissolveMutation.isPending}
              onClick={() => dissolveMutation.mutate()}
            >
              Dissolve section
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function RegistrarCurriculumPage() {
  return (
    <RequirePermission anyOf={['academic.read']}>
      <RegistrarCurriculumInner />
    </RequirePermission>
  )
}

function RegistrarCurriculumInner() {
  const controls = useListControls()
  const query = useQuery({
    queryKey: ['reg', 'subjects', controls.search],
    queryFn: () => fetchSubjects({ search: controls.search || undefined, limit: 50 }),
  })
  return (
    <QueryPage
      title="Curriculum / subjects"
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

export function RegistrarGradesPage() {
  return (
    <RequirePermission anyOf={['grades.read', 'grades.admin']}>
      <RegistrarGradesInner />
    </RequirePermission>
  )
}

function RegistrarGradesInner() {
  const query = useQuery({ queryKey: ['reg', 'grades'], queryFn: () => fetchGrades({ limit: 50 }) })
  return (
    <QueryPage title="Grade monitoring" query={query} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <DataTable
          label="Grades"
          columns={[
            { key: 'courseCode', header: 'Code' },
            { key: 'courseTitle', header: 'Course' },
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

export function RegistrarRequirementsPage() {
  return (
    <RequirePermission anyOf={['deficiencies.read']}>
      <RegistrarRequirementsInner />
    </RequirePermission>
  )
}

function RegistrarRequirementsInner() {
  const query = useQuery({ queryKey: ['reg', 'deficiencies'], queryFn: () => fetchDeficiencies() })
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

const registerSchema = z.object({
  enrollmentId: z.string().uuid('Enrollment ID is required'),
})

export function RegistrarRegistrationPage() {
  return (
    <RequirePermission anyOf={['enrollments.write']}>
      <RegistrarRegistrationInner />
    </RequirePermission>
  )
}

function RegistrarRegistrationInner() {
  const { notify } = useNotification()
  const queryClient = useQueryClient()
  const policies = useQuery({ queryKey: ['reg', 'academic-policies'], queryFn: fetchAcademicPolicies })
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  })
  const enrollmentId = form.watch('enrollmentId')?.trim()
  const enrollmentQuery = useQuery({
    queryKey: ['reg', 'enrollment', enrollmentId],
    queryFn: () => fetchEnrollment(enrollmentId!),
    enabled: Boolean(enrollmentId && z.string().uuid().safeParse(enrollmentId).success),
  })

  const registerMutation = useMutation({
    mutationFn: (values: z.infer<typeof registerSchema>) => registerEnrollment(values.enrollmentId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Enrollment registered' })
      void queryClient.invalidateQueries({ queryKey: ['reg', 'enrollment', enrollmentId] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Registration failed', description: getApiErrorMessage(err) }),
  })
  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyEnrollmentPayment(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Payment verified' })
      void queryClient.invalidateQueries({ queryKey: ['reg', 'enrollment', enrollmentId] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Payment verify failed', description: getApiErrorMessage(err) }),
  })
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRegistrarEnrollment(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Registrar approval recorded' })
      void queryClient.invalidateQueries({ queryKey: ['reg', 'enrollment', enrollmentId] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Registrar approve failed', description: getApiErrorMessage(err) }),
  })

  const enrollment = enrollmentQuery.data
  const steps = policies.data?.enrollmentApprovalSteps ?? []
  const registrarStepEnabled = steps.includes('registrar')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration workflow (ENR-008)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {policies.data ? (
          <Alert tone="info">
            Configured approval steps: {steps.join(' → ')}
            {registrarStepEnabled ? '' : ' (registrar step off — approve button optional)'}
          </Alert>
        ) : null}
        <form className="grid max-w-md gap-3" onSubmit={form.handleSubmit((v) => registerMutation.mutate(v))}>
          <FormField id="enrollmentId" label="Enrollment ID" error={form.formState.errors.enrollmentId?.message} required>
            <Input id="enrollmentId" {...form.register('enrollmentId')} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!enrollmentId || verifyMutation.isPending} onClick={() => verifyMutation.mutate(enrollmentId!)}>
              Verify payment
            </Button>
            <Button type="button" variant="secondary" disabled={!enrollmentId || approveMutation.isPending} onClick={() => approveMutation.mutate(enrollmentId!)}>
              Registrar approve
            </Button>
            <Button type="submit" disabled={registerMutation.isPending}>
              Register enrollment
            </Button>
          </div>
        </form>
        {enrollmentQuery.isFetching ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading enrollment…</p>
        ) : enrollment ? (
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
            <p>
              <span className="font-medium">Status:</span> {String(enrollment.status)}
            </p>
            <p>
              <span className="font-medium">Payment verified:</span>{' '}
              {enrollment.paymentVerified ? 'yes' : 'no'}
            </p>
            <p>
              <span className="font-medium">Registrar approved:</span>{' '}
              {enrollment.registrarApprovedAt ? 'yes' : 'no'}
            </p>
          </div>
        ) : enrollmentId && enrollmentQuery.isError ? (
          <Alert tone="danger">Could not load enrollment for this ID.</Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

const announcementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(1),
  audienceRoles: z.string().optional(),
})

export function RegistrarAnnouncementsPage() {
  return (
    <RequirePermission anyOf={['announcements.read', 'announcements.write']}>
      <RegistrarAnnouncementsInner />
    </RequirePermission>
  )
}

function RegistrarAnnouncementsInner() {
  const controls = useListControls()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['reg', 'announcements', controls.page],
    queryFn: () => fetchAnnouncements({ page: controls.page, limit: 20 }),
  })
  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', body: '', audienceRoles: 'student' },
  })
  const create = useMutation({
    mutationFn: (values: z.infer<typeof announcementSchema>) => {
      const roles = values.audienceRoles
        ? values.audienceRoles.split(',').map((r) => r.trim()).filter(Boolean)
        : undefined
      return createAnnouncement({
        title: values.title,
        body: values.body,
        publishNow: true,
        isPinned: false,
        audience: roles?.length ? { roles } : {},
        deliverPortal: true,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Announcement published to portal' })
      form.reset({ title: '', body: '', audienceRoles: 'student' })
      qc.invalidateQueries({ queryKey: ['reg', 'announcements'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Could not publish', description: getApiErrorMessage(err) }),
  })
  const smsDispatch = useMutation({
    mutationFn: (id: string) => dispatchAnnouncement(id, ['sms']),
    onSuccess: (result) => {
      const channels = (result as { channels?: Array<{ recipientCount: number; status: string }> })?.channels
      const count = channels?.[0]?.recipientCount ?? 0
      notify({ tone: 'success', title: 'SMS dispatch queued', description: `${count} recipients` })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'SMS dispatch failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Announcements</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Publish institutional notices to the student portal. Email and SMS batches queue for delivery integration (ENR-035, ENR-051).
      </p>
      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-xl gap-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
            <FormField id="title" label="Title" error={form.formState.errors.title?.message} required>
              <Input id="title" {...form.register('title')} />
            </FormField>
            <FormField id="body" label="Message" error={form.formState.errors.body?.message} required>
              <Input id="body" {...form.register('body')} />
            </FormField>
            <FormField id="audienceRoles" label="Audience roles (comma-separated)" error={form.formState.errors.audienceRoles?.message}>
              <Input id="audienceRoles" placeholder="student, faculty" {...form.register('audienceRoles')} />
            </FormField>
            <Button type="submit" disabled={create.isPending}>Publish to portal</Button>
          </form>
        </CardContent>
      </Card>
      <QueryPage title="Published announcements" query={list} isEmpty={(d) => d.data.length === 0}>
        {(page) => (
          <DataTable
            label="Announcements"
            columns={[
              { key: 'title', header: 'Title', render: (r) => r.title },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={smsDispatch.isPending}
                    onClick={() => smsDispatch.mutate(r.id)}
                  >
                    Queue SMS
                  </Button>
                ),
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

export function RegistrarFacultyEvalPage() {
  return (
    <RequirePermission anyOf={['faculty_eval.read', 'faculty_eval.write']}>
      <RegistrarFacultyEvalInner />
    </RequirePermission>
  )
}

function RegistrarFacultyEvalInner() {
  const { notify } = useNotification()
  const codes = useQuery({ queryKey: ['reg', 'faculty-eval', 'codes'], queryFn: () => fetchFacultyEvalCodes() })
  const questions = useQuery({ queryKey: ['reg', 'faculty-eval', 'questions'], queryFn: () => fetchFacultyEvalQuestions() })
  const options = useQuery({ queryKey: ['reg', 'faculty-eval', 'options'], queryFn: () => fetchFacultyEvalAssignmentOptions() })
  const [lastScheduleId, setLastScheduleId] = useState<string | null>(null)
  const [report, setReport] = useState<{ totalResponses: number; schedule: { title: string } } | null>(null)

  const codeForm = useForm<{ code: string; name: string }>({
    resolver: zodResolver(z.object({ code: z.string().min(2), name: z.string().min(2) })),
    defaultValues: { code: 'MIDTERM', name: 'Midterm faculty evaluation' },
  })
  const questionForm = useForm<{ prompt: string }>({
    resolver: zodResolver(z.object({ prompt: z.string().min(3) })),
    defaultValues: { prompt: 'The instructor explains lessons clearly.' },
  })
  const scheduleForm = useForm<{ title: string; optionIndex: string }>({
    defaultValues: { title: 'Faculty evaluation period', optionIndex: '0' },
  })

  const createCode = useMutation({
    mutationFn: (v: { code: string; name: string }) => createFacultyEvalCode(v),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Evaluation code saved' })
      codes.refetch()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Save failed', description: getApiErrorMessage(err) }),
  })
  const createQuestion = useMutation({
    mutationFn: (v: { prompt: string }) => createFacultyEvalQuestion(v),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Question added to databank' })
      questions.refetch()
    },
    onError: (err) => notify({ tone: 'danger', title: 'Save failed', description: getApiErrorMessage(err) }),
  })
  const createSchedule = useMutation({
    mutationFn: async (v: { title: string; optionIndex: string }) => {
      const codeRows = codes.data ?? []
      const questionRows = questions.data ?? []
      const optRows = options.data ?? []
      if (!codeRows.length || !questionRows.length || !optRows.length) {
        throw new Error('Add at least one evaluation code, question, and faculty assignment first')
      }
      const pick = optRows[Number(v.optionIndex)] ?? optRows[0]
      return createFacultyEvalSchedule({
        title: v.title,
        evalCodeId: codeRows[0].id,
        questionIds: questionRows.slice(0, 5).map((q) => q.id),
        openNow: true,
        targets: [
          {
            facultyUserId: pick.facultyUserId,
            sectionId: pick.sectionId,
            subjectCode: pick.subjectCode ?? pick.sectionCode ?? undefined,
            subjectTitle: pick.subjectTitle ?? undefined,
          },
        ],
      })
    },
    onSuccess: (row) => {
      notify({ tone: 'success', title: 'Evaluation schedule opened' })
      setLastScheduleId(row.id)
    },
    onError: (err) => notify({ tone: 'danger', title: 'Schedule failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Faculty evaluation</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Question databank, evaluation codes, schedules, and aggregate reports (ENR-050).
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Evaluation code</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-2" onSubmit={codeForm.handleSubmit((v) => createCode.mutate(v))}>
              <FormField id="evalCode" label="Code" required><Input id="evalCode" {...codeForm.register('code')} /></FormField>
              <FormField id="evalName" label="Name" required><Input id="evalName" {...codeForm.register('name')} /></FormField>
              <Button type="submit" disabled={createCode.isPending}>Save code</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Question databank</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-2" onSubmit={questionForm.handleSubmit((v) => createQuestion.mutate(v))}>
              <FormField id="prompt" label="Question" required><Input id="prompt" {...questionForm.register('prompt')} /></FormField>
              <Button type="submit" disabled={createQuestion.isPending}>Add question</Button>
            </form>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{questions.data?.length ?? 0} active questions</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Open schedule</CardTitle></CardHeader>
        <CardContent>
          <form className="grid max-w-xl gap-2" onSubmit={scheduleForm.handleSubmit((v) => createSchedule.mutate(v))}>
            <FormField id="schedTitle" label="Schedule title"><Input id="schedTitle" {...scheduleForm.register('title')} /></FormField>
            <FormField id="assignPick" label="Faculty / section target">
              <Select id="assignPick" {...scheduleForm.register('optionIndex')}>
                {(options.data ?? []).map((o, idx) => (
                  <option key={`${o.facultyUserId}-${o.sectionId}-${idx}`} value={String(idx)}>
                    {o.facultyName} · {o.sectionCode ?? o.sectionId}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="submit" disabled={createSchedule.isPending}>Open evaluation now</Button>
          </form>
          {lastScheduleId ? (
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              onClick={async () => {
                const data = await fetchFacultyEvalReport(lastScheduleId)
                setReport(data)
              }}
            >
              Load aggregate report
            </Button>
          ) : null}
          {report ? (
            <Alert className="mt-3" variant="success" title={report.schedule.title}>
              {report.totalResponses} anonymized responses recorded
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export { UsisReportsPage as RegistrarReportsPage } from '@/features/reports/pages/usis-reports-page'
