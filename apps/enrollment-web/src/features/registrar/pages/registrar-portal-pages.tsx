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
  SearchableSelect,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage, useListControls } from '@/components/query-page'
import { ApplicantSearchSelect } from '@/components/applicant-search-select'
import { StudentSearchSelect } from '@/components/student-search-select'
import { EnrollmentWorkflowPanel } from '@/components/enrollment-workflow-panel'
import { usePaginatedQuery } from '@/lib/list-query'
import { RequirePermission } from '@/components/auth/require-permission'
import { useHasPermission } from '@/lib/permissions'
import { getApiErrorMessage } from '@/lib/api-client'
import { SAMPLE_ENTRANCE_EXAM_BANK } from '@/features/admissions/entrance-exam-sample-bank'
import {
  admitApplicant,
  fetchAdmissionForms,
  fetchActiveAdmissionForm,
  createAdmissionForm,
  updateAdmissionForm,
  applyOnlineAdmission,
  fetchAdmissionEvents,
  createAdmissionEvent,
  updateAdmissionEvent,
  assignApplicantToEvent,
  recordAdmissionEventResult,
  fetchApplicantStatusHistory,
  archiveAnnouncement,
  createAnnouncement,
  closeFacultyEvalSchedule,
  closeSurvey,
  createFacultyEvalCode,
  createFacultyEvalQuestion,
  createFacultyEvalSchedule,
  createSurvey,
  dispatchAnnouncement,
  exportFacultyEvalReport,
  fetchAcademicYears,
  fetchAnnouncementSettings,
  fetchAnnouncements,
  fetchFacultyEvalAssignmentOptions,
  fetchFacultyEvalSchedules,
  fetchMassSmsCampaigns,
  fetchSurveyResults,
  fetchSurveys,
  openFacultyEvalSchedule,
  previewMassSms,
  publishAnnouncement,
  publishSurvey,
  queueMassSms,
  updateAnnouncement,
  updateAnnouncementSettings,
  fetchFacultyEvalCodes,
  fetchFacultyEvalQuestions,
  fetchFacultyEvalReport,
  type FacultyEvalReport,
  fetchApplicants,
  fetchDeficiencies,
  createStudentRequirement,
  submitStudentRequirement,
  approveStudentRequirement,
  rejectStudentRequirement,
  clearStudentRequirement,
  deleteStudentRequirement,
  fetchRequirementsComplianceReport,
  fetchStudentAccountMonitor,
  fetchStudentProfile,
  computeStudentGwa,
  recordStudentViolation,
  issueRegistrationDocument,
  fetchEnrollments,
  fetchGrades,
  fetchPrograms,
  updateProgram,
  deleteProgram,
  fetchSections,
  patchSection,
  deleteSection,
  updateAcademicYear,
  deleteAcademicYear,
  fetchSectionMeetings,
  fetchSectionRoster,
  fetchSectionSchedulingSummary,
  fetchSectionWaitlist,
  promoteSectionWaitlist,
  checkMeetingSlotConflicts,
  reviewStoredSectionConflicts,
  addSectionMeeting,
  deleteSectionMeeting,
  updateSectionMeeting,
  dropSectionEnrollmentLine,
  transferSectionEnrollmentLine,
  dissolveSection,
  encodeBlockGroup,
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
  fetchColleges,
  createCollege,
  fetchAcademicDepartments,
  createAcademicDepartment,
  fetchPositions,
  createPosition,
  fetchSubjectAreas,
  createSubjectArea,
  fetchEmployeeAssignments,
  createEmployeeAssignment,
  fetchStudents,
  fetchStudentClassifications,
  updateStudentProfile,
  fetchStudentMergeJobs,
  mergeStudentAccounts,
  updateApplicant,
  importStudentsBulk,
  fetchStudentImportBatches,
  downloadStudentImportRejectionCsv,
  fetchStudentCurriculumEvaluation,
  fetchStudentSubjectCredits,
  autoCreditInternalSubjects,
  submitExternalSubjectCredit,
  reviewSubjectCredit,
  applySubjectEquivalencies,
  fetchSubjectEquivalencies,
  createSubjectEquivalency,
  fetchSubjects,
  createSubject,
  updateSubjectCatalog,
  deleteSubject,
  fetchSubjectPrerequisites,
  addSubjectPrerequisite,
  removeSubjectPrerequisite,
  fetchCurricula,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  duplicateCurriculumVersion,
  activateCurriculumVersion,
  fetchCurriculumVersionSubjects,
  addCurriculumVersionSubject,
  removeCurriculumVersionSubject,
  fetchEnrollment,
  fetchEnrollmentWorkflow,
  registerEnrollment,
  assessEnrollment,
  syncAssessmentPayment,
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
  const applicants = useQuery({
    queryKey: ['reg', 'applicants'],
    queryFn: () => fetchApplicants({ limit: 50 }),
  })
  const students = useQuery({
    queryKey: ['reg', 'students'],
    queryFn: () => fetchStudents({ limit: 50 }),
  })
  const enrollments = useQuery({
    queryKey: ['reg', 'enrollments'],
    queryFn: () => fetchEnrollments({ limit: 50 }),
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Registrar portal
      </h1>
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
  const query = usePaginatedQuery({
    queryKey: ['reg', 'applicants', controls.debouncedSearch, controls.page],
    queryFn: () =>
      fetchApplicants({
        search: controls.debouncedSearch || undefined,
        page: controls.page,
        limit: controls.pageSize,
      }),
  })
  const classifications = useQuery({
    queryKey: ['reg', 'student-classifications'],
    queryFn: fetchStudentClassifications,
  })
  const admit = useMutation({
    mutationFn: (id: string) => admitApplicant(id, `STU-${Date.now().toString().slice(-8)}`),
    onSuccess: (result) => {
      const notice = (result as { accountNotice?: { sent?: boolean; to?: string | null; reason?: string | null } })
        .accountNotice
      notify({
        tone: 'success',
        title: 'Applicant admitted',
        description: notice?.sent
          ? `Account email sent to ${notice.to}`
          : `Student record created. Account email was not sent${notice?.reason ? `: ${notice.reason}` : ''}.`,
      })
      void qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'students'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'enrollments'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Admit failed', description: getApiErrorMessage(err) }),
  })
  const classify = useMutation({
    mutationFn: ({ id, classification }: { id: string; classification: string }) =>
      updateApplicant(id, { classification }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Applicant classification saved' })
      void qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Classification update failed',
        description: getApiErrorMessage(err),
      }),
  })

  return (
    <div className="space-y-6">
      <Alert variant="info" title="Applicant → student pipeline">
        Guests stay on this Applicants list until you Admit them. Status{' '}
        <strong>under_review</strong> (after entrance exam / requirements) is ready for Admit. Only
        after Admit do they appear under Student records and Enrollment management. Admit
        emails the application address with the student number, sign-in email, and temporary
        password when a new account is issued.
      </Alert>
      <RegistrarAdmissionFormPanel />
      <RegistrarAdmissionEventsPanel />
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
              {
                key: 'classification',
                header: 'Classification',
                render: (r) => (
                  <Select
                    id={`app-class-${r.id}`}
                    value={r.classification ?? ''}
                    onChange={(e) => classify.mutate({ id: r.id, classification: e.target.value })}
                  >
                    <option value="">Unset</option>
                    {(classifications.data ?? []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                ),
              },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) =>
                  r.status === 'pending' ||
                  r.status === 'scheduled' ||
                  r.status === 'under_review' ? (
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
    </div>
  )
}

function RegistrarAdmissionFormPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const forms = useQuery({ queryKey: ['reg', 'admission-forms'], queryFn: fetchAdmissionForms })
  const active = useQuery({
    queryKey: ['reg', 'admission-form-active'],
    queryFn: fetchActiveAdmissionForm,
  })

  const [version, setVersion] = useState('2026.1')
  const [name, setName] = useState('Undergraduate application')
  const [termsText, setTermsText] = useState(
    'I certify that the information provided is true and complete.'
  )
  const [privacyText, setPrivacyText] = useState(
    'I consent to the processing of my personal data for admissions purposes under applicable data-privacy rules.'
  )
  const [applyFirst, setApplyFirst] = useState('')
  const [applyLast, setApplyLast] = useState('')
  const [applyEmail, setApplyEmail] = useState('')
  const [surveyAnswer, setSurveyAnswer] = useState('')
  const [termsOk, setTermsOk] = useState(false)
  const [privacyOk, setPrivacyOk] = useState(false)

  const publishMutation = useMutation({
    mutationFn: () =>
      createAdmissionForm({
        version: version.trim(),
        name: name.trim(),
        formFields: [
          { key: 'address', label: 'Home address', type: 'textarea', required: false },
          { key: 'guardianName', label: 'Guardian / parent name', type: 'text', required: false },
        ],
        surveyQuestions: [
          { key: 'howHeard', prompt: 'How did you learn about WMSU?', required: true },
        ],
        termsText: termsText.trim(),
        privacyConsentText: privacyText.trim(),
        isActive: true,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Admission form published' })
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-forms'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-form-active'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Form publish failed',
        description: getApiErrorMessage(err),
      }),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => updateAdmissionForm(id, { isActive: true }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Form activated' })
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-forms'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-form-active'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Activate failed', description: getApiErrorMessage(err) }),
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      applyOnlineAdmission({
        orgCode: 'UNI',
        firstName: applyFirst.trim(),
        lastName: applyLast.trim(),
        email: applyEmail.trim(),
        surveyAnswers: { howHeard: surveyAnswer.trim() },
        formAnswers: {},
        termsAccepted: termsOk,
        privacyConsentAccepted: privacyOk,
      }),
    onSuccess: (row) => {
      notify({
        tone: 'success',
        title: 'Online application submitted',
        description: `${row.applicationNumber} · consent ${row.privacyConsentVersion ?? 'n/a'}`,
      })
      setApplyFirst('')
      setApplyLast('')
      setApplyEmail('')
      setSurveyAnswer('')
      setTermsOk(false)
      setPrivacyOk(false)
      void qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Apply failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission form & consent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Publish a configurable application form with survey questions, terms, and data-privacy
          consent. Staff admit flow is unchanged; online apply requires consent against the active
          form. Guest portal:{' '}
          <a className="underline" href="/apply" target="_blank" rel="noreferrer">
            /apply
          </a>
          ,{' '}
          <a className="underline" href="/apply/start" target="_blank" rel="noreferrer">
            /apply/start
          </a>
          ,{' '}
          <a className="underline" href="/apply/exam" target="_blank" rel="noreferrer">
            /apply/exam
          </a>
          ,{' '}
          <a className="underline" href="/apply/status" target="_blank" rel="noreferrer">
            /apply/status
          </a>
          .
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="formVersion" label="Form version">
            <Input id="formVersion" value={version} onChange={(e) => setVersion(e.target.value)} />
          </FormField>
          <FormField id="formName" label="Form name">
            <Input id="formName" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField id="termsText" label="Terms and agreements">
            <Input
              id="termsText"
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
            />
          </FormField>
          <FormField id="privacyText" label="Privacy consent text">
            <Input
              id="privacyText"
              value={privacyText}
              onChange={(e) => setPrivacyText(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!version.trim() || !name.trim() || publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          Publish active form
        </Button>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Active form:{' '}
            {active.data ? `${active.data.version} — ${active.data.name}` : 'none published'}
          </h3>
          <DataTable
            label="Admission forms"
            columns={[
              { key: 'version', header: 'Version' },
              { key: 'name', header: 'Name' },
              {
                key: 'isActive',
                header: 'Active',
                render: (r) => (r.isActive ? 'yes' : 'no'),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) =>
                  r.isActive ? (
                    '—'
                  ) : (
                    <Button type="button" size="sm" onClick={() => activateMutation.mutate(r.id)}>
                      Activate
                    </Button>
                  ),
              },
            ]}
            data={forms.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>

        {active.data ? (
          <div className="space-y-3 rounded-md border border-border p-4">
            <h3 className="text-sm font-semibold">Online application (consent required)</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField id="applyFirst" label="First name">
                <Input
                  id="applyFirst"
                  value={applyFirst}
                  onChange={(e) => setApplyFirst(e.target.value)}
                />
              </FormField>
              <FormField id="applyLast" label="Last name">
                <Input
                  id="applyLast"
                  value={applyLast}
                  onChange={(e) => setApplyLast(e.target.value)}
                />
              </FormField>
              <FormField id="applyEmail" label="Email">
                <Input
                  id="applyEmail"
                  type="email"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                />
              </FormField>
            </div>
            {(active.data.surveyQuestions ?? []).map((q) => (
              <FormField key={q.key} id={`survey-${q.key}`} label={q.prompt}>
                <Input
                  id={`survey-${q.key}`}
                  value={surveyAnswer}
                  onChange={(e) => setSurveyAnswer(e.target.value)}
                />
              </FormField>
            ))}
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {active.data.termsText}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={termsOk}
                onChange={(e) => setTermsOk(e.target.checked)}
              />
              Accept terms and agreements
            </label>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {active.data.privacyConsentText}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={privacyOk}
                onChange={(e) => setPrivacyOk(e.target.checked)}
              />
              Capture data-privacy consent
            </label>
            <Button
              type="button"
              disabled={
                !applyFirst.trim() ||
                !applyLast.trim() ||
                !applyEmail.trim() ||
                !termsOk ||
                !privacyOk ||
                applyMutation.isPending
              }
              onClick={() => applyMutation.mutate()}
            >
              Submit online application
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RegistrarAdmissionEventsPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const events = useQuery({
    queryKey: ['reg', 'admission-events'],
    queryFn: () => fetchAdmissionEvents(),
  })

  const [eventType, setEventType] = useState<'entrance_exam' | 'interview' | 'assessment'>(
    'entrance_exam'
  )
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('40')
  const [deliveryMode, setDeliveryMode] = useState<'onsite' | 'online' | 'hybrid'>('online')
  const [passScore, setPassScore] = useState('70')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [questionsJson, setQuestionsJson] = useState(
    JSON.stringify(
      [
        {
          id: 'stem-1',
          prompt: 'What is the value of 7 × 8?',
          choices: ['54', '56', '63', '64'],
          correctIndex: 1,
          strandTag: 'STEM',
        },
        {
          id: 'abm-1',
          prompt: 'Profit is best described as…',
          choices: ['Total assets', 'Revenue minus expenses', 'Owner capital only', 'Cash in bank'],
          correctIndex: 1,
          strandTag: 'ABM',
        },
        {
          id: 'humss-1',
          prompt: 'Psychology is best described as the study of…',
          choices: [
            'Rocks and minerals',
            'Behavior and mental processes',
            'Tax ledgers',
            'Circuit boards',
          ],
          correctIndex: 1,
          strandTag: 'HUMSS',
        },
        {
          id: 'gas-1',
          prompt: 'Critical thinking means…',
          choices: [
            'Accepting every claim without evidence',
            'Analyzing information carefully before deciding',
            'Memorizing only formulas',
            'Avoiding all reading',
          ],
          correctIndex: 1,
          strandTag: 'GAS',
        },
      ],
      null,
      2
    )
  )
  const [draftPrompt, setDraftPrompt] = useState('')
  const [draftChoices, setDraftChoices] = useState('A | B | C | D')
  const [draftCorrect, setDraftCorrect] = useState('0')
  const [draftStrand, setDraftStrand] = useState<'ABM' | 'STEM' | 'HUMSS' | 'GAS' | 'general'>(
    'STEM'
  )
  const [eventId, setEventId] = useState('')
  const [applicantId, setApplicantId] = useState('')
  const [resultValue, setResultValue] = useState<'pass' | 'fail' | 'waived' | 'pending'>('pass')
  const [score, setScore] = useState('')
  const [historyApplicantId, setHistoryApplicantId] = useState('')

  const history = useQuery({
    queryKey: ['reg', 'applicant-status-history', historyApplicantId],
    queryFn: () => fetchApplicantStatusHistory(historyApplicantId),
    enabled: !!historyApplicantId,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const onlineCapable = deliveryMode === 'online' || deliveryMode === 'hybrid'
      let questions:
        Array<{ id: string; prompt: string; choices: string[]; correctIndex: number }> | undefined
      if (onlineCapable && eventType === 'entrance_exam') {
        questions = JSON.parse(questionsJson) as Array<{
          id: string
          prompt: string
          choices: string[]
          correctIndex: number
        }>
      }
      return createAdmissionEvent({
        eventType,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: location.trim() || undefined,
        capacity: Number(capacity) || undefined,
        deliveryMode,
        passScore: onlineCapable ? Number(passScore) || 70 : undefined,
        durationMinutes: onlineCapable ? Number(durationMinutes) || 60 : undefined,
        questions,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Admission event scheduled' })
      setTitle('')
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-events'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Schedule failed', description: getApiErrorMessage(err) }),
  })

  const publishQuestionsMutation = useMutation({
    mutationFn: () => {
      const questions = JSON.parse(questionsJson) as Array<{
        id: string
        prompt: string
        choices: string[]
        correctIndex: number
      }>
      return updateAdmissionEvent(eventId, {
        deliveryMode,
        passScore: Number(passScore) || 70,
        durationMinutes: Number(durationMinutes) || 60,
        questions,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Online exam instrument updated' })
      void qc.invalidateQueries({ queryKey: ['reg', 'admission-events'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Instrument update failed',
        description: getApiErrorMessage(err),
      }),
  })

  const assignMutation = useMutation({
    mutationFn: () => assignApplicantToEvent({ eventId, applicantId }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Applicant assigned to event' })
      void qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
      if (historyApplicantId)
        void qc.invalidateQueries({ queryKey: ['reg', 'applicant-status-history'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Assign failed', description: getApiErrorMessage(err) }),
  })

  const resultMutation = useMutation({
    mutationFn: () =>
      recordAdmissionEventResult({
        eventId,
        applicantId,
        result: resultValue,
        score: score.trim() ? Number(score) : undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Result recorded' })
      void qc.invalidateQueries({ queryKey: ['reg', 'applicants'] })
      if (historyApplicantId)
        void qc.invalidateQueries({ queryKey: ['reg', 'applicant-status-history'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Result failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exams, interviews & assessments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Schedule entrance examinations, interviews, and assessments; publish online exam questions
          for the guest portal (`/apply/exam`); assign applicants; record onsite results; and track
          status through to admission.
        </p>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <FormField id="eventType" label="Type">
            <Select
              id="eventType"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as typeof eventType)}
            >
              <option value="entrance_exam">Entrance exam</option>
              <option value="interview">Interview</option>
              <option value="assessment">Assessment</option>
            </Select>
          </FormField>
          <FormField id="eventTitle" label="Title">
            <Input id="eventTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField id="eventWhen" label="Scheduled at">
            <Input
              id="eventWhen"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </FormField>
          <FormField id="eventLocation" label="Location / venue">
            <Input
              id="eventLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormField>
          <FormField id="eventCapacity" label="Capacity">
            <Input
              id="eventCapacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </FormField>
          <FormField id="eventDelivery" label="Delivery">
            <Select
              id="eventDelivery"
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as typeof deliveryMode)}
            >
              <option value="online">Online (guest portal)</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite only</option>
            </Select>
          </FormField>
        </div>

        {eventType === 'entrance_exam' && deliveryMode !== 'onsite' ? (
          <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-border)] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="passScore" label="Pass score (%)">
                <Input
                  id="passScore"
                  value={passScore}
                  onChange={(e) => setPassScore(e.target.value)}
                />
              </FormField>
              <FormField id="durationMinutes" label="Duration (minutes)">
                <Input
                  id="durationMinutes"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setQuestionsJson(JSON.stringify(SAMPLE_ENTRANCE_EXAM_BANK, null, 2))}
              >
                Load sample questionnaire (strand-tagged)
              </Button>
              <label className="inline-flex cursor-pointer items-center rounded-xl bg-[var(--color-wmsu-navy)] px-4 text-sm font-semibold text-white">
                Upload JSON / CSV
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const text = await file.text()
                      if (file.name.toLowerCase().endsWith('.csv')) {
                        const lines = text
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean)
                        const rows = lines.slice(1).map((line, index) => {
                          const parts = line.split(',').map((p) => p.trim())
                          return {
                            id: parts[0] || `q${index + 1}`,
                            prompt: parts[1] || '',
                            choices: [parts[2], parts[3], parts[4], parts[5]].filter(Boolean),
                            correctIndex: Number(parts[6] || 0),
                            strandTag: (parts[7] || 'general').toUpperCase(),
                          }
                        })
                        setQuestionsJson(JSON.stringify(rows, null, 2))
                      } else {
                        const parsed = JSON.parse(text)
                        setQuestionsJson(JSON.stringify(parsed, null, 2))
                      }
                      notify({ tone: 'success', title: `Loaded ${file.name}` })
                    } catch (err) {
                      notify({
                        tone: 'danger',
                        title: 'Upload failed',
                        description: err instanceof Error ? err.message : 'Invalid file',
                      })
                    } finally {
                      e.target.value = ''
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-white/70 p-3 md:grid-cols-2">
              <FormField id="draftPrompt" label="Add question — prompt">
                <Input
                  id="draftPrompt"
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  placeholder="Question text"
                />
              </FormField>
              <FormField id="draftChoices" label="Choices (separated by | )">
                <Input
                  id="draftChoices"
                  value={draftChoices}
                  onChange={(e) => setDraftChoices(e.target.value)}
                />
              </FormField>
              <FormField id="draftCorrect" label="Correct choice index (0-based)">
                <Input
                  id="draftCorrect"
                  value={draftCorrect}
                  onChange={(e) => setDraftCorrect(e.target.value)}
                />
              </FormField>
              <FormField id="draftStrand" label="Strand tag (for suggestion scoring)">
                <Select
                  id="draftStrand"
                  value={draftStrand}
                  onChange={(e) => setDraftStrand(e.target.value as typeof draftStrand)}
                >
                  <option value="STEM">STEM</option>
                  <option value="ABM">ABM</option>
                  <option value="HUMSS">HUMSS</option>
                  <option value="GAS">GAS</option>
                  <option value="general">general</option>
                </Select>
              </FormField>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!draftPrompt.trim()}
                  onClick={() => {
                    try {
                      const current = JSON.parse(questionsJson) as Array<Record<string, unknown>>
                      const choices = draftChoices
                        .split('|')
                        .map((c) => c.trim())
                        .filter(Boolean)
                      current.push({
                        id: `q-${Date.now()}`,
                        prompt: draftPrompt.trim(),
                        choices,
                        correctIndex: Number(draftCorrect) || 0,
                        strandTag: draftStrand,
                      })
                      setQuestionsJson(JSON.stringify(current, null, 2))
                      setDraftPrompt('')
                      notify({ tone: 'success', title: 'Question added to instrument' })
                    } catch {
                      notify({ tone: 'danger', title: 'Fix JSON before adding a question' })
                    }
                  }}
                >
                  Add question to instrument
                </Button>
              </div>
            </div>

            <FormField id="examQuestions" label="Exam instrument JSON (editable)">
              <textarea
                id="examQuestions"
                className="min-h-40 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 font-mono text-xs"
                value={questionsJson}
                onChange={(e) => setQuestionsJson(e.target.value)}
              />
            </FormField>
            <p className="text-xs text-muted-foreground">
              Each item needs `id`, `prompt`, `choices[]`, `correctIndex`, and optional `strandTag`
              (`ABM` / `STEM` / `HUMSS` / `GAS` / `general`). Guests never see `correctIndex`. After
              the exam, correct answers by strand suggest an Academic Track strand.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!title.trim() || !scheduledAt || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Schedule event
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!eventId || publishQuestionsMutation.isPending}
            onClick={() => publishQuestionsMutation.mutate()}
          >
            Update selected event instrument
          </Button>
        </div>

        <DataTable
          label="Admission events"
          columns={[
            { key: 'eventType', header: 'Type' },
            { key: 'title', header: 'Title' },
            {
              key: 'scheduledAt',
              header: 'When',
              render: (r) => (r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : '—'),
            },
            {
              key: 'deliveryMode',
              header: 'Mode',
              render: (r) => r.deliveryMode || 'onsite',
            },
            {
              key: 'questionCount',
              header: 'Items',
              render: (r) => r.questionCount ?? r.questions?.length ?? 0,
            },
            { key: 'location', header: 'Location', render: (r) => r.location || '—' },
            { key: 'capacity', header: 'Cap', render: (r) => r.capacity ?? '—' },
          ]}
          data={events.data ?? []}
          keyExtractor={(r) => r.id}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <FormField id="assignEvent" label="Event">
            <Select id="assignEvent" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select event</option>
              {(events.data ?? []).map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.eventType} — {ev.title}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="assignApplicant" label="Applicant">
            <ApplicantSearchSelect
              id="assignApplicant"
              value={applicantId}
              onChange={setApplicantId}
            />
          </FormField>
          <FormField id="resultValue" label="Result">
            <Select
              id="resultValue"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value as typeof resultValue)}
            >
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="waived">Waived</option>
              <option value="pending">Pending</option>
            </Select>
          </FormField>
          <FormField id="resultScore" label="Score (optional)">
            <Input id="resultScore" value={score} onChange={(e) => setScore(e.target.value)} />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!eventId || !applicantId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Assign applicant
          </Button>
          <Button
            type="button"
            disabled={!eventId || !applicantId || resultMutation.isPending}
            onClick={() => resultMutation.mutate()}
          >
            Record result
          </Button>
        </div>

        <div className="space-y-3">
          <FormField id="historyApplicant" label="Status history applicant">
            <ApplicantSearchSelect
              id="historyApplicant"
              value={historyApplicantId}
              onChange={setHistoryApplicantId}
            />
          </FormField>
          {historyApplicantId ? (
            <DataTable
              label="Status history"
              columns={[
                { key: 'fromStatus', header: 'From', render: (r) => r.fromStatus || '—' },
                { key: 'toStatus', header: 'To' },
                { key: 'note', header: 'Note', render: (r) => r.note || '—' },
                {
                  key: 'createdAt',
                  header: 'When',
                  render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'),
                },
              ]}
              data={history.data ?? []}
              keyExtractor={(r) => r.id}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
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
  const { notify } = useNotification()
  const qc = useQueryClient()
  const query = usePaginatedQuery({
    queryKey: ['reg', 'students', controls.debouncedSearch, controls.page],
    queryFn: () =>
      fetchStudents({
        search: controls.debouncedSearch || undefined,
        page: controls.page,
        limit: controls.pageSize,
      }),
  })
  const classifications = useQuery({
    queryKey: ['reg', 'student-classifications'],
    queryFn: fetchStudentClassifications,
  })
  const classify = useMutation({
    mutationFn: ({ id, classification }: { id: string; classification: string }) =>
      updateStudentProfile(id, { classification: classification || null }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Student classification saved' })
      void qc.invalidateQueries({ queryKey: ['reg', 'students'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Classification update failed',
        description: getApiErrorMessage(err),
      }),
  })
  return (
    <div className="space-y-6">
      <RegistrarStudentImportPanel />
      <RegistrarStudentMergePanel />
      <RegistrarStudentProfilePanel />
      <RegistrarSubjectCreditsPanel />
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
              {
                key: 'classification',
                header: 'Classification',
                render: (r) => (
                  <Select
                    id={`stu-class-${r.id}`}
                    value={r.classification ?? ''}
                    onChange={(e) => classify.mutate({ id: r.id, classification: e.target.value })}
                  >
                    <option value="">Unset</option>
                    {(classifications.data ?? []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                ),
              },
              {
                key: 'campus',
                header: 'Campus id',
                render: (r) => r.mdmCampusId?.slice(0, 8) ?? '—',
              },
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

function RegistrarStudentProfilePanel() {
  const { notify } = useNotification()
  const [studentId, setStudentId] = useState('')
  const [violationCode, setViolationCode] = useState('ATTENDANCE')
  const [violationTitle, setViolationTitle] = useState('')
  const [gwaText, setGwaText] = useState('')
  const profile = useQuery({
    queryKey: ['reg', 'student-profile', studentId],
    queryFn: () => fetchStudentProfile(studentId),
    enabled: !!studentId,
  })

  const gwaMutation = useMutation({
    mutationFn: () => computeStudentGwa(studentId),
    onSuccess: (row) => {
      const value = row.cumulativeGwa == null ? 'no graded units' : Number(row.cumulativeGwa).toFixed(4)
      setGwaText(`${value} · ${row.academicStanding ?? 'no standing'} · graded units ${row.unitsGraded ?? 0}`)
      notify({ tone: 'success', title: 'GWA computed' })
      void profile.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'GWA failed', description: getApiErrorMessage(err) }),
  })

  const violationMutation = useMutation({
    mutationFn: () =>
      recordStudentViolation(studentId, {
        violationCode: violationCode.trim(),
        title: violationTitle.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Violation recorded' })
      setViolationTitle('')
      void profile.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Violation failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student profile & records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          View and print the student profile with performance, absences, academic standing, and
          violations. Grade edits remain controlled through the correction workflow. Official
          transcript stays in TORMS.
        </p>
        <FormField id="profileStudent" label="Student">
          <StudentSearchSelect
            id="profileStudent"
            value={studentId}
            onChange={setStudentId}
          />
        </FormField>
        {profile.data ? (
          <div id="registrar-student-profile-print" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Print profile
              </Button>
              <Button
                type="button"
                className="whitespace-nowrap"
                disabled={gwaMutation.isPending}
                onClick={() => gwaMutation.mutate()}
              >
                Compute GWA
              </Button>
            </div>
            {gwaText ? (
              <p className="text-sm" data-testid="gwa-result">
                Cumulative GWA {gwaText}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-4">
              <DashboardCard title="Grades" value={profile.data.performance.gradeCount} />
              <DashboardCard
                title="Standing"
                value={profile.data.performance.academicStanding ?? '—'}
              />
              <DashboardCard title="Absences" value={profile.data.absences.summary.absent} />
              <DashboardCard title="Violations" value={profile.data.violations.academic.length} />
            </div>
            <p className="text-sm">
              {profile.data.student.lastName}, {profile.data.student.firstName} ·{' '}
              <span className="font-mono">{profile.data.student.studentNumber}</span> ·{' '}
              {profile.data.student.programCode ?? 'No program'} · GWA{' '}
              {profile.data.performance.gwa?.cumulativeGwa?.toFixed?.(4) ?? '—'}
            </p>
            <DataTable
              label="Performance"
              columns={[
                { key: 'courseCode', header: 'Code', render: (r) => String(r.courseCode ?? '') },
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
              label="Violations"
              columns={[
                { key: 'violationCode', header: 'Code' },
                { key: 'title', header: 'Title' },
                { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              ]}
              data={profile.data.violations.academic}
              keyExtractor={(r) => r.id}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <FormField id="violCode" label="Violation code">
                <Input
                  id="violCode"
                  value={violationCode}
                  onChange={(e) => setViolationCode(e.target.value)}
                />
              </FormField>
              <FormField id="violTitle" label="Title">
                <Input
                  id="violTitle"
                  value={violationTitle}
                  onChange={(e) => setViolationTitle(e.target.value)}
                />
              </FormField>
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={
                    !violationCode.trim() || !violationTitle.trim() || violationMutation.isPending
                  }
                  onClick={() => violationMutation.mutate()}
                >
                  Record violation
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RegistrarStudentMergePanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const jobs = useQuery({ queryKey: ['reg', 'student-merge-jobs'], queryFn: fetchStudentMergeJobs })
  const [survivorId, setSurvivorId] = useState('')
  const [duplicateId, setDuplicateId] = useState('')
  const [note, setNote] = useState('')

  const mergeMutation = useMutation({
    mutationFn: () =>
      mergeStudentAccounts({
        survivorStudentId: survivorId,
        duplicateStudentId: duplicateId,
        note: note.trim() || undefined,
      }),
    onSuccess: (result) => {
      notify({
        tone: 'success',
        title: 'Duplicate student merged',
        description: `Survivor kept; duplicate ${result.duplicate.studentNumber} retired.`,
      })
      setDuplicateId('')
      setNote('')
      void qc.invalidateQueries({ queryKey: ['reg', 'students'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'student-merge-jobs'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Merge failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge duplicate student accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose the original (survivor) account and the duplicate. All linked transactions move to
          the survivor; the duplicate is retired and cannot be used. Campus assignment remains on
          each student via MDM campus id — no invented campus policy.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="mergeSurvivor" label="Survivor (keep)">
            <StudentSearchSelect
              id="mergeSurvivor"
              value={survivorId}
              onChange={setSurvivorId}
              placeholder="Search survivor by name or number…"
            />
          </FormField>
          <FormField id="mergeDuplicate" label="Duplicate (retire)">
            <StudentSearchSelect
              id="mergeDuplicate"
              value={duplicateId}
              onChange={setDuplicateId}
              placeholder="Search duplicate by name or number…"
            />
          </FormField>
        </div>
        <FormField id="mergeNote" label="Note">
          <Input
            id="mergeNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional merge note"
          />
        </FormField>
        <Button
          type="button"
          disabled={!survivorId || !duplicateId || mergeMutation.isPending}
          onClick={() => mergeMutation.mutate()}
        >
          Merge duplicate into survivor
        </Button>
        <DataTable
          label="Recent merge jobs"
          columns={[
            { key: 'id', header: 'Job', render: (r) => r.id.slice(0, 8) },
            {
              key: 'survivorStudentId',
              header: 'Survivor',
              render: (r) => r.survivorStudentId.slice(0, 8),
            },
            {
              key: 'duplicateStudentId',
              header: 'Duplicate',
              render: (r) => r.duplicateStudentId.slice(0, 8),
            },
            { key: 'status', header: 'Status' },
            { key: 'note', header: 'Note', render: (r) => r.note || '—' },
          ]}
          data={jobs.data ?? []}
          keyExtractor={(r) => r.id}
        />
      </CardContent>
    </Card>
  )
}

function RegistrarStudentImportPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const batches = useQuery({
    queryKey: ['reg', 'student-import-batches'],
    queryFn: () => fetchStudentImportBatches(),
  })
  const [sourceName, setSourceName] = useState('registrar-csv')
  const [rawRows, setRawRows] = useState(
    'studentNumber,firstName,lastName,email,programCode,yearLevel\n'
  )
  const [lastResult, setLastResult] = useState<{
    batchId: string
    acceptedCount: number
    rejectedCount: number
    rejections: Array<{ rowNumber: number; reason: string }>
  } | null>(null)

  const parseRows = () => {
    const lines = rawRows
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0]!.split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? ''
      })
      return {
        studentNumber: row.studentNumber || undefined,
        firstName: row.firstName || undefined,
        lastName: row.lastName || undefined,
        email: row.email || undefined,
        middleName: row.middleName || undefined,
        mobile: row.mobile || undefined,
        programCode: row.programCode || undefined,
        classification: row.classification || undefined,
        yearLevel: row.yearLevel ? Number(row.yearLevel) : undefined,
        status: row.status || undefined,
      }
    })
  }

  const importMutation = useMutation({
    mutationFn: () =>
      importStudentsBulk({
        sourceName: sourceName.trim() || 'manual',
        rows: parseRows(),
      }),
    onSuccess: (result) => {
      setLastResult({
        batchId: result.batch.id,
        acceptedCount: result.batch.acceptedCount,
        rejectedCount: result.batch.rejectedCount,
        rejections: result.rejections.map((r) => ({ rowNumber: r.rowNumber, reason: r.reason })),
      })
      notify({
        tone: 'success',
        title: 'Student import finished',
        description: `Accepted ${result.batch.acceptedCount}, rejected ${result.batch.rejectedCount}`,
      })
      void qc.invalidateQueries({ queryKey: ['reg', 'student-import-batches'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'students'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Import failed', description: getApiErrorMessage(err) }),
  })

  const downloadMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const blob = await downloadStudentImportRejectionCsv(batchId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `student-import-rejections-${batchId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Download failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk student import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paste CSV rows with a header. Valid profiles are created; invalid rows are captured in a
          rejection report. Existing student create/admit flows are unchanged. Employee bulk import
          remains out of scope until HR master policy is confirmed.
        </p>
        <FormField id="importSource" label="Source name">
          <Input
            id="importSource"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />
        </FormField>
        <FormField id="importCsv" label="CSV rows">
          <textarea
            id="importCsv"
            className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            value={rawRows}
            onChange={(e) => setRawRows(e.target.value)}
          />
        </FormField>
        <Button
          type="button"
          disabled={importMutation.isPending || parseRows().length === 0}
          onClick={() => importMutation.mutate()}
        >
          Run import
        </Button>

        {lastResult ? (
          <Alert
            variant={lastResult.rejectedCount > 0 ? 'warning' : 'success'}
            title={`Batch ${lastResult.batchId.slice(0, 8)}…`}
          >
            Accepted {lastResult.acceptedCount}, rejected {lastResult.rejectedCount}.{' '}
            {lastResult.rejectedCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => downloadMutation.mutate(lastResult.batchId)}
              >
                Download rejection CSV
              </Button>
            ) : null}
          </Alert>
        ) : null}

        {lastResult?.rejections?.length ? (
          <DataTable
            label="Rejection report"
            columns={[
              { key: 'rowNumber', header: 'Row' },
              { key: 'reason', header: 'Reason' },
            ]}
            data={lastResult.rejections}
            keyExtractor={(r) => `${r.rowNumber}-${r.reason}`}
          />
        ) : null}

        <DataTable
          label="Import batches"
          columns={[
            { key: 'sourceName', header: 'Source' },
            { key: 'totalRows', header: 'Rows' },
            { key: 'acceptedCount', header: 'Accepted' },
            { key: 'rejectedCount', header: 'Rejected' },
            { key: 'status', header: 'Status' },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) =>
                r.rejectedCount > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => downloadMutation.mutate(r.id)}
                  >
                    Rejection CSV
                  </Button>
                ) : (
                  '—'
                ),
            },
          ]}
          data={batches.data ?? []}
          keyExtractor={(r) => r.id}
        />
      </CardContent>
    </Card>
  )
}

function RegistrarSubjectCreditsPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const subjects = usePaginatedQuery({
    queryKey: ['reg', 'subjects', 'options'],
    queryFn: () => fetchSubjects({ page: 1, limit: 100 }),
  })
  const subjectOptions = subjects.data?.data ?? []
  const equivalencies = useQuery({
    queryKey: ['reg', 'subject-equivalencies'],
    queryFn: () => fetchSubjectEquivalencies(),
  })

  const [studentId, setStudentId] = useState('')
  const [extCode, setExtCode] = useState('')
  const [extTitle, setExtTitle] = useState('')
  const [extUnits, setExtUnits] = useState('3')
  const [extSchool, setExtSchool] = useState('')
  const [mapSubjectId, setMapSubjectId] = useState('')
  const [eqSubjectId, setEqSubjectId] = useState('')
  const [eqExternalCode, setEqExternalCode] = useState('')

  const evaluation = useQuery({
    queryKey: ['reg', 'curriculum-eval', studentId],
    queryFn: () => fetchStudentCurriculumEvaluation(studentId),
    enabled: !!studentId,
  })
  const credits = useQuery({
    queryKey: ['reg', 'subject-credits', studentId],
    queryFn: () => fetchStudentSubjectCredits(studentId),
    enabled: !!studentId,
  })

  const refreshStudent = () => {
    void qc.invalidateQueries({ queryKey: ['reg', 'curriculum-eval', studentId] })
    void qc.invalidateQueries({ queryKey: ['reg', 'subject-credits', studentId] })
  }

  const autoMutation = useMutation({
    mutationFn: () => autoCreditInternalSubjects(studentId),
    onSuccess: (res) => {
      notify({
        tone: 'success',
        title: 'Internal credits applied',
        description: `${res.data.created.length} credit(s) created`,
      })
      refreshStudent()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Auto-credit failed', description: getApiErrorMessage(err) }),
  })

  const externalMutation = useMutation({
    mutationFn: () =>
      submitExternalSubjectCredit(studentId, {
        externalSubjectCode: extCode.trim(),
        externalSubjectTitle: extTitle.trim(),
        units: Number(extUnits) || 0,
        sourceSchool: extSchool.trim() || undefined,
        mapToSubjectId: mapSubjectId || undefined,
      }),
    onSuccess: (row) => {
      notify({
        tone: 'success',
        title:
          row.status === 'credited'
            ? 'External/equivalent credited'
            : 'External credit pending review',
      })
      setExtCode('')
      setExtTitle('')
      refreshStudent()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'External credit failed',
        description: getApiErrorMessage(err),
      }),
  })

  const applyEqMutation = useMutation({
    mutationFn: () => applySubjectEquivalencies(studentId),
    onSuccess: (rows) => {
      notify({
        tone: 'success',
        title: 'Equivalencies applied',
        description: `${rows.length} updated`,
      })
      refreshStudent()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Apply equivalencies failed',
        description: getApiErrorMessage(err),
      }),
  })

  const createEqMutation = useMutation({
    mutationFn: () =>
      createSubjectEquivalency({
        internalSubjectId: eqSubjectId,
        externalCode: eqExternalCode.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Equivalency rule saved' })
      setEqExternalCode('')
      void qc.invalidateQueries({ queryKey: ['reg', 'subject-equivalencies'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Equivalency failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum evaluation & subject credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Evaluate a student against the active curriculum, auto-credit passed internal subjects,
          and assist external/equivalent crediting with configurable equivalency rules. Curriculum
          versioning remains on the Curriculum page.
        </p>

        <FormField id="creditStudent" label="Student">
          <StudentSearchSelect id="creditStudent" value={studentId} onChange={setStudentId} />
        </FormField>

        {studentId ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={autoMutation.isPending}
                onClick={() => autoMutation.mutate()}
              >
                Auto-credit internal passes
              </Button>
              <Button
                type="button"
                disabled={applyEqMutation.isPending}
                onClick={() => applyEqMutation.mutate()}
              >
                Apply equivalency rules
              </Button>
            </div>

            {evaluation.data ? (
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <DashboardCard title="Passed" value={evaluation.data.passed.length} />
                <DashboardCard title="Remaining" value={evaluation.data.remaining.length} />
                <DashboardCard
                  title="Credited internal"
                  value={evaluation.data.creditedInternal.length}
                />
                <DashboardCard
                  title="Credited external/eq"
                  value={
                    evaluation.data.creditedExternal.length +
                    evaluation.data.creditedEquivalent.length
                  }
                />
              </div>
            ) : null}

            <DataTable
              label="Subject credits"
              columns={[
                { key: 'subjectCode', header: 'Code' },
                { key: 'subjectTitle', header: 'Title' },
                { key: 'creditType', header: 'Type' },
                { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) =>
                    r.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            reviewSubjectCredit(studentId, r.id, { decision: 'credited' }).then(
                              () => {
                                notify({ tone: 'success', title: 'Credit approved' })
                                refreshStudent()
                              }
                            )
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reviewSubjectCredit(studentId, r.id, { decision: 'rejected' }).then(
                              () => {
                                notify({ tone: 'success', title: 'Credit rejected' })
                                refreshStudent()
                              }
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      '—'
                    ),
                },
              ]}
              data={credits.data ?? []}
              keyExtractor={(r) => r.id}
            />

            <div className="grid gap-3 md:grid-cols-5">
              <FormField id="extCode" label="External code">
                <Input id="extCode" value={extCode} onChange={(e) => setExtCode(e.target.value)} />
              </FormField>
              <FormField id="extTitle" label="External title">
                <Input
                  id="extTitle"
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                />
              </FormField>
              <FormField id="extUnits" label="Units">
                <Input
                  id="extUnits"
                  value={extUnits}
                  onChange={(e) => setExtUnits(e.target.value)}
                />
              </FormField>
              <FormField id="extSchool" label="Source school">
                <Input
                  id="extSchool"
                  value={extSchool}
                  onChange={(e) => setExtSchool(e.target.value)}
                />
              </FormField>
              <FormField id="mapSubject" label="Map to subject (optional)">
                <SearchableSelect
                  id="mapSubject"
                  value={mapSubjectId}
                  onChange={setMapSubjectId}
                  placeholder="Search subject code or title…"
                  options={subjectOptions.map((s) => ({
                    value: s.id,
                    label: `${s.subjectCode}${s.title ? ` — ${s.title}` : ''}`,
                  }))}
                />
              </FormField>
            </div>
            <Button
              type="button"
              disabled={!extCode.trim() || !extTitle.trim() || externalMutation.isPending}
              onClick={() => externalMutation.mutate()}
            >
              Submit external credit
            </Button>
          </>
        ) : null}

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Equivalency rules</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="eqSubject" label="Internal subject">
              <SearchableSelect
                id="eqSubject"
                value={eqSubjectId}
                onChange={setEqSubjectId}
                placeholder="Search subject code or title…"
                options={subjectOptions.map((s) => ({
                  value: s.id,
                  label: `${s.subjectCode} — ${s.title}`,
                }))}
              />
            </FormField>
            <FormField id="eqExt" label="External code">
              <Input
                id="eqExt"
                value={eqExternalCode}
                onChange={(e) => setEqExternalCode(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!eqSubjectId || !eqExternalCode.trim() || createEqMutation.isPending}
                onClick={() => createEqMutation.mutate()}
              >
                Save equivalency
              </Button>
            </div>
          </div>
          <DataTable
            label="Equivalencies"
            columns={[
              { key: 'externalCode', header: 'External' },
              {
                key: 'internalSubjectCode',
                header: 'Internal',
                render: (r) => r.internalSubjectCode || '—',
              },
              {
                key: 'internalSubjectTitle',
                header: 'Title',
                render: (r) => r.internalSubjectTitle || '—',
              },
            ]}
            data={equivalencies.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function RegistrarEnrollmentsPage() {
  return (
    <RequirePermission anyOf={['enrollments.read']}>
      <RegistrarEnrollmentsInner />
    </RequirePermission>
  )
}

function RegistrarEnrollmentWorkflowSection({
  enrollmentId,
}: {
  enrollmentId: string | undefined
}) {
  const id = enrollmentId?.trim()
  const enabled = Boolean(id && z.string().uuid().safeParse(id).success)
  const workflow = useQuery({
    queryKey: ['reg', 'enrollment-workflow', id],
    queryFn: () => fetchEnrollmentWorkflow(id!),
    enabled,
  })
  if (!enabled) return null
  if (workflow.isLoading) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">Loading enrollment workflow…</p>
    )
  }
  if (workflow.isError) {
    return <Alert variant="danger">Could not load enrollment workflow for this ID.</Alert>
  }
  if (!workflow.data) return null
  return <EnrollmentWorkflowPanel data={workflow.data} showTuitionLinks={false} />
}

function RegistrarEnrollmentsInner() {
  const controls = useListControls()
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)
  const [financeRead, setFinanceRead] = useState('')
  const canReadFinance = useHasPermission('assessments.write', 'payments.write')
  const query = usePaginatedQuery({
    queryKey: ['reg', 'enrollments', controls.page, controls.debouncedSearch],
    queryFn: () =>
      fetchEnrollments({
        page: controls.page,
        limit: controls.pageSize,
        status: controls.debouncedSearch || undefined,
      }),
  })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['reg', 'enrollments'] })
    void qc.invalidateQueries({ queryKey: ['reg', 'enrollment-workflow'] })
  }
  const financeReadMutation = useMutation({
    mutationFn: (row: {
      studentNumber: string
      assessmentId: string
      assessmentNumber: string
    }) => syncAssessmentPayment(row.assessmentId).then((result) => ({ row, result })),
    onSuccess: ({ row, result }) => {
      const paymentStatus = result.status.paymentStatus
      const paid = Number(result.status.paidAmount).toFixed(2)
      const line = `${row.studentNumber} · ${row.assessmentNumber} · ${paymentStatus} · paid ${paid}`
      setFinanceRead(line)
      notify({ tone: 'success', title: 'Finance status read', description: line })
      refresh()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Finance status failed',
        description: getApiErrorMessage(err),
      }),
  })
  const assessMutation = useMutation({
    mutationFn: (id: string) => assessEnrollment({ enrollmentId: id }),
    onSuccess: (data) => {
      const net = Number((data as { netAmount?: number }).netAmount ?? 0)
      notify({
        tone: 'success',
        title: 'Assessment prepared',
        description: net > 0 ? `Net assessed: ${net.toFixed(2)}` : undefined,
      })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Assess failed', description: getApiErrorMessage(err) }),
  })
  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyEnrollmentPayment(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Payment verified' })
      refresh()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Payment not confirmed',
        description: getApiErrorMessage(
          err,
          'Collect the registration minimum at UFMS cashier, then verify again.'
        ),
      }),
  })
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRegistrarEnrollment(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Registrar approval recorded' })
      refresh()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Registrar approve failed',
        description: getApiErrorMessage(err),
      }),
  })
  const registerMutation = useMutation({
    mutationFn: (id: string) => registerEnrollment(id),
    onSuccess: (row) => {
      const notice = (row as { enrollmentNotice?: { sent?: boolean; to?: string | null } | null }).enrollmentNotice
      notify({
        tone: 'success',
        title: 'Enrollment registered',
        description: notice?.sent
          ? `Confirmation email sent to ${notice.to}`
          : 'Official enrollment saved. Confirmation email was not sent.',
      })
      refresh()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Registration failed',
        description: getApiErrorMessage(err),
      }),
  })
  const busy =
    assessMutation.isPending ||
    verifyMutation.isPending ||
    approveMutation.isPending ||
    registerMutation.isPending ||
    financeReadMutation.isPending

  return (
    <div className="space-y-6">
      {financeRead ? (
        <p className="text-sm" data-testid="finance-read-result">
          {financeRead}
        </p>
      ) : null}
      <QueryPage
        title="Enrollment management"
        description="Assess → collect minimum due at UFMS cashier → Verify payment → Approve → Register"
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
              {
                key: 'student',
                header: 'Student #',
                className: 'whitespace-nowrap',
                render: (r) => r.student?.studentNumber ?? r.studentId.slice(0, 8),
              },
              {
                key: 'name',
                header: 'Name',
                className: 'min-w-[10rem] whitespace-nowrap',
                render: (r) =>
                  r.student?.lastName || r.student?.firstName
                    ? `${r.student.lastName ?? ''}, ${r.student.firstName ?? ''}`.replace(
                        /^,\s*|,\s*$/g,
                        ''
                      )
                    : '—',
              },
              { key: 'yearLevel', header: 'Year', className: 'whitespace-nowrap' },
              { key: 'semester', header: 'Sem', className: 'whitespace-nowrap' },
              {
                key: 'finance',
                header: 'Paid / net',
                className: 'whitespace-nowrap text-xs',
                render: (r) => {
                  const asm = r.assessments?.[0]
                  if (!asm) return '—'
                  return `${Number(asm.paidAmount ?? 0).toFixed(0)} / ${Number(asm.netAmount ?? 0).toFixed(0)}`
                },
              },
              {
                key: 'status',
                header: 'Status',
                className: 'whitespace-nowrap',
                render: (r) => <Badge>{r.status}</Badge>,
              },
            ]}
            actions={(r) => (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedEnrollmentId === r.id ? 'default' : 'outline'}
                  onClick={() => setSelectedEnrollmentId((prev) => (prev === r.id ? null : r.id))}
                >
                  Workflow
                </Button>
                {r.status === 'assessed' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => verifyMutation.mutate(r.id)}
                  >
                    Verify payment
                  </Button>
                ) : null}
                {r.status === 'payment_verified' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => approveMutation.mutate(r.id)}
                  >
                    Approve
                  </Button>
                ) : null}
                {r.status === 'registrar_approved' || r.status === 'payment_verified' ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => registerMutation.mutate(r.id)}
                  >
                    Register
                  </Button>
                ) : null}
                {r.status === 'registered' ? (
                  <span className="whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
                    Complete
                  </span>
                ) : null}
                {['draft', 'advising', 'advised'].includes(r.status) ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => assessMutation.mutate(r.id)}
                    >
                      Assess
                    </Button>
                    <span className="whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
                      From active fee schedule
                    </span>
                  </>
                ) : null}
              </>
            )}
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      {selectedEnrollmentId && canReadFinance && query.data?.data.find((row) => row.id === selectedEnrollmentId)?.assessments?.[0] ? (
        <Button
          type="button"
          variant="outline"
          className="whitespace-nowrap"
          disabled={busy}
          aria-label={`Read finance ${query.data.data.find((row) => row.id === selectedEnrollmentId)?.student?.studentNumber ?? selectedEnrollmentId}`}
          onClick={() => {
            const row = query.data?.data.find((item) => item.id === selectedEnrollmentId)
            const assessment = row?.assessments?.[0]
            if (!row || !assessment) return
            financeReadMutation.mutate({
              studentNumber: row.student?.studentNumber ?? row.studentId,
              assessmentId: assessment.id,
              assessmentNumber: assessment.assessmentNumber,
            })
          }}
        >
          Read finance
        </Button>
      ) : null}
      {selectedEnrollmentId ? (
        <RegistrarEnrollmentWorkflowSection enrollmentId={selectedEnrollmentId} />
      ) : null}
    </div>
  )
}

export function RegistrarAcademicPage() {
  return (
    <RequirePermission anyOf={['academic.read', 'academic.write']}>
      <RegistrarAcademicInner />
    </RequirePermission>
  )
}

function dateInputValue(value?: string | null) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

type AcademicEditTarget =
  | {
      kind: 'year'
      row: {
        id: string
        code: string
        name: string
        isActive: boolean
        startDate?: string | null
        endDate?: string | null
      }
    }
  | { kind: 'program'; row: { id: string; code: string; name: string } }
  | {
      kind: 'section'
      row: { id: string; code: string; name: string; yearLevel: number; semester: number }
    }

function AcademicStructureEditor({
  target,
  onClose,
}: {
  target: AcademicEditTarget
  onClose: () => void
}) {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [code, setCode] = useState(target.row.code)
  const [name, setName] = useState(target.row.name)
  const [isActive, setIsActive] = useState(target.kind === 'year' ? target.row.isActive : false)
  const [startDate, setStartDate] = useState(
    target.kind === 'year' ? dateInputValue(target.row.startDate) : ''
  )
  const [endDate, setEndDate] = useState(
    target.kind === 'year' ? dateInputValue(target.row.endDate) : ''
  )
  const [yearLevel, setYearLevel] = useState(
    target.kind === 'section' ? String(target.row.yearLevel) : '1'
  )
  const [semester, setSemester] = useState(
    target.kind === 'section' ? String(target.row.semester) : '1'
  )

  const mutation = useMutation({
    mutationFn: async () => {
      if (target.kind === 'year') {
        await updateAcademicYear(target.row.id, {
          code: code.trim(),
          name: name.trim(),
          isActive,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        })
        return
      }
      if (target.kind === 'program') {
        await updateProgram(target.row.id, { code: code.trim(), name: name.trim() })
        return
      }
      await patchSection(target.row.id, {
        code: code.trim(),
        name: name.trim(),
        yearLevel: Number(yearLevel),
        semester: Number(semester),
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Academic record updated' })
      void qc.invalidateQueries({ queryKey: ['reg', 'years'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'programs'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'sections'] })
      onClose()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Update failed', description: getApiErrorMessage(err) }),
  })

  const title =
    target.kind === 'year'
      ? 'Edit academic year'
      : target.kind === 'program'
        ? 'Edit program'
        : 'Edit section'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-3xl gap-3 md:grid-cols-2">
        <FormField id="academicEditCode" label="Code" required>
          <Input id="academicEditCode" value={code} onChange={(e) => setCode(e.target.value)} />
        </FormField>
        <FormField id="academicEditName" label="Name" required>
          <Input id="academicEditName" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        {target.kind === 'year' ? (
          <>
            <FormField id="academicEditStart" label="Start date">
              <Input
                id="academicEditStart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormField>
            <FormField id="academicEditEnd" label="End date">
              <Input
                id="academicEditEnd"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormField>
            <FormField id="academicEditActive" label="Active">
              <Select
                id="academicEditActive"
                value={isActive ? 'yes' : 'no'}
                onChange={(e) => setIsActive(e.target.value === 'yes')}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>
          </>
        ) : null}
        {target.kind === 'section' ? (
          <>
            <FormField id="academicEditYear" label="Year level">
              <Input
                id="academicEditYear"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
              />
            </FormField>
            <FormField id="academicEditSem" label="Semester">
              <Input
                id="academicEditSem"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
            </FormField>
          </>
        ) : null}
        <div className="flex items-end gap-2">
          <Button
            type="button"
            disabled={!code.trim() || !name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RegistrarAcademicInner() {
  const canWrite = useHasPermission('academic.write')
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<AcademicEditTarget | null>(null)
  const yearControls = useListControls()
  const programControls = useListControls()
  const sectionControls = useListControls()
  const years = usePaginatedQuery({
    queryKey: ['reg', 'years', yearControls.page],
    queryFn: () => fetchAcademicYears({ page: yearControls.page, limit: yearControls.pageSize }),
  })
  const programs = usePaginatedQuery({
    queryKey: ['reg', 'programs', programControls.page],
    queryFn: () => fetchPrograms({ page: programControls.page, limit: programControls.pageSize }),
  })
  const sections = usePaginatedQuery({
    queryKey: ['reg', 'sections', sectionControls.page],
    queryFn: () => fetchSections({ page: sectionControls.page, limit: sectionControls.pageSize }),
  })
  const sectionOptions = usePaginatedQuery({
    queryKey: ['reg', 'sections', 'options'],
    queryFn: () => fetchSections({ page: 1, limit: 100 }),
  })
  const deleteMutation = useMutation({
    mutationFn: (target: AcademicEditTarget) => {
      if (target.kind === 'year') return deleteAcademicYear(target.row.id)
      if (target.kind === 'program') return deleteProgram(target.row.id)
      return deleteSection(target.row.id)
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Academic record deleted' })
      void qc.invalidateQueries({ queryKey: ['reg', 'years'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'programs'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'sections'] })
    },
  })

  const rowActions = (target: AcademicEditTarget) => (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(target)}>
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={deleteMutation.isPending}
        onClick={() => {
          const ok = window.confirm(
            `Delete ${target.row.code}? This is blocked when students or classes already use it.`
          )
          if (!ok) return
          deleteMutation.mutate(target)
        }}
      >
        Delete
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {editing ? (
        <AcademicStructureEditor
          key={`${editing.kind}-${editing.row.id}`}
          target={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <QueryPage
        title="Academic years"
        query={years}
        page={yearControls.page}
        lastPage={years.data?.meta.lastPage}
        onPageChange={yearControls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Academic years"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'isActive', header: 'Active', render: (r) => (r.isActive ? 'yes' : 'no') },
            ]}
            actions={
              canWrite
                ? (row) => rowActions({ kind: 'year', row })
                : undefined
            }
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <QueryPage
        title="Programs"
        query={programs}
        page={programControls.page}
        lastPage={programs.data?.meta.lastPage}
        onPageChange={programControls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Programs"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
            ]}
            actions={
              canWrite ? (row) => rowActions({ kind: 'program', row }) : undefined
            }
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <QueryPage
        title="Sections"
        query={sections}
        page={sectionControls.page}
        lastPage={sections.data?.meta.lastPage}
        onPageChange={sectionControls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Sections"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'yearLevel', header: 'Year' },
              { key: 'semester', header: 'Sem' },
            ]}
            actions={
              canWrite ? (row) => rowActions({ kind: 'section', row }) : undefined
            }
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
      <RegistrarInstitutionalProfilePanel />
      <RegistrarAcademicStructurePanel />
      <RegistrarFacilitiesPanel />
      <RegistrarAcademicPoliciesPanel />
      <RegistrarSectionSlotTools sections={sectionOptions.data?.data ?? []} />
      <RegistrarBlockEncodePanel sections={sectionOptions.data?.data ?? []} />
    </div>
  )
}

function RegistrarBlockEncodePanel(props: {
  sections: Array<{ id: string; code: string; name: string; blockGroupCode?: string | null }>
}) {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [sectionId, setSectionId] = useState('')
  const [blockGroupCode, setBlockGroupCode] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [encodeCode, setEncodeCode] = useState('')

  const patchMutation = useMutation({
    mutationFn: () =>
      patchSection(sectionId, {
        isBlockSection: true,
        blockGroupCode: blockGroupCode.trim().toUpperCase() || null,
      }),
    onSuccess: (row) => {
      notify({
        tone: 'success',
        title: 'Section block group saved',
        description: row.blockGroupCode ?? 'cleared',
      })
      void qc.invalidateQueries({ queryKey: ['reg', 'sections'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Patch failed', description: getApiErrorMessage(err) }),
  })

  const encodeMutation = useMutation({
    mutationFn: () => encodeBlockGroup(enrollmentId.trim(), encodeCode.trim()),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: `Encoded block ${data.blockGroupCode}`,
        description: `${data.addedCount} line(s); auto-reassess: ${data.autoReassessment}`,
      })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Encode failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Block section encode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Tag subject sections with a shared block group code, then encode that block onto a student
          enrollment. Drop/transfer/add paths mark reassessment and auto-run prepare when
          re-advising is clear.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="blockSection" label="Section to tag">
            <SearchableSelect
              id="blockSection"
              value={sectionId}
              placeholder="Search section code or name…"
              onChange={(nextId) => {
                setSectionId(nextId)
                const row = props.sections.find((s) => s.id === nextId)
                setBlockGroupCode(row?.blockGroupCode ?? '')
              }}
              options={props.sections.map((s) => ({
                value: s.id,
                label: `${s.code} — ${s.name}${s.blockGroupCode ? ` [${s.blockGroupCode}]` : ''}`,
              }))}
            />
          </FormField>
          <FormField id="blockGroupTag" label="Block group code">
            <Input
              id="blockGroupTag"
              value={blockGroupCode}
              onChange={(e) => setBlockGroupCode(e.target.value)}
              placeholder="BSIT-1A"
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!sectionId || patchMutation.isPending}
          onClick={() => patchMutation.mutate()}
        >
          Save block tag
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="blockEnrollmentId" label="Enrollment ID">
            <Input
              id="blockEnrollmentId"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
            />
          </FormField>
          <FormField id="blockEncodeCode" label="Encode block group">
            <Input
              id="blockEncodeCode"
              value={encodeCode}
              onChange={(e) => setEncodeCode(e.target.value)}
              placeholder="BSIT-1A"
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!enrollmentId.trim() || !encodeCode.trim() || encodeMutation.isPending}
          onClick={() => encodeMutation.mutate()}
        >
          Encode onto enrollment
        </Button>
      </CardContent>
    </Card>
  )
}

function RegistrarAcademicStructurePanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const colleges = useQuery({ queryKey: ['reg', 'colleges'], queryFn: fetchColleges })
  const departments = useQuery({
    queryKey: ['reg', 'academic-departments'],
    queryFn: () => fetchAcademicDepartments(),
  })
  const positions = useQuery({ queryKey: ['reg', 'positions'], queryFn: fetchPositions })
  const subjectAreas = useQuery({
    queryKey: ['reg', 'subject-areas'],
    queryFn: () => fetchSubjectAreas(),
  })
  const assignments = useQuery({
    queryKey: ['reg', 'employee-assignments'],
    queryFn: fetchEmployeeAssignments,
  })

  const [collegeCode, setCollegeCode] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [collegeDean, setCollegeDean] = useState('')
  const [deptCollegeId, setDeptCollegeId] = useState('')
  const [deptCode, setDeptCode] = useState('')
  const [deptName, setDeptName] = useState('')
  const [deptHead, setDeptHead] = useState('')
  const [positionCode, setPositionCode] = useState('')
  const [positionName, setPositionName] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [areaName, setAreaName] = useState('')
  const [areaCollegeId, setAreaCollegeId] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignName, setAssignName] = useState('')
  const [assignCollegeId, setAssignCollegeId] = useState('')
  const [assignDeptId, setAssignDeptId] = useState('')
  const [assignPositionId, setAssignPositionId] = useState('')
  const [assignHead, setAssignHead] = useState(false)

  const createCollegeMutation = useMutation({
    mutationFn: () =>
      createCollege({
        code: collegeCode.trim(),
        name: collegeName.trim(),
        deanName: collegeDean.trim() || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'College saved' })
      setCollegeCode('')
      setCollegeName('')
      setCollegeDean('')
      void qc.invalidateQueries({ queryKey: ['reg', 'colleges'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'College failed', description: getApiErrorMessage(err) }),
  })

  const createDeptMutation = useMutation({
    mutationFn: () =>
      createAcademicDepartment({
        collegeId: deptCollegeId,
        code: deptCode.trim(),
        name: deptName.trim(),
        headName: deptHead.trim() || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Academic department saved' })
      setDeptCode('')
      setDeptName('')
      setDeptHead('')
      void qc.invalidateQueries({ queryKey: ['reg', 'academic-departments'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Department failed', description: getApiErrorMessage(err) }),
  })

  const createPositionMutation = useMutation({
    mutationFn: () => createPosition({ code: positionCode.trim(), name: positionName.trim() }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Position saved' })
      setPositionCode('')
      setPositionName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'positions'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Position failed', description: getApiErrorMessage(err) }),
  })

  const createAreaMutation = useMutation({
    mutationFn: () =>
      createSubjectArea({
        code: areaCode.trim(),
        name: areaName.trim(),
        collegeId: areaCollegeId || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Subject area saved' })
      setAreaCode('')
      setAreaName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'subject-areas'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Subject area failed',
        description: getApiErrorMessage(err),
      }),
  })

  const createAssignMutation = useMutation({
    mutationFn: () =>
      createEmployeeAssignment({
        platformUserId: assignUserId.trim(),
        displayName: assignName.trim() || undefined,
        collegeId: assignCollegeId || undefined,
        academicDepartmentId: assignDeptId || undefined,
        positionId: assignPositionId || undefined,
        isDepartmentHead: assignHead,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Employee assignment saved' })
      setAssignUserId('')
      setAssignName('')
      setAssignHead(false)
      void qc.invalidateQueries({ queryKey: ['reg', 'employee-assignments'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'academic-departments'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Assignment failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic structure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <p className="text-sm text-muted-foreground">
          Colleges, academic departments, positions, subject areas, and employee assignments.
          Inventory org departments under Organization remain unchanged.
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Colleges</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <FormField id="collegeCode" label="Code">
              <Input
                id="collegeCode"
                value={collegeCode}
                onChange={(e) => setCollegeCode(e.target.value)}
              />
            </FormField>
            <FormField id="collegeName" label="Name">
              <Input
                id="collegeName"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
              />
            </FormField>
            <FormField id="collegeDean" label="Dean name">
              <Input
                id="collegeDean"
                value={collegeDean}
                onChange={(e) => setCollegeDean(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={
                  !collegeCode.trim() || !collegeName.trim() || createCollegeMutation.isPending
                }
                onClick={() => createCollegeMutation.mutate()}
              >
                Add college
              </Button>
            </div>
          </div>
          <DataTable
            label="Colleges"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'deanName', header: 'Dean', render: (r) => r.deanName || '—' },
            ]}
            data={colleges.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Academic departments</h3>
          <div className="grid gap-3 md:grid-cols-5">
            <FormField id="deptCollege" label="College">
              <Select
                id="deptCollege"
                value={deptCollegeId}
                onChange={(e) => setDeptCollegeId(e.target.value)}
              >
                <option value="">Select college</option>
                {(colleges.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="deptCode" label="Code">
              <Input id="deptCode" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
            </FormField>
            <FormField id="deptName" label="Name">
              <Input id="deptName" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            </FormField>
            <FormField id="deptHead" label="Head name">
              <Input id="deptHead" value={deptHead} onChange={(e) => setDeptHead(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={
                  !deptCollegeId ||
                  !deptCode.trim() ||
                  !deptName.trim() ||
                  createDeptMutation.isPending
                }
                onClick={() => createDeptMutation.mutate()}
              >
                Add department
              </Button>
            </div>
          </div>
          <DataTable
            label="Academic departments"
            columns={[
              { key: 'collegeCode', header: 'College', render: (r) => r.collegeCode || '—' },
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'headName', header: 'Head', render: (r) => r.headName || '—' },
            ]}
            data={departments.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Positions</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="positionCode" label="Code">
              <Input
                id="positionCode"
                value={positionCode}
                onChange={(e) => setPositionCode(e.target.value)}
              />
            </FormField>
            <FormField id="positionName" label="Name">
              <Input
                id="positionName"
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={
                  !positionCode.trim() || !positionName.trim() || createPositionMutation.isPending
                }
                onClick={() => createPositionMutation.mutate()}
              >
                Add position
              </Button>
            </div>
          </div>
          <DataTable
            label="Positions"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
            ]}
            data={positions.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Subject areas</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <FormField id="areaCollege" label="College (optional)">
              <Select
                id="areaCollege"
                value={areaCollegeId}
                onChange={(e) => setAreaCollegeId(e.target.value)}
              >
                <option value="">None</option>
                {(colleges.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="areaCode" label="Code">
              <Input id="areaCode" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} />
            </FormField>
            <FormField id="areaName" label="Name">
              <Input id="areaName" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!areaCode.trim() || !areaName.trim() || createAreaMutation.isPending}
                onClick={() => createAreaMutation.mutate()}
              >
                Add subject area
              </Button>
            </div>
          </div>
          <DataTable
            label="Subject areas"
            columns={[
              { key: 'collegeCode', header: 'College', render: (r) => r.collegeCode || '—' },
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
            ]}
            data={subjectAreas.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Employee assignments</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="assignUserId" label="Platform user id">
              <Input
                id="assignUserId"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              />
            </FormField>
            <FormField id="assignName" label="Display name">
              <Input
                id="assignName"
                value={assignName}
                onChange={(e) => setAssignName(e.target.value)}
              />
            </FormField>
            <FormField id="assignCollege" label="College">
              <Select
                id="assignCollege"
                value={assignCollegeId}
                onChange={(e) => setAssignCollegeId(e.target.value)}
              >
                <option value="">Optional</option>
                {(colleges.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="assignDept" label="Academic department">
              <Select
                id="assignDept"
                value={assignDeptId}
                onChange={(e) => setAssignDeptId(e.target.value)}
              >
                <option value="">Optional</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="assignPosition" label="Position">
              <Select
                id="assignPosition"
                value={assignPositionId}
                onChange={(e) => setAssignPositionId(e.target.value)}
              >
                <option value="">Optional</option>
                {(positions.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignHead}
                  onChange={(e) => setAssignHead(e.target.checked)}
                />
                Department head
              </label>
              <Button
                type="button"
                disabled={!assignUserId.trim() || createAssignMutation.isPending}
                onClick={() => createAssignMutation.mutate()}
              >
                Assign employee
              </Button>
            </div>
          </div>
          <DataTable
            label="Employee assignments"
            columns={[
              { key: 'platformUserId', header: 'User id' },
              { key: 'displayName', header: 'Name', render: (r) => r.displayName || '—' },
              { key: 'collegeCode', header: 'College', render: (r) => r.collegeCode || '—' },
              {
                key: 'academicDepartmentCode',
                header: 'Department',
                render: (r) => r.academicDepartmentCode || '—',
              },
              { key: 'positionCode', header: 'Position', render: (r) => r.positionCode || '—' },
              {
                key: 'isDepartmentHead',
                header: 'Head',
                render: (r) => (r.isDepartmentHead ? 'yes' : 'no'),
              },
            ]}
            data={assignments.data ?? []}
            keyExtractor={(r) => r.id}
          />
        </div>
      </CardContent>
    </Card>
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
        <CardTitle>Institutional profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="legalName" label="Legal name">
          <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </FormField>
        <FormField id="displayName" label="Display name">
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
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
            <Input
              id="instSigTitle"
              value={sigTitle}
              onChange={(e) => setSigTitle(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={!legalName.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save profile
        </Button>
      </CardContent>
    </Card>
  )
}

function RegistrarFacilitiesPanel() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const categories = useQuery({
    queryKey: ['reg', 'room-categories'],
    queryFn: fetchRoomCategories,
  })
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
    onError: (err) =>
      notify({ tone: 'danger', title: 'Building failed', description: getApiErrorMessage(err) }),
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
    onError: (err) =>
      notify({ tone: 'danger', title: 'Room failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buildings and rooms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="categoryCode" label="Category code">
            <Input
              id="categoryCode"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
            />
          </FormField>
          <FormField id="categoryName" label="Category name">
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={
            !categoryCode.trim() || !categoryName.trim() || createCategoryMutation.isPending
          }
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
            <Input
              id="buildingCode"
              value={buildingCode}
              onChange={(e) => setBuildingCode(e.target.value)}
            />
          </FormField>
          <FormField id="buildingName" label="Building name">
            <Input
              id="buildingName"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={
            !buildingCode.trim() || !buildingName.trim() || createBuildingMutation.isPending
          }
          onClick={() => createBuildingMutation.mutate()}
        >
          Add building
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="roomBuildingId" label="Building">
            <Select
              id="roomBuildingId"
              value={roomBuildingId}
              onChange={(e) => setRoomBuildingId(e.target.value)}
            >
              <option value="">Select building…</option>
              {(buildings.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="roomCategoryId" label="Room category">
            <Select
              id="roomCategoryId"
              value={roomCategoryId}
              onChange={(e) => setRoomCategoryId(e.target.value)}
            >
              <option value="">Optional category…</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="roomCapacity" label="Capacity">
            <Input
              id="roomCapacity"
              value={roomCapacity}
              onChange={(e) => setRoomCapacity(e.target.value)}
            />
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
              {
                key: 'capacity',
                header: 'Cap.',
                render: (r) => (r.capacity != null ? String(r.capacity) : '—'),
              },
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
  const policies = useQuery({
    queryKey: ['reg', 'academic-policies'],
    queryFn: fetchAcademicPolicies,
  })
  const [gradeDisplayMode, setGradeDisplayMode] = useState<
    'immediate' | 'after_deadline' | 'manual_release'
  >('after_deadline')
  const [approvalSteps, setApprovalSteps] = useState('adviser, assessment, registrar')
  const [sigDocType, setSigDocType] = useState('grade_report')
  const [sigRole, setSigRole] = useState('registrar')
  const [sigName, setSigName] = useState('')
  const [nextTermOpen, setNextTermOpen] = useState(false)

  useEffect(() => {
    if (!policies.data) return
    setGradeDisplayMode(policies.data.gradeDisplayMode)
    setApprovalSteps(policies.data.enrollmentApprovalSteps.join(', '))
    setNextTermOpen(Boolean(policies.data.nextTermEnrollmentOpen))
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
        nextTermEnrollmentOpen: nextTermOpen,
      }),
    onSuccess: () => notify({ tone: 'success', title: 'Academic policies saved' }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Policies failed', description: getApiErrorMessage(err) }),
  })
  const toggleNextTerm = useMutation({
    mutationFn: (open: boolean) =>
      updateAcademicPolicies({
        gradeDisplayMode,
        enrollmentApprovalSteps: approvalSteps
          .split(',')
          .map((step) => step.trim())
          .filter(Boolean),
        gradeDocumentSignatories: sigName.trim()
          ? [{ docType: sigDocType.trim(), role: sigRole.trim(), name: sigName.trim() }]
          : policies.data?.gradeDocumentSignatories ?? [],
        nextTermEnrollmentOpen: open,
      }),
    onSuccess: (saved) => {
      setNextTermOpen(saved.nextTermEnrollmentOpen)
      notify({
        tone: 'success',
        title: saved.nextTermEnrollmentOpen ? 'Next term enrollment is open' : 'Next term enrollment is closed',
      })
    },
    onError: (err, open) => {
      setNextTermOpen(!open)
      notify({ tone: 'danger', title: 'Enrollment window was not saved', description: getApiErrorMessage(err) })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment and grade display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-3 text-sm" htmlFor="next-term-enrollment">
          <input
            id="next-term-enrollment"
            data-testid="next-term-enrollment-toggle"
            className="mt-1"
            type="checkbox"
            checked={nextTermOpen}
            disabled={!policies.data || toggleNextTerm.isPending}
            onChange={(event) => {
              const open = event.target.checked
              setNextTermOpen(open)
              toggleNextTerm.mutate(open)
            }}
          />
          <span>
            <span className="font-medium">Allow currently enrolled students to start the next term</span>
            <span className="mt-1 block text-[var(--color-muted-foreground)]">
              Turn this on after the semester ends. While it is off, a student who is already enrolled cannot start another enrollment.
            </span>
          </span>
        </label>
        <FormField id="approvalSteps" label="Enrollment approval steps (comma-separated)">
          <Input
            id="approvalSteps"
            value={approvalSteps}
            onChange={(e) => setApprovalSteps(e.target.value)}
          />
        </FormField>
        <FormField id="gradeDisplayMode" label="Grade display mode">
          <Select
            id="gradeDisplayMode"
            value={gradeDisplayMode}
            onChange={(e) =>
              setGradeDisplayMode(
                e.target.value as 'immediate' | 'after_deadline' | 'manual_release'
              )
            }
          >
            <option value="immediate">Immediate</option>
            <option value="after_deadline">After encoding deadline</option>
            <option value="manual_release">Manual release</option>
          </Select>
        </FormField>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField id="sigDocType" label="Signatory document">
            <Input
              id="sigDocType"
              value={sigDocType}
              onChange={(e) => setSigDocType(e.target.value)}
            />
          </FormField>
          <FormField id="sigRole" label="Signatory role">
            <Input id="sigRole" value={sigRole} onChange={(e) => setSigRole(e.target.value)} />
          </FormField>
          <FormField id="sigName" label="Signatory name">
            <Input id="sigName" value={sigName} onChange={(e) => setSigName(e.target.value)} />
          </FormField>
        </div>
        <Button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save policies
        </Button>
      </CardContent>
    </Card>
  )
}

function RegistrarSectionSlotTools(props: {
  sections: Array<{ id: string; code: string; name: string }>
}) {
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
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null)
  const [capacityEdit, setCapacityEdit] = useState('40')
  const [waitlistOn, setWaitlistOn] = useState(false)
  const [storedConflictText, setStoredConflictText] = useState('')

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
  const roster = useQuery({
    queryKey: ['reg', 'section-roster', sectionId],
    queryFn: () => fetchSectionRoster(sectionId),
    enabled: Boolean(sectionId),
  })
  const waitlist = useQuery({
    queryKey: ['reg', 'section-waitlist', sectionId],
    queryFn: () => fetchSectionWaitlist(sectionId),
    enabled: Boolean(sectionId),
  })

  useEffect(() => {
    if (!summary.data) return
    setCapacityEdit(String(summary.data.capacity ?? 0))
    setWaitlistOn(Boolean(summary.data.waitlistEnabled))
  }, [summary.data])

  const refresh = () => {
    void summary.refetch()
    void meetings.refetch()
    void roster.refetch()
    void waitlist.refetch()
    void queryClient.invalidateQueries({ queryKey: ['reg', 'sections'] })
  }

  const capacityMutation = useMutation({
    mutationFn: () =>
      patchSection(sectionId, {
        capacity: Number(capacityEdit) || 0,
        waitlistEnabled: waitlistOn,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Capacity / waitlist saved' })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Save failed', description: getApiErrorMessage(err) }),
  })

  const promoteMutation = useMutation({
    mutationFn: () => promoteSectionWaitlist(sectionId),
    onSuccess: (data) => {
      notify({
        tone: data.promoted ? 'success' : 'warning',
        title: data.promoted ? 'Waitlist promoted' : 'No promotion',
        description: data.promoted ? data.entryId : data.reason,
      })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Promote failed', description: getApiErrorMessage(err) }),
  })

  const storedConflictMutation = useMutation({
    mutationFn: () => reviewStoredSectionConflicts(sectionId),
    onSuccess: (data) => {
      const detail = data.conflicts.map((row) => row.message).join('; ')
      const summary =
        data.meetingsChecked === 0
          ? `${data.sectionCode}: no stored meeting slots. No overlap was found. The section was not changed.`
          : data.ok
            ? `${data.sectionCode}: ${data.meetingsChecked} stored slot(s) checked. No room or faculty overlap. The section was not changed.`
            : `${data.sectionCode}: ${detail}. The section was not changed.`
      setStoredConflictText(summary)
      notify({ tone: data.ok ? 'success' : 'warning', title: 'Stored slots checked' })
    },
    onError: (err) => {
      setStoredConflictText('')
      notify({ tone: 'danger', title: 'Conflict check failed', description: getApiErrorMessage(err) })
    },
  })
  const conflictCheckMutation = useMutation({
    mutationFn: () =>
      checkMeetingSlotConflicts(sectionId, {
        dayOfWeek: Number(dayOfWeek),
        startMinute: Number(startMinute),
        endMinute: Number(endMinute),
        roomCode: roomCode.trim() || undefined,
      }),
    onSuccess: (data) => {
      if (data.ok) notify({ tone: 'success', title: 'No room/faculty conflict for this slot' })
      else
        notify({
          tone: 'warning',
          title: 'Slot conflicts detected',
          description: data.conflicts.map((c) => c.message).join('; '),
        })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Conflict check failed',
        description: getApiErrorMessage(err),
      }),
  })

  const addMeetingMutation = useMutation({
    mutationFn: () =>
      addSectionMeeting(sectionId, {
        dayOfWeek: Number(dayOfWeek),
        startMinute: Number(startMinute),
        endMinute: Number(endMinute),
        roomCode: roomCode.trim() || undefined,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Meeting slot added — students/faculty notified' })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Add failed', description: getApiErrorMessage(err) }),
  })

  const updateMeetingMutation = useMutation({
    mutationFn: () =>
      updateSectionMeeting(editMeetingId!, {
        dayOfWeek: Number(dayOfWeek),
        startMinute: Number(startMinute),
        endMinute: Number(endMinute),
        roomCode: roomCode.trim() || null,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Meeting updated — students/faculty notified' })
      setEditMeetingId(null)
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Update failed', description: getApiErrorMessage(err) }),
  })

  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: string) => deleteSectionMeeting(meetingId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Meeting removed — students/faculty notified' })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Remove failed', description: getApiErrorMessage(err) }),
  })

  const dropMutation = useMutation({
    mutationFn: () => dropSectionEnrollmentLine(sectionId, { enrollmentLineId: lineId.trim() }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: data.promotedWaitlistEntryId
          ? 'Dropped — waitlist promoted'
          : 'Student dropped from section',
      })
      setLineId('')
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Drop failed', description: getApiErrorMessage(err) }),
  })

  const transferMutation = useMutation({
    mutationFn: () =>
      transferSectionEnrollmentLine(sectionId, {
        enrollmentLineId: lineId.trim(),
        toSectionId: transferTargetId.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Student transferred — notifications queued' })
      setLineId('')
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Transfer failed', description: getApiErrorMessage(err) }),
  })

  const dissolveMutation = useMutation({
    mutationFn: () => dissolveSection(sectionId, dissolveReason.trim() || undefined),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Section dissolved (${data.droppedLines} lines dropped)` })
      refresh()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Dissolve failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Section slot tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Capacity and waitlist, conflict-checked meeting slots, drop/transfer/dissolve — affected
          students and faculty are notified. Waitlist promotion policy remains
          university-configurable.
        </p>
        <FormField id="slotSection" label="Section">
          <SearchableSelect
            id="slotSection"
            value={sectionId}
            onChange={setSectionId}
            placeholder="Search section code or name…"
            options={props.sections.map((s) => ({
              value: s.id,
              label: `${s.code} — ${s.name}`,
            }))}
          />
        </FormField>
        {sectionId && summary.data ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {summary.data.sectionCode}: {summary.data.seated}/{summary.data.capacity} seated ·
            waitlist {summary.data.waitlistCount}
            {summary.data.waitlistEnabled ? '' : ' (off)'}
          </p>
        ) : null}
        {sectionId ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField id="slotCapacity" label="Capacity">
                <Input
                  id="slotCapacity"
                  value={capacityEdit}
                  onChange={(e) => setCapacityEdit(e.target.value)}
                />
              </FormField>
              <FormField id="slotWaitlist" label="Waitlist enabled">
                <Select
                  id="slotWaitlist"
                  value={waitlistOn ? 'yes' : 'no'}
                  onChange={(e) => setWaitlistOn(e.target.value === 'yes')}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </FormField>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={capacityMutation.isPending}
                  onClick={() => capacityMutation.mutate()}
                >
                  Save capacity / waitlist
                </Button>
              </div>
            </div>
            {(waitlist.data ?? []).length > 0 ? (
              <div className="space-y-2">
                <DataTable
                  label="Section waitlist"
                  columns={[
                    { key: 'position', header: '#' },
                    { key: 'studentNumber', header: 'Student #' },
                    { key: 'studentName', header: 'Name' },
                  ]}
                  data={waitlist.data ?? []}
                  keyExtractor={(r) => r.id}
                />
                <Button
                  type="button"
                  disabled={promoteMutation.isPending}
                  onClick={() => promoteMutation.mutate()}
                >
                  Promote next waiter
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No students waiting on this section.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="slotDay" label="Day (0=Sun)">
                <Input
                  id="slotDay"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                />
              </FormField>
              <FormField id="slotRoom" label="Room code">
                <Input
                  id="slotRoom"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </FormField>
              <FormField id="slotStart" label="Start minute">
                <Input
                  id="slotStart"
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                />
              </FormField>
              <FormField id="slotEnd" label="End minute">
                <Input
                  id="slotEnd"
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!sectionId || storedConflictMutation.isPending}
                onClick={() => storedConflictMutation.mutate()}
              >
                Check stored section conflicts
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={conflictCheckMutation.isPending}
                onClick={() => conflictCheckMutation.mutate()}
              >
                Check room/faculty conflicts
              </Button>
              <Button
                type="button"
                disabled={addMeetingMutation.isPending}
                onClick={() => addMeetingMutation.mutate()}
              >
                Add meeting slot
              </Button>
              {editMeetingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={updateMeetingMutation.isPending}
                  onClick={() => updateMeetingMutation.mutate()}
                >
                  Save meeting edit
                </Button>
              ) : null}
            </div>
            {storedConflictText ? (
              <p className="text-sm" data-testid="section-conflict-result">
                {storedConflictText}
              </p>
            ) : null}
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
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditMeetingId(r.id)
                            setDayOfWeek(String(r.dayOfWeek))
                            setStartMinute(String(r.startMinute))
                            setEndMinute(String(r.endMinute))
                            setRoomCode(r.roomCode ?? '')
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deleteMeetingMutation.isPending}
                          onClick={() => deleteMeetingMutation.mutate(r.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={meetings.data ?? []}
                keyExtractor={(r) => r.id}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No meeting slots yet.</p>
            )}
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Section roster</h3>
            {(roster.data ?? []).length ? (
              <DataTable
                label="Section roster"
                columns={[
                  { key: 'studentName', header: 'Student', render: (r) => r.studentName ?? '—' },
                  { key: 'studentNumber', header: 'Number', render: (r) => r.studentNumber ?? '—' },
                  { key: 'status', header: 'Status' },
                  {
                    key: 'pick',
                    header: 'Select',
                    render: (r) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLineId(r.enrollmentLineId)}
                      >
                        Use for drop/transfer
                      </Button>
                    ),
                  },
                ]}
                data={roster.data ?? []}
                keyExtractor={(r) => r.enrollmentLineId}
              />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No enrolled students in this section.
              </p>
            )}
            <FormField id="enrollmentLineId" label="Enrollment line ID (drop / transfer)">
              <Input
                id="enrollmentLineId"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
              />
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
              <FormField id="transferSectionId" label="Transfer to section">
                <Select
                  id="transferSectionId"
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                >
                  <option value="">Select target…</option>
                  {props.sections
                    .filter((s) => s.id !== sectionId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                </Select>
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
              <Input
                id="dissolveReason"
                value={dissolveReason}
                onChange={(e) => setDissolveReason(e.target.value)}
              />
            </FormField>
            <Button
              type="button"
              variant="destructive"
              disabled={dissolveMutation.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    'Dissolve this section? Enrolled students will be dropped and notifications queued. This cannot be undone.'
                  )
                ) {
                  return
                }
                dissolveMutation.mutate()
              }}
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
    <RequirePermission anyOf={['academic.read', 'academic.write']}>
      <RegistrarCurriculumInner />
    </RequirePermission>
  )
}

type CurriculumEditTarget =
  | { kind: 'curriculum'; row: { id: string; code: string; name: string } }
  | {
      kind: 'subject'
      row: {
        id: string
        subjectCode: string
        title: string
        units: number
        lectureHours?: number | null
        laboratoryHours?: number | null
      }
    }

function CurriculumCatalogEditor({
  target,
  onClose,
}: {
  target: CurriculumEditTarget
  onClose: () => void
}) {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const [code, setCode] = useState(target.kind === 'curriculum' ? target.row.code : target.row.subjectCode)
  const [name, setName] = useState(target.kind === 'curriculum' ? target.row.name : target.row.title)
  const [units, setUnits] = useState(target.kind === 'subject' ? String(target.row.units) : '3')
  const [lectureHours, setLectureHours] = useState(
    target.kind === 'subject' ? String(target.row.lectureHours ?? 0) : '0'
  )
  const [labHours, setLabHours] = useState(
    target.kind === 'subject' ? String(target.row.laboratoryHours ?? 0) : '0'
  )
  const mutation = useMutation({
    mutationFn: async () => {
      if (target.kind === 'curriculum') {
        await updateCurriculum(target.row.id, { code: code.trim(), name: name.trim() })
        return
      }
      await updateSubjectCatalog(target.row.id, {
        subjectCode: code.trim(),
        title: name.trim(),
        units: Number(units) || 0,
        lectureHours: Number(lectureHours) || 0,
        laboratoryHours: Number(labHours) || 0,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: target.kind === 'curriculum' ? 'Curriculum updated' : 'Subject updated' })
      void qc.invalidateQueries({ queryKey: ['reg', 'curricula'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'subjects'] })
      onClose()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Update failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{target.kind === 'curriculum' ? 'Edit curriculum' : 'Edit subject'}</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-4xl gap-3 md:grid-cols-2">
        <FormField id="catalogEditCode" label="Code" required>
          <Input id="catalogEditCode" value={code} onChange={(e) => setCode(e.target.value)} />
        </FormField>
        <FormField id="catalogEditName" label={target.kind === 'curriculum' ? 'Name' : 'Title'} required>
          <Input id="catalogEditName" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        {target.kind === 'subject' ? (
          <>
            <FormField id="catalogEditUnits" label="Units">
              <Input id="catalogEditUnits" value={units} onChange={(e) => setUnits(e.target.value)} />
            </FormField>
            <FormField id="catalogEditLec" label="Lecture hours">
              <Input
                id="catalogEditLec"
                value={lectureHours}
                onChange={(e) => setLectureHours(e.target.value)}
              />
            </FormField>
            <FormField id="catalogEditLab" label="Lab hours">
              <Input id="catalogEditLab" value={labHours} onChange={(e) => setLabHours(e.target.value)} />
            </FormField>
          </>
        ) : null}
        <div className="flex items-end gap-2">
          <Button type="button" disabled={!code.trim() || !name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RegistrarCurriculumInner() {
  const canWrite = useHasPermission('academic.write')
  const { notify } = useNotification()
  const qc = useQueryClient()
  const controls = useListControls()
  const subjects = usePaginatedQuery({
    queryKey: ['reg', 'subjects', controls.debouncedSearch, controls.page],
    queryFn: () =>
      fetchSubjects({
        search: controls.debouncedSearch || undefined,
        page: controls.page,
        limit: controls.pageSize,
      }),
  })
  const subjectOptions = usePaginatedQuery({
    queryKey: ['reg', 'subjects', 'options'],
    queryFn: () => fetchSubjects({ page: 1, limit: 100 }),
  })
  const programs = usePaginatedQuery({
    queryKey: ['reg', 'programs', 'options'],
    queryFn: () => fetchPrograms({ page: 1, limit: 100 }),
  })
  const curricula = useQuery({ queryKey: ['reg', 'curricula'], queryFn: () => fetchCurricula() })
  const subjectRows = subjectOptions.data?.data ?? []
  const programRows = programs.data?.data ?? []

  const [subjectCode, setSubjectCode] = useState('')
  const [subjectTitle, setSubjectTitle] = useState('')
  const [units, setUnits] = useState('3')
  const [lectureHours, setLectureHours] = useState('3')
  const [labHours, setLabHours] = useState('0')
  const [prereqSubjectId, setPrereqSubjectId] = useState('')
  const [requiresSubjectId, setRequiresSubjectId] = useState('')

  const [programId, setProgramId] = useState('')
  const [currCode, setCurrCode] = useState('')
  const [currName, setCurrName] = useState('')
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [dupLabel, setDupLabel] = useState('')
  const [addSubjectId, setAddSubjectId] = useState('')
  const [editing, setEditing] = useState<CurriculumEditTarget | null>(null)

  const prereqs = useQuery({
    queryKey: ['reg', 'subject-prereqs', prereqSubjectId],
    queryFn: () => fetchSubjectPrerequisites(prereqSubjectId),
    enabled: !!prereqSubjectId,
  })
  const versionSubjects = useQuery({
    queryKey: ['reg', 'curriculum-version-subjects', selectedVersionId],
    queryFn: () => fetchCurriculumVersionSubjects(selectedVersionId),
    enabled: !!selectedVersionId,
  })

  const createSubjectMutation = useMutation({
    mutationFn: () =>
      createSubject({
        subjectCode: subjectCode.trim(),
        title: subjectTitle.trim(),
        units: Number(units) || 3,
        lectureHours: Number(lectureHours) || 0,
        laboratoryHours: Number(labHours) || 0,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Subject created' })
      setSubjectCode('')
      setSubjectTitle('')
      void qc.invalidateQueries({ queryKey: ['reg', 'subjects'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Subject create failed',
        description: getApiErrorMessage(err),
      }),
  })

  const prereqMutation = useMutation({
    mutationFn: () => addSubjectPrerequisite(prereqSubjectId, requiresSubjectId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Prerequisite linked' })
      void qc.invalidateQueries({ queryKey: ['reg', 'subject-prereqs', prereqSubjectId] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Prerequisite failed',
        description: getApiErrorMessage(err),
      }),
  })

  const createCurrMutation = useMutation({
    mutationFn: () =>
      createCurriculum({
        programId,
        code: currCode.trim(),
        name: currName.trim(),
        versionLabel: '1.0',
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Curriculum created' })
      setCurrCode('')
      setCurrName('')
      void qc.invalidateQueries({ queryKey: ['reg', 'curricula'] })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Curriculum create failed',
        description: getApiErrorMessage(err),
      }),
  })

  const dupMutation = useMutation({
    mutationFn: () =>
      duplicateCurriculumVersion(selectedVersionId, {
        versionLabel: dupLabel.trim(),
        notes: `Revision from ${selectedVersionId}`,
      }),
    onSuccess: (row) => {
      notify({ tone: 'success', title: 'Curriculum version duplicated' })
      setDupLabel('')
      setSelectedVersionId(row.id)
      void qc.invalidateQueries({ queryKey: ['reg', 'curricula'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Duplicate failed', description: getApiErrorMessage(err) }),
  })

  const activateMutation = useMutation({
    mutationFn: () => activateCurriculumVersion(selectedVersionId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Curriculum version activated' })
      void qc.invalidateQueries({ queryKey: ['reg', 'curricula'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Activate failed', description: getApiErrorMessage(err) }),
  })

  const addLineMutation = useMutation({
    mutationFn: () =>
      addCurriculumVersionSubject(selectedVersionId, {
        subjectId: addSubjectId,
        yearLevel: 1,
        semester: 1,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Subject added to curriculum version' })
      void qc.invalidateQueries({
        queryKey: ['reg', 'curriculum-version-subjects', selectedVersionId],
      })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Add subject failed', description: getApiErrorMessage(err) }),
  })

  const deleteCurriculumMutation = useMutation({
    mutationFn: (id: string) => deleteCurriculum(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Curriculum deleted' })
      void qc.invalidateQueries({ queryKey: ['reg', 'curricula'] })
    },
  })
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Subject deleted' })
      void qc.invalidateQueries({ queryKey: ['reg', 'subjects'] })
    },
  })
  const removeLineMutation = useMutation({
    mutationFn: (lineId: string) => removeCurriculumVersionSubject(selectedVersionId, lineId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Subject removed from version' })
      void qc.invalidateQueries({
        queryKey: ['reg', 'curriculum-version-subjects', selectedVersionId],
      })
    },
  })
  const removePrereqMutation = useMutation({
    mutationFn: (linkId: string) => removeSubjectPrerequisite(prereqSubjectId, linkId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Prerequisite removed' })
      void qc.invalidateQueries({ queryKey: ['reg', 'subject-prereqs', prereqSubjectId] })
    },
  })

  const allVersions = (curricula.data ?? []).flatMap((c) =>
    (c.versions ?? []).map((v) => ({ ...v, curriculumCode: c.code, programCode: c.programCode }))
  )

  return (
    <div className="space-y-6">
      {editing ? (
        <CurriculumCatalogEditor
          key={`${editing.kind}-${editing.row.id}`}
          target={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Curriculum versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Maintain program curricula with version history, duplication for revisions, and subject
            placement. Subject catalog hours and prerequisites are managed below.
          </p>
          {canWrite ? (
          <div className="grid gap-3 md:grid-cols-4">
            <FormField id="currProgram" label="Program">
              <SearchableSelect
                id="currProgram"
                value={programId}
                onChange={setProgramId}
                placeholder="Search program code or name…"
                options={programRows.map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                }))}
              />
            </FormField>
            <FormField id="currCode" label="Curriculum code">
              <Input id="currCode" value={currCode} onChange={(e) => setCurrCode(e.target.value)} />
            </FormField>
            <FormField id="currName" label="Curriculum name">
              <Input id="currName" value={currName} onChange={(e) => setCurrName(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={
                  !programId || !currCode.trim() || !currName.trim() || createCurrMutation.isPending
                }
                onClick={() => createCurrMutation.mutate()}
              >
                Create curriculum
              </Button>
            </div>
          </div>
          ) : null}

          <DataTable
            label="Curricula"
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Name' },
              { key: 'programCode', header: 'Program', render: (r) => r.programCode || '—' },
              {
                key: 'versions',
                header: 'Versions',
                render: (r) =>
                  (r.versions ?? []).map((v) => `${v.versionLabel} (${v.status})`).join(', ') ||
                  '—',
              },
            ]}
            actions={
              canWrite
                ? (row) => (
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ kind: 'curriculum', row })}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deleteCurriculumMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm(
                            `Delete ${row.code}? Active curricula and curricula that still list subjects stay in place.`
                          )
                          if (!ok) return
                          deleteCurriculumMutation.mutate(row.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )
                : undefined
            }
            data={curricula.data ?? []}
            keyExtractor={(r) => r.id}
          />

          <div className="grid gap-3 md:grid-cols-4">
            <FormField id="versionPick" label="Version">
              <SearchableSelect
                id="versionPick"
                value={selectedVersionId}
                onChange={setSelectedVersionId}
                placeholder="Search curriculum version…"
                options={allVersions.map((v) => ({
                  value: v.id,
                  label: `${v.curriculumCode} ${v.versionLabel} (${v.status})`,
                }))}
              />
            </FormField>
            {canWrite ? (
              <>
                <FormField id="dupLabel" label="New version label">
                  <Input id="dupLabel" value={dupLabel} onChange={(e) => setDupLabel(e.target.value)} />
                </FormField>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    disabled={!selectedVersionId || !dupLabel.trim() || dupMutation.isPending}
                    onClick={() => dupMutation.mutate()}
                  >
                    Duplicate / revise
                  </Button>
                  <Button
                    type="button"
                    disabled={!selectedVersionId || activateMutation.isPending}
                    onClick={() => activateMutation.mutate()}
                  >
                    Activate
                  </Button>
                </div>
              </>
            ) : null}
          </div>

          {selectedVersionId ? (
            <div className="space-y-3">
              {canWrite ? (
              <div className="grid gap-3 md:grid-cols-3">
                <FormField id="addSubjectToVersion" label="Add subject to version">
                  <SearchableSelect
                    id="addSubjectToVersion"
                    value={addSubjectId}
                    onChange={setAddSubjectId}
                    placeholder="Search subject code or title…"
                    options={subjectRows.map((s) => ({
                      value: s.id,
                      label: `${s.subjectCode} — ${s.title}`,
                    }))}
                  />
                </FormField>
                <div className="flex items-end">
                  <Button
                    type="button"
                    disabled={!addSubjectId || addLineMutation.isPending}
                    onClick={() => addLineMutation.mutate()}
                  >
                    Add to version
                  </Button>
                </div>
              </div>
              ) : null}
              <DataTable
                label="Version subjects"
                columns={[
                  { key: 'subjectCode', header: 'Code', render: (r) => r.subjectCode || '—' },
                  { key: 'title', header: 'Title', render: (r) => r.title || '—' },
                  { key: 'units', header: 'Units', render: (r) => r.units ?? '—' },
                  { key: 'yearLevel', header: 'Year' },
                  { key: 'semester', header: 'Sem' },
                ]}
                actions={
                  canWrite
                    ? (row) => (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={removeLineMutation.isPending}
                          onClick={() => {
                            const ok = window.confirm(
                              `Remove ${row.subjectCode || 'this subject'} from the version?`
                            )
                            if (!ok) return
                            removeLineMutation.mutate(row.id)
                          }}
                        >
                          Remove
                        </Button>
                      )
                    : undefined
                }
                data={versionSubjects.data ?? []}
                keyExtractor={(r) => r.id}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite ? (
            <>
          <div className="grid gap-3 md:grid-cols-5">
            <FormField id="newSubjectCode" label="Code">
              <Input
                id="newSubjectCode"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
              />
            </FormField>
            <FormField id="newSubjectTitle" label="Title">
              <Input
                id="newSubjectTitle"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
              />
            </FormField>
            <FormField id="newUnits" label="Units">
              <Input id="newUnits" value={units} onChange={(e) => setUnits(e.target.value)} />
            </FormField>
            <FormField id="newLec" label="Lecture hours">
              <Input
                id="newLec"
                value={lectureHours}
                onChange={(e) => setLectureHours(e.target.value)}
              />
            </FormField>
            <FormField id="newLab" label="Lab hours">
              <Input id="newLab" value={labHours} onChange={(e) => setLabHours(e.target.value)} />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={
              !subjectCode.trim() || !subjectTitle.trim() || createSubjectMutation.isPending
            }
            onClick={() => createSubjectMutation.mutate()}
          >
            Add subject
          </Button>
            </>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="prereqSubject" label="Subject">
              <SearchableSelect
                id="prereqSubject"
                value={prereqSubjectId}
                onChange={setPrereqSubjectId}
                placeholder="Search subject code or title…"
                options={subjectRows.map((s) => ({
                  value: s.id,
                  label: s.title ? `${s.subjectCode} — ${s.title}` : s.subjectCode,
                }))}
              />
            </FormField>
            {canWrite ? (
              <>
            <FormField id="requiresSubject" label="Requires (prerequisite)">
              <SearchableSelect
                id="requiresSubject"
                value={requiresSubjectId}
                onChange={setRequiresSubjectId}
                placeholder="Search prerequisite subject…"
                options={subjectRows
                  .filter((s) => s.id !== prereqSubjectId)
                  .map((s) => ({
                    value: s.id,
                    label: s.title ? `${s.subjectCode} — ${s.title}` : s.subjectCode,
                  }))}
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!prereqSubjectId || !requiresSubjectId || prereqMutation.isPending}
                onClick={() => prereqMutation.mutate()}
              >
                Link prerequisite
              </Button>
            </div>
              </>
            ) : null}
          </div>
          {prereqSubjectId ? (
            <p className="text-sm" data-testid="prerequisite-result">
              {prereqs.isFetching
                ? 'Reading the catalog…'
                : (prereqs.data ?? []).length === 0
                  ? 'No prerequisite is linked for this subject.'
                  : (prereqs.data ?? [])
                      .map((row) => `${row.subjectCode || 'subject'} · ${row.title || 'untitled'}`)
                      .join(' | ')}
            </p>
          ) : null}
          {prereqSubjectId ? (
            <DataTable
              label="Prerequisites"
              columns={[
                { key: 'subjectCode', header: 'Code', render: (r) => r.subjectCode || '—' },
                { key: 'title', header: 'Title', render: (r) => r.title || '—' },
              ]}
              actions={
                canWrite
                  ? (row) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={removePrereqMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm(`Remove prerequisite ${row.subjectCode || ''}?`)
                          if (!ok) return
                          removePrereqMutation.mutate(row.id)
                        }}
                      >
                        Remove
                      </Button>
                    )
                  : undefined
              }
              data={prereqs.data ?? []}
              keyExtractor={(r) => r.id}
            />
          ) : null}
        </CardContent>
      </Card>

      <QueryPage
        title="Subjects"
        query={subjects}
        search={controls.search}
        onSearchChange={controls.setSearch}
        page={controls.page}
        lastPage={subjects.data?.meta.lastPage}
        onPageChange={controls.setPage}
        isEmpty={(d) => d.data.length === 0}
      >
        {(page) => (
          <DataTable
            label="Subjects"
            columns={[
              { key: 'subjectCode', header: 'Code' },
              { key: 'title', header: 'Title' },
              { key: 'units', header: 'Units' },
              {
                key: 'lectureHours',
                header: 'Lec',
                render: (r) => r.lectureHours ?? '—',
              },
              {
                key: 'laboratoryHours',
                header: 'Lab',
                render: (r) => r.laboratoryHours ?? '—',
              },
            ]}
            actions={
              canWrite
                ? (row) => (
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ kind: 'subject', row })}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deleteSubjectMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm(
                            `Delete ${row.subjectCode}? Subjects already used by classes or curricula stay in place.`
                          )
                          if (!ok) return
                          deleteSubjectMutation.mutate(row.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )
                : undefined
            }
            data={page.data}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
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
  const controls = useListControls()
  const query = usePaginatedQuery({
    queryKey: ['reg', 'grades', controls.page],
    queryFn: () => fetchGrades({ page: controls.page, limit: controls.pageSize }),
  })
  return (
    <QueryPage
      title="Grade monitoring"
      query={query}
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <DataTable
          label="Grades"
          columns={[
            {
              key: 'studentNumber',
              header: 'Student #',
              className: 'whitespace-nowrap',
              render: (r) => r.student?.studentNumber ?? '—',
            },
            {
              key: 'name',
              header: 'Name',
              className: 'min-w-[10rem] whitespace-nowrap',
              render: (r) =>
                r.student?.lastName || r.student?.firstName
                  ? `${r.student.lastName ?? ''}, ${r.student.firstName ?? ''}`.replace(
                      /^,\s*|,\s*$/g,
                      ''
                    )
                  : '—',
            },
            { key: 'courseCode', header: 'Code', className: 'whitespace-nowrap' },
            { key: 'courseTitle', header: 'Course' },
            {
              key: 'markCode',
              header: 'Mark',
              className: 'whitespace-nowrap',
              render: (r) => r.markCode ?? r.grade ?? '—',
            },
            {
              key: 'status',
              header: 'Status',
              className: 'whitespace-nowrap',
              render: (r) => r.status ?? '—',
            },
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
    <RequirePermission anyOf={['deficiencies.read', 'assessments.read']}>
      <RegistrarRequirementsInner />
    </RequirePermission>
  )
}

function RegistrarAccountMonitorPanel() {
  const { notify } = useNotification()
  const [monitorStudentId, setMonitorStudentId] = useState('')
  const monitor = useQuery({
    queryKey: ['reg', 'account-monitor', monitorStudentId],
    queryFn: () => fetchStudentAccountMonitor(monitorStudentId),
    enabled: !!monitorStudentId,
  })
  const issue = useMutation({
    mutationFn: async () => {
      const enrollmentId = monitor.data?.latestAssessment?.enrollmentId
      if (!enrollmentId) throw new Error('No assessed enrollment for this student')
      return issueRegistrationDocument({ enrollmentId, docType: 'assessment_form' })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Assessment form issued' })
      void monitor.refetch()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Assessment form failed',
        description: getApiErrorMessage(err),
      }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student account monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Monitor enrollment deficiencies, tuition balances, and running grades. Issue a printable
          assessment form when an assessment exists.
        </p>
        <FormField id="monitorStudent" label="Student">
          <StudentSearchSelect
            id="monitorStudent"
            value={monitorStudentId}
            onChange={setMonitorStudentId}
            placeholder="Search name or student number…"
          />
        </FormField>
        {monitor.data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <DashboardCard title="Open deficiencies" value={monitor.data.openDeficiencyCount} />
              <DashboardCard
                title="Tuition balance"
                value={
                  monitor.data.tuitionBalance
                    ? Number(monitor.data.tuitionBalance.balanceAmount).toFixed(2)
                    : '—'
                }
              />
              <DashboardCard title="Running grades" value={monitor.data.runningGrades.length} />
            </div>
            <Button
              type="button"
              disabled={!monitor.data.latestAssessment || issue.isPending}
              onClick={() => issue.mutate()}
            >
              Issue assessment form
            </Button>
            <DataTable
              label="Deficiencies"
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
        ) : null}
      </CardContent>
    </Card>
  )
}

function RegistrarRequirementsInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['reg', 'deficiencies'], queryFn: () => fetchDeficiencies() })
  const compliance = useQuery({
    queryKey: ['reg', 'requirements-compliance'],
    queryFn: () => fetchRequirementsComplianceReport(),
  })

  const [studentId, setStudentId] = useState('')
  const [code, setCode] = useState('FORM-137')
  const [description, setDescription] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      createStudentRequirement({
        studentId,
        requirementCode: code.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Requirement added' })
      setDescription('')
      void qc.invalidateQueries({ queryKey: ['reg', 'deficiencies'] })
      void qc.invalidateQueries({ queryKey: ['reg', 'requirements-compliance'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Create failed', description: getApiErrorMessage(err) }),
  })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['reg', 'deficiencies'] })
    void qc.invalidateQueries({ queryKey: ['reg', 'requirements-compliance'] })
  }

  return (
    <div className="space-y-6">
      <RegistrarAccountMonitorPanel />
      <Card>
        <CardHeader>
          <CardTitle>Student requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add and track student requirements, submit for review, approve or reject, and generate a
            compliance report. Existing clear action remains available.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <FormField id="reqStudent" label="Student">
              <StudentSearchSelect
                id="reqStudent"
                value={studentId}
                onChange={setStudentId}
                placeholder="Search name or student number…"
              />
            </FormField>
            <FormField id="reqCode" label="Requirement code">
              <Input id="reqCode" value={code} onChange={(e) => setCode(e.target.value)} />
            </FormField>
            <FormField id="reqDesc" label="Description">
              <Input
                id="reqDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={
                  !studentId || !code.trim() || !description.trim() || createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                Add requirement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {compliance.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Compliance report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              {Object.entries(compliance.data.statusCounts).map(([status, total]) => (
                <DashboardCard key={status} title={status} value={total} />
              ))}
            </div>
            <DataTable
              label="Open by requirement code"
              columns={[
                { key: 'requirementCode', header: 'Code' },
                { key: 'total', header: 'Open/submitted/rejected' },
              ]}
              data={compliance.data.openByRequirementCode}
              keyExtractor={(r) => r.requirementCode}
            />
            <DataTable
              label="Non-compliant students"
              columns={[
                { key: 'studentNumber', header: 'Student #' },
                { key: 'name', header: 'Name' },
                { key: 'openCount', header: 'Open count' },
              ]}
              data={compliance.data.nonCompliantStudents}
              keyExtractor={(r) => r.studentId}
            />
          </CardContent>
        </Card>
      ) : null}

      <QueryPage title="Requirement queue" query={query} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Requirements"
            columns={[
              {
                key: 'studentNumber',
                header: 'Student',
                render: (r) => r.studentNumber || r.studentId.slice(0, 8),
              },
              { key: 'requirementCode', header: 'Code' },
              { key: 'description', header: 'Description' },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => {
                  const runAction = (
                    label: string,
                    action: () => Promise<unknown>,
                    confirmText?: string
                  ) => {
                    if (confirmText && !window.confirm(confirmText)) return
                    void action()
                      .then(() => {
                        notify({ tone: 'success', title: label })
                        refresh()
                      })
                      .catch((err) =>
                        notify({
                          tone: 'danger',
                          title: `${label} failed`,
                          description: getApiErrorMessage(err),
                        })
                      )
                  }
                  return (
                    <div className="flex flex-wrap gap-1">
                      {['open', 'rejected'].includes(r.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => runAction('Submitted', () => submitStudentRequirement(r.id))}
                        >
                          Submit
                        </Button>
                      ) : null}
                      {['open', 'submitted', 'rejected'].includes(r.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            runAction('Approved', () =>
                              approveStudentRequirement(r.id, 'Approved by registrar')
                            )
                          }
                        >
                          Approve
                        </Button>
                      ) : null}
                      {['open', 'submitted'].includes(r.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            runAction('Rejected', () =>
                              rejectStudentRequirement(r.id, 'Incomplete document')
                            )
                          }
                        >
                          Reject
                        </Button>
                      ) : null}
                      {r.status !== 'cleared' && r.status !== 'approved' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => runAction('Cleared', () => clearStudentRequirement(r.id))}
                        >
                          Clear
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          runAction(
                            'Deleted',
                            () => deleteStudentRequirement(r.id),
                            `Delete requirement ${r.requirementCode ?? r.id}? This cannot be undone.`
                          )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  )
                },
              },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

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
  const policies = useQuery({
    queryKey: ['reg', 'academic-policies'],
    queryFn: fetchAcademicPolicies,
  })
  const [studentId, setStudentId] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const enrollmentsQuery = useQuery({
    queryKey: ['reg', 'student-enrollments', studentId],
    queryFn: () => fetchEnrollments({ studentId, limit: 20 }),
    enabled: Boolean(studentId),
  })
  const enrollmentRows = enrollmentsQuery.data?.data ?? []

  useEffect(() => {
    if (!studentId || !enrollmentRows.length) {
      setEnrollmentId('')
      return
    }
    setEnrollmentId((current) => {
      if (enrollmentRows.some((row) => row.id === current)) return current
      return (enrollmentRows.find((row) => row.status !== 'registered') ?? enrollmentRows[0])?.id ?? ''
    })
  }, [studentId, enrollmentsQuery.data])

  const enrollmentQuery = useQuery({
    queryKey: ['reg', 'enrollment', enrollmentId],
    queryFn: () => fetchEnrollment(enrollmentId),
    enabled: Boolean(enrollmentId),
  })

  const refreshEnrollment = () => {
    void queryClient.invalidateQueries({ queryKey: ['reg', 'enrollment', enrollmentId] })
    void queryClient.invalidateQueries({ queryKey: ['reg', 'student-enrollments', studentId] })
    void queryClient.invalidateQueries({ queryKey: ['reg', 'enrollment-workflow'] })
  }

  const [registrationNotice, setRegistrationNotice] = useState('')
  const assessMutation = useMutation({
    mutationFn: () => assessEnrollment({ enrollmentId }),
    onSuccess: (data) => {
      const net = Number((data as { netAmount?: number }).netAmount ?? 0)
      notify({
        tone: 'success',
        title: 'Assessment prepared',
        description: net > 0 ? `Net assessed: ${net.toFixed(2)}` : undefined,
      })
      refreshEnrollment()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Assess failed', description: getApiErrorMessage(err) }),
  })
  const registerMutation = useMutation({
    mutationFn: () => registerEnrollment(enrollmentId),
    onSuccess: (row) => {
      const notice = (row as { enrollmentNotice?: { sent?: boolean; to?: string | null; reason?: string | null } | null })
        .enrollmentNotice
      const text = notice?.sent
        ? `Official enrollment email sent to ${notice.to}. No password was included.`
        : `Official enrollment saved. Confirmation email was not sent${notice?.reason ? `: ${notice.reason}` : ''}.`
      setRegistrationNotice(text)
      notify({
        tone: 'success',
        title: 'Enrollment registered',
        description: text,
      })
      refreshEnrollment()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Registration failed',
        description: getApiErrorMessage(err),
      }),
  })
  const verifyMutation = useMutation({
    mutationFn: () => verifyEnrollmentPayment(enrollmentId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Payment verified' })
      refreshEnrollment()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Payment not confirmed',
        description: getApiErrorMessage(
          err,
          'Collect the registration minimum at UFMS cashier, then verify again.'
        ),
      }),
  })
  const approveMutation = useMutation({
    mutationFn: () => approveRegistrarEnrollment(enrollmentId),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Registrar approval recorded' })
      refreshEnrollment()
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Registrar approve failed',
        description: getApiErrorMessage(err),
      }),
  })

  const enrollment = enrollmentQuery.data
  const steps = policies.data?.enrollmentApprovalSteps ?? []
  const registrarStepEnabled = steps.includes('registrar')
  const waitingForStudentCourse = Boolean(enrollment && enrollment.status === 'advised' && !enrollment.curriculumId)
  const canAssess = (enrollment?.status === 'advised' || enrollment?.status === 'incomplete') && !waitingForStudentCourse
  const continuingWithoutAdvising = Boolean(enrollment?.advisingWaived && !enrollment?.advisingWaiverId)
  const busy =
    assessMutation.isPending ||
    verifyMutation.isPending ||
    approveMutation.isPending ||
    registerMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {policies.data ? (
          <Alert variant="info">
            Configured approval steps: {steps.join(' → ')}
            {registrarStepEnabled ? '' : ' (registrar step off — approve button optional)'}
          </Alert>
        ) : null}
        <div className="grid max-w-md gap-3">
          <FormField id="registrationStudent" label="Student" required>
            <StudentSearchSelect
              id="registrationStudent"
              value={studentId}
              onChange={setStudentId}
              placeholder="Type a name or student number…"
            />
          </FormField>
          {studentId && enrollmentsQuery.isSuccess && enrollmentRows.length === 0 ? (
            <Alert variant="warning" title="No enrollment">
              This student has no enrollment to verify or register.
            </Alert>
          ) : null}
          {enrollmentRows.length > 1 ? (
            <FormField id="registrationEnrollment" label="Enrollment">
              <SearchableSelect
                id="registrationEnrollment"
                value={enrollmentId}
                onChange={setEnrollmentId}
                placeholder="Search year, semester, or status…"
                options={enrollmentRows.map((row) => ({
                  value: row.id,
                  label: `${row.student?.studentNumber ?? 'Student'} · Year ${row.yearLevel} Sem ${row.semester} · ${row.status}`,
                }))}
              />
            </FormField>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              data-testid="registration-assess"
              disabled={!enrollmentId || busy || !canAssess}
              onClick={() => assessMutation.mutate()}
            >
              Assess
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!enrollmentId || busy || enrollment?.status !== 'assessed'}
              onClick={() => verifyMutation.mutate()}
            >
              Verify payment
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!enrollmentId || busy || enrollment?.status !== 'payment_verified'}
              onClick={() => approveMutation.mutate()}
            >
              Registrar approve
            </Button>
            <Button
              type="button"
              disabled={
                !enrollmentId ||
                busy ||
                !(
                  enrollment?.status === 'registrar_approved' ||
                  (!registrarStepEnabled && enrollment?.status === 'payment_verified')
                )
              }
              onClick={() => registerMutation.mutate()}
            >
              Register enrollment
            </Button>
          </div>
          {enrollment && waitingForStudentCourse ? (
            <p className="text-sm" data-testid="registration-gate">
              Advising is endorsed. The student selects one of the advised courses before this enrollment can be assessed.
            </p>
          ) : null}
          {enrollment && ['draft', 'advising'].includes(String(enrollment.status)) ? (
            <p className="text-sm" data-testid="registration-gate">
              Academic advising is still current. The adviser endorses this draft, then registrar staff
              prepare the assessment. Payment cannot be verified before that assessment exists.
            </p>
          ) : null}
          {enrollment && canAssess && continuingWithoutAdvising ? (
            <p className="text-sm" data-testid="registration-gate">
              This student was previously enrolled, so advising is not part of this enrollment. Assess
              to continue to payment.
            </p>
          ) : null}
          {enrollment && canAssess && !continuingWithoutAdvising ? (
            <p className="text-sm" data-testid="registration-gate">
              Advising is endorsed. Assess this enrollment to continue to payment.
            </p>
          ) : null}
          {registrationNotice ? (
            <p className="text-sm" data-testid="enrollment-email-result">
              {registrationNotice}
            </p>
          ) : null}
        </div>
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
          <Alert variant="danger">Could not load enrollment for this student.</Alert>
        ) : null}
        <RegistrarEnrollmentWorkflowSection enrollmentId={enrollmentId} />
      </CardContent>
    </Card>
  )
}

const announcementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(1),
  audienceRoles: z.string().optional(),
  isPinned: z.boolean().optional(),
  publishMode: z.enum(['now', 'schedule', 'draft']),
  publishAt: z.string().optional(),
  expiresAt: z.string().optional(),
  deliverPortal: z.boolean().optional(),
  deliverEmail: z.boolean().optional(),
  deliverSms: z.boolean().optional(),
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
  const list = usePaginatedQuery({
    queryKey: ['reg', 'announcements', controls.page],
    queryFn: () => fetchAnnouncements({ page: controls.page, limit: controls.pageSize }),
  })
  const settings = useQuery({
    queryKey: ['reg', 'announcement-settings'],
    queryFn: fetchAnnouncementSettings,
  })
  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      body: '',
      audienceRoles: 'student',
      isPinned: false,
      publishMode: 'now',
      publishAt: '',
      expiresAt: '',
      deliverPortal: true,
      deliverEmail: false,
      deliverSms: false,
    },
  })
  const create = useMutation({
    mutationFn: (values: z.infer<typeof announcementSchema>) => {
      const roles = values.audienceRoles
        ? values.audienceRoles
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean)
        : undefined
      const publishNow = values.publishMode === 'now'
      return createAnnouncement({
        title: values.title,
        body: values.body,
        publishNow,
        isPinned: Boolean(values.isPinned),
        audience: roles?.length ? { roles } : {},
        deliverPortal: values.deliverPortal !== false,
        deliverEmail: Boolean(values.deliverEmail),
        deliverSms: Boolean(values.deliverSms),
        ...(values.publishMode === 'schedule' && values.publishAt
          ? { publishAt: new Date(values.publishAt).toISOString() }
          : {}),
        ...(values.expiresAt ? { expiresAt: new Date(values.expiresAt).toISOString() } : {}),
      })
    },
    onSuccess: (row) => {
      notify({
        tone: 'success',
        title:
          row.status === 'published'
            ? 'Announcement published'
            : `Announcement saved (${row.status})`,
      })
      form.reset({
        title: '',
        body: '',
        audienceRoles: 'student',
        isPinned: false,
        publishMode: 'now',
        publishAt: '',
        expiresAt: '',
        deliverPortal: true,
        deliverEmail: false,
        deliverSms: false,
      })
      qc.invalidateQueries({ queryKey: ['reg', 'announcements'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Could not save', description: getApiErrorMessage(err) }),
  })
  const smsDispatch = useMutation({
    mutationFn: (id: string) => dispatchAnnouncement(id, ['sms']),
    onSuccess: (result) => {
      const channels = (result as { channels?: Array<{ recipientCount: number; status: string }> })
        ?.channels
      const count = channels?.[0]?.recipientCount ?? 0
      notify({ tone: 'success', title: 'SMS dispatch queued', description: `${count} recipients` })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'SMS dispatch failed',
        description: getApiErrorMessage(err),
      }),
  })
  const emailDispatch = useMutation({
    mutationFn: (id: string) => dispatchAnnouncement(id, ['email']),
    onSuccess: (result) => {
      const channels = (result as { channels?: Array<{ recipientCount: number; status: string }> })
        ?.channels
      const count = channels?.[0]?.recipientCount ?? 0
      notify({
        tone: 'success',
        title: 'Email dispatch queued',
        description: `${count} recipients`,
      })
    },
    onError: (err) =>
      notify({
        tone: 'danger',
        title: 'Email dispatch failed',
        description: getApiErrorMessage(err),
      }),
  })
  const pinMutation = useMutation({
    mutationFn: (row: { id: string; isPinned: boolean }) =>
      updateAnnouncement(row.id, { isPinned: !row.isPinned }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Pin updated' })
      qc.invalidateQueries({ queryKey: ['reg', 'announcements'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Pin failed', description: getApiErrorMessage(err) }),
  })
  const publishMutation = useMutation({
    mutationFn: (id: string) => publishAnnouncement(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Announcement published' })
      qc.invalidateQueries({ queryKey: ['reg', 'announcements'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Publish failed', description: getApiErrorMessage(err) }),
  })
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveAnnouncement(id),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Announcement archived' })
      qc.invalidateQueries({ queryKey: ['reg', 'announcements'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Archive failed', description: getApiErrorMessage(err) }),
  })
  const settingsMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateAnnouncementSettings({ socialFeaturesEnabled: enabled }),
    onSuccess: (row) => {
      notify({
        tone: 'success',
        title: row.socialFeaturesEnabled ? 'Social features enabled' : 'Social features disabled',
      })
      qc.invalidateQueries({ queryKey: ['reg', 'announcement-settings'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Settings failed', description: getApiErrorMessage(err) }),
  })

  const campaigns = useQuery({
    queryKey: ['reg', 'mass-sms'],
    queryFn: () => fetchMassSmsCampaigns(1, 20),
  })
  const surveys = useQuery({
    queryKey: ['reg', 'surveys'],
    queryFn: () => fetchSurveys(1, 20),
  })
  const [smsTitle, setSmsTitle] = useState('Mass SMS notice')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsYearLevel, setSmsYearLevel] = useState('')
  const [smsEduLevel, setSmsEduLevel] = useState('')
  const [smsDept, setSmsDept] = useState('')
  const [smsSection, setSmsSection] = useState('')
  const [smsIncludeGuardians, setSmsIncludeGuardians] = useState(false)
  const [smsPreview, setSmsPreview] = useState<string | null>(null)
  const [pollTitle, setPollTitle] = useState('Campus poll')
  const [pollPrompt, setPollPrompt] = useState('How was your enrollment experience?')
  const [pollOptions, setPollOptions] = useState('Excellent,Good,Needs improvement')
  const [surveyResultText, setSurveyResultText] = useState<string | null>(null)

  const previewSms = useMutation({
    mutationFn: () =>
      previewMassSms({
        filters: {
          ...(smsYearLevel ? { yearLevels: [Number(smsYearLevel)] } : {}),
          ...(smsEduLevel ? { educationalLevels: [smsEduLevel.trim()] } : {}),
          ...(smsDept ? { departmentCodes: [smsDept.trim()] } : {}),
          ...(smsSection ? { sectionCodes: [smsSection.trim()] } : {}),
        },
        recipientKinds: smsIncludeGuardians
          ? ['student', 'parent', 'guardian', 'sponsor']
          : ['student'],
      }),
    onSuccess: (data) => {
      setSmsPreview(
        `${data.recipientCount} mobiles (${data.matchedStudents} students matched; ${data.studentMobiles} student + ${data.contactMobiles} contact)`
      )
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Preview failed', description: getApiErrorMessage(err) }),
  })
  const sendSms = useMutation({
    mutationFn: () =>
      queueMassSms({
        title: smsTitle,
        message: smsMessage,
        filters: {
          ...(smsYearLevel ? { yearLevels: [Number(smsYearLevel)] } : {}),
          ...(smsEduLevel ? { educationalLevels: [smsEduLevel.trim()] } : {}),
          ...(smsDept ? { departmentCodes: [smsDept.trim()] } : {}),
          ...(smsSection ? { sectionCodes: [smsSection.trim()] } : {}),
        },
        recipientKinds: smsIncludeGuardians
          ? ['student', 'parent', 'guardian', 'sponsor']
          : ['student'],
      }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: `SMS ${data.campaign.status}`,
        description: `${data.campaign.recipientCount} recipients queued (delivery mode queue_only)`,
      })
      setSmsMessage('')
      qc.invalidateQueries({ queryKey: ['reg', 'mass-sms'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Queue failed', description: getApiErrorMessage(err) }),
  })
  const createPoll = useMutation({
    mutationFn: () =>
      createSurvey({
        kind: 'poll',
        title: pollTitle,
        openNow: true,
        audience: { roles: ['student'] },
        questions: [
          {
            prompt: pollPrompt,
            questionType: 'single',
            options: pollOptions
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean),
          },
        ],
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Poll opened' })
      qc.invalidateQueries({ queryKey: ['reg', 'surveys'] })
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Poll failed', description: getApiErrorMessage(err) }),
  })

  const publishMode = form.watch('publishMode')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Announcements
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Notices, mass SMS with audience filters, and surveys/polls. SMS delivery mode is queue_only
        until a live provider is configured.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Communication settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Social features (likes / comments):{' '}
            <Badge>{settings.data?.socialFeaturesEnabled ? 'enabled' : 'disabled'}</Badge>
          </p>
          <Badge>SMS delivery: queue_only</Badge>
          <Button
            type="button"
            variant="secondary"
            disabled={settingsMutation.isPending}
            onClick={() =>
              settingsMutation.mutate(!(settings.data?.socialFeaturesEnabled ?? false))
            }
          >
            {settings.data?.socialFeaturesEnabled ? 'Disable social' : 'Enable social'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mass SMS</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-2">
          <FormField id="smsTitle" label="Campaign title">
            <Input id="smsTitle" value={smsTitle} onChange={(e) => setSmsTitle(e.target.value)} />
          </FormField>
          <FormField id="smsMessage" label="Message (max 640)">
            <Input
              id="smsMessage"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField id="smsYear" label="Year level">
              <Input
                id="smsYear"
                value={smsYearLevel}
                onChange={(e) => setSmsYearLevel(e.target.value)}
                placeholder="e.g. 1"
              />
            </FormField>
            <FormField id="smsEdu" label="Educational level">
              <Input
                id="smsEdu"
                value={smsEduLevel}
                onChange={(e) => setSmsEduLevel(e.target.value)}
                placeholder="e.g. bachelor"
              />
            </FormField>
            <FormField id="smsDept" label="Department code">
              <Input
                id="smsDept"
                value={smsDept}
                onChange={(e) => setSmsDept(e.target.value)}
                placeholder="Dept code"
              />
            </FormField>
            <FormField id="smsSection" label="Section code">
              <Input
                id="smsSection"
                value={smsSection}
                onChange={(e) => setSmsSection(e.target.value)}
                placeholder="Section code"
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={smsIncludeGuardians}
              onChange={(e) => setSmsIncludeGuardians(e.target.checked)}
            />
            Include parents / guardians / sponsors (opt-in contacts)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={previewSms.isPending}
              onClick={() => previewSms.mutate()}
            >
              Preview recipients
            </Button>
            <Button
              type="button"
              disabled={sendSms.isPending || !smsMessage.trim()}
              onClick={() => sendSms.mutate()}
            >
              Queue mass SMS
            </Button>
          </div>
          {smsPreview ? (
            <Alert variant="success" title="Preview">
              {smsPreview}
            </Alert>
          ) : null}
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {(campaigns.data ?? []).length} recent campaigns
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Surveys and polls</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-2">
          <FormField id="pollTitle" label="Poll title">
            <Input
              id="pollTitle"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
            />
          </FormField>
          <FormField id="pollPrompt" label="Question">
            <Input
              id="pollPrompt"
              value={pollPrompt}
              onChange={(e) => setPollPrompt(e.target.value)}
            />
          </FormField>
          <FormField id="pollOptions" label="Options (comma-separated)">
            <Input
              id="pollOptions"
              value={pollOptions}
              onChange={(e) => setPollOptions(e.target.value)}
            />
          </FormField>
          <Button type="button" disabled={createPoll.isPending} onClick={() => createPoll.mutate()}>
            Open poll now
          </Button>
          {(surveys.data ?? []).length ? (
            <DataTable
              label="Surveys"
              columns={[
                { key: 'title', header: 'Title', render: (r) => `${r.title} (${r.kind})` },
                { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      {r.status !== 'open' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await publishSurvey(r.id)
                            qc.invalidateQueries({ queryKey: ['reg', 'surveys'] })
                          }}
                        >
                          Publish
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await closeSurvey(r.id)
                            qc.invalidateQueries({ queryKey: ['reg', 'surveys'] })
                          }}
                        >
                          Close
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const res = await fetchSurveyResults(r.id)
                          setSurveyResultText(`${r.title}: ${res.totalResponses} responses`)
                        }}
                      >
                        Results
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={surveys.data ?? []}
              keyExtractor={(r) => r.id}
            />
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No surveys yet.</p>
          )}
          {surveyResultText ? (
            <Alert variant="success" title="Results">
              {surveyResultText}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>New announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-2xl gap-3"
            onSubmit={form.handleSubmit((v) => create.mutate(v))}
          >
            <FormField
              id="title"
              label="Title"
              error={form.formState.errors.title?.message}
              required
            >
              <Input id="title" {...form.register('title')} />
            </FormField>
            <FormField
              id="body"
              label="Message"
              error={form.formState.errors.body?.message}
              required
            >
              <Input id="body" {...form.register('body')} />
            </FormField>
            <FormField id="audienceRoles" label="Audience roles (comma-separated)">
              <Input
                id="audienceRoles"
                placeholder="student, faculty"
                {...form.register('audienceRoles')}
              />
            </FormField>
            <FormField id="publishMode" label="Publish mode">
              <Select id="publishMode" {...form.register('publishMode')}>
                <option value="now">Publish now</option>
                <option value="schedule">Schedule</option>
                <option value="draft">Save as draft</option>
              </Select>
            </FormField>
            {publishMode === 'schedule' ? (
              <FormField id="publishAt" label="Publish at">
                <Input id="publishAt" type="datetime-local" {...form.register('publishAt')} />
              </FormField>
            ) : null}
            <FormField id="expiresAt" label="Expires at (optional)">
              <Input id="expiresAt" type="datetime-local" {...form.register('expiresAt')} />
            </FormField>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('isPinned')} /> Pin to top
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('deliverPortal')} /> Portal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('deliverEmail')} /> Email channel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('deliverSms')} /> SMS channel
              </label>
            </div>
            <Button type="submit" disabled={create.isPending}>
              {publishMode === 'now'
                ? 'Publish to portal'
                : publishMode === 'schedule'
                  ? 'Schedule announcement'
                  : 'Save draft'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <QueryPage title="Announcements" query={list} isEmpty={(d) => d.data.length === 0}>
        {(page) => (
          <DataTable
            label="Announcements"
            columns={[
              {
                key: 'title',
                header: 'Title',
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    {r.isPinned ? <Badge>Pinned</Badge> : null}
                    {r.title}
                  </span>
                ),
              },
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              {
                key: 'expiresAt',
                header: 'Expires',
                render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleString() : '—'),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pinMutation.isPending}
                      onClick={() => pinMutation.mutate({ id: r.id, isPinned: r.isPinned })}
                    >
                      {r.isPinned ? 'Unpin' : 'Pin'}
                    </Button>
                    {r.status !== 'published' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(r.id)}
                      >
                        Publish
                      </Button>
                    ) : null}
                    {r.status !== 'archived' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={archiveMutation.isPending}
                        onClick={() => archiveMutation.mutate(r.id)}
                      >
                        Archive
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={smsDispatch.isPending}
                      onClick={() => smsDispatch.mutate(r.id)}
                    >
                      Queue SMS
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={emailDispatch.isPending}
                      onClick={() => emailDispatch.mutate(r.id)}
                    >
                      Queue email
                    </Button>
                  </div>
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
  const queryClient = useQueryClient()
  const codes = useQuery({
    queryKey: ['reg', 'faculty-eval', 'codes'],
    queryFn: () => fetchFacultyEvalCodes(),
  })
  const questions = useQuery({
    queryKey: ['reg', 'faculty-eval', 'questions'],
    queryFn: () => fetchFacultyEvalQuestions(),
  })
  const options = useQuery({
    queryKey: ['reg', 'faculty-eval', 'options'],
    queryFn: () => fetchFacultyEvalAssignmentOptions(),
  })
  const schedules = useQuery({
    queryKey: ['reg', 'faculty-eval', 'schedules'],
    queryFn: () => fetchFacultyEvalSchedules(1, 30),
  })
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null)
  const [report, setReport] = useState<FacultyEvalReport | null>(null)

  const codeForm = useForm<{ code: string; name: string }>({
    resolver: zodResolver(z.object({ code: z.string().min(2), name: z.string().min(2) })),
    defaultValues: { code: 'MIDTERM', name: 'Midterm faculty evaluation' },
  })
  const questionForm = useForm<{ prompt: string }>({
    resolver: zodResolver(z.object({ prompt: z.string().min(3) })),
    defaultValues: { prompt: 'The instructor explains lessons clearly.' },
  })
  const scheduleForm = useForm<{ title: string; optionIndex: string; closesAt: string }>({
    defaultValues: {
      title: 'Faculty evaluation period',
      optionIndex: '0',
      closesAt: '',
    },
  })

  const invalidateSchedules = () =>
    queryClient.invalidateQueries({ queryKey: ['reg', 'faculty-eval', 'schedules'] })

  const createCode = useMutation({
    mutationFn: (v: { code: string; name: string }) => createFacultyEvalCode(v),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Evaluation code saved' })
      codes.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Save failed', description: getApiErrorMessage(err) }),
  })
  const createQuestion = useMutation({
    mutationFn: (v: { prompt: string }) => createFacultyEvalQuestion(v),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Question added to databank' })
      questions.refetch()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Save failed', description: getApiErrorMessage(err) }),
  })
  const createSchedule = useMutation({
    mutationFn: async (v: { title: string; optionIndex: string; closesAt: string }) => {
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
        closesAt: v.closesAt ? new Date(v.closesAt).toISOString() : null,
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
      setActiveScheduleId(row.id)
      invalidateSchedules()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Schedule failed', description: getApiErrorMessage(err) }),
  })
  const closeSchedule = useMutation({
    mutationFn: (id: string) => closeFacultyEvalSchedule(id),
    onSuccess: (row) => {
      notify({ tone: 'success', title: 'Evaluation schedule closed' })
      setActiveScheduleId(row.id)
      invalidateSchedules()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Close failed', description: getApiErrorMessage(err) }),
  })
  const reopenSchedule = useMutation({
    mutationFn: (id: string) => openFacultyEvalSchedule(id),
    onSuccess: (row) => {
      notify({ tone: 'success', title: 'Evaluation schedule reopened' })
      setActiveScheduleId(row.id)
      invalidateSchedules()
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Open failed', description: getApiErrorMessage(err) }),
  })
  const loadReport = useMutation({
    mutationFn: (id: string) => fetchFacultyEvalReport(id),
    onSuccess: (data, id) => {
      setActiveScheduleId(id)
      setReport(data)
    },
    onError: (err) =>
      notify({ tone: 'danger', title: 'Report failed', description: getApiErrorMessage(err) }),
  })
  const exportReport = useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'csv' | 'xlsx' | 'pdf' }) => {
      const blob = await exportFacultyEvalReport(id, format)
      const { downloadBlob } = await import('@/lib/usis-reports-api')
      const ext = format === 'xlsx' ? 'xls' : format
      downloadBlob(blob, `faculty-eval-report.${ext}`)
      return format
    },
    onSuccess: (format) => notify({ tone: 'success', title: `Exported ${format.toUpperCase()}` }),
    onError: (err) =>
      notify({ tone: 'danger', title: 'Export failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        Faculty evaluation
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Question databank, evaluation codes, schedule windows, and anonymized aggregate report
        export.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evaluation code</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-2"
              onSubmit={codeForm.handleSubmit((v) => createCode.mutate(v))}
            >
              <FormField id="evalCode" label="Code" required>
                <Input id="evalCode" {...codeForm.register('code')} />
              </FormField>
              <FormField id="evalName" label="Name" required>
                <Input id="evalName" {...codeForm.register('name')} />
              </FormField>
              <Button type="submit" disabled={createCode.isPending}>
                Save code
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Question databank</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-2"
              onSubmit={questionForm.handleSubmit((v) => createQuestion.mutate(v))}
            >
              <FormField id="prompt" label="Question" required>
                <Input id="prompt" {...questionForm.register('prompt')} />
              </FormField>
              <Button type="submit" disabled={createQuestion.isPending}>
                Add question
              </Button>
            </form>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              {questions.data?.length ?? 0} active questions
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Open schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-xl gap-2"
            onSubmit={scheduleForm.handleSubmit((v) => createSchedule.mutate(v))}
          >
            <FormField id="schedTitle" label="Schedule title">
              <Input id="schedTitle" {...scheduleForm.register('title')} />
            </FormField>
            <FormField id="assignPick" label="Faculty / section target">
              <Select id="assignPick" {...scheduleForm.register('optionIndex')}>
                {(options.data ?? []).map((o, idx) => (
                  <option key={`${o.facultyUserId}-${o.sectionId}-${idx}`} value={String(idx)}>
                    {o.facultyName} · {o.sectionCode ?? o.sectionId}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="closesAt" label="Close date (optional)">
              <Input id="closesAt" type="datetime-local" {...scheduleForm.register('closesAt')} />
            </FormField>
            <Button type="submit" disabled={createSchedule.isPending}>
              Open evaluation now
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schedules and reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(schedules.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No evaluation schedules yet.
            </p>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Schedule',
                  render: (r) => (
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-[var(--color-muted-foreground)]">
                        {r.evalCode?.code ?? '—'} · opens{' '}
                        {r.opensAt ? new Date(r.opensAt).toLocaleString() : '—'} · closes{' '}
                        {r.closesAt ? new Date(r.closesAt).toLocaleString() : '—'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r) => <Badge>{r.status}</Badge>,
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loadReport.isPending}
                        onClick={() => loadReport.mutate(r.id)}
                      >
                        Report
                      </Button>
                      {r.status !== 'closed' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={closeSchedule.isPending}
                          onClick={() => closeSchedule.mutate(r.id)}
                        >
                          Close
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={reopenSchedule.isPending}
                          onClick={() => reopenSchedule.mutate(r.id)}
                        >
                          Reopen
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={exportReport.isPending}
                        onClick={() => exportReport.mutate({ id: r.id, format: 'pdf' })}
                      >
                        PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={exportReport.isPending}
                        onClick={() => exportReport.mutate({ id: r.id, format: 'xlsx' })}
                      >
                        Excel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={exportReport.isPending}
                        onClick={() => exportReport.mutate({ id: r.id, format: 'csv' })}
                      >
                        CSV
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={schedules.data ?? []}
              keyExtractor={(r) => r.id}
            />
          )}
          {report ? (
            <Alert className="mt-3" variant="success" title={report.schedule.title}>
              {report.totalResponses} anonymized responses
              {report.anonymity ? ` — ${report.anonymity}` : ''}
              {activeScheduleId ? ` · schedule ${activeScheduleId.slice(0, 8)}` : ''}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export { UsisReportsPage as RegistrarReportsPage } from '@/features/reports/pages/usis-reports-page'
