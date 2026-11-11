import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { StudentSearchSelect } from '@/components/student-search-select'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, HeartHandshake, Ticket } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardCard,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage, useListControls } from '@/components/query-page'
import { usePaginatedQuery } from '@/lib/list-query'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import { admitSuccessNotification } from '@/lib/admit-notice'
import { admitErrorNotification, notifyGenericError } from '@/lib/user-messages'
import {
  admitApplicant,
  addHealthCondition,
  addMedicalAlert,
  advanceSaApplication,
  applyShiftingExam,
  advanceQueueTicket,
  assignCounselingRequest,
  createCounselingRequest,
  documentCounselingIntake,
  downloadQueueTicketSlip,
  fetchCounselingCaseReport,
  fetchCounselingRequests,
  fetchQueueAnalytics,
  fetchQueueDisplay,
  fetchQueueTickets,
  recordCounselingSession,
  resolveCounselingRequest,
  specialistCounselingReferral,
  createHealthClearance,
  createPsychSchedule,
  createScholarshipProgram,
  applyScholarship,
  decideScholarshipApplication,
  fetchSaApplications,
  fetchScholarshipApplications,
  fetchScholarshipAssistanceReport,
  fetchScholarshipAwards,
  scheduleSaInterview,
  submitSaApplication,
  updateSaRequirements,
  encodePsychResult,
  endorseShiftingExam,
  fetchApplicants,
  advanceOrgApplication,
  downloadOrgCertificate,
  fetchEnrollmentHealthGate,
  fetchHealthProgramCatalog,
  fetchHealthProgramStatistics,
  fetchOfficeReport,
  fetchOrgApplications,
  fetchPsychBatteries,
  fetchPsychResults,
  fetchPsychSchedules,
  fetchShiftingExams,
  fetchStudentEhr,
  advanceDisciplineCase,
  fetchDisciplineCaseReport,
  fetchDisciplineCases,
  fetchDisciplinaryHistory,
  downloadDigitalStudentIdPdf,
  fetchStudentIdRequests,
  fetchStudentOrganizations,
  fetchStudentParticipation,
  fileDisciplineComplaint,
  recordDisciplineSanction,
  issueQueueTicket,
  markShiftingResultReady,
  recordHealthEncounter,
  recordHealthProgramParticipation,
  recordMedicalAssessment,
  releasePsychResult,
  releaseShiftingResult,
  scheduleShiftingExam,
  submitOrgApplication,
  submitStudentIdRequest,
  tagShiftingPayment,
  updateShiftingRequirements,
  updateStudentIdRequest,
} from '@/lib/usis-api'
import { useAuthStore } from '@/stores/auth-store'

export function AdmissionsOfficePage() {
  return (
    <RequirePermission anyOf={['applicants.read', 'applicants.write']}>
      <AdmissionsInner />
    </RequirePermission>
  )
}

function AdmissionsInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const controls = useListControls()
  const query = usePaginatedQuery({
    queryKey: ['office', 'applicants', controls.debouncedSearch, controls.page, controls.pageSize],
    queryFn: () =>
      fetchApplicants({
        search: controls.debouncedSearch || undefined,
        page: controls.page,
        limit: controls.pageSize,
      }),
  })
  const admit = useMutation({
    mutationFn: (id: string) => admitApplicant(id, `ADM-${Date.now().toString().slice(-8)}`),
    onSuccess: (result) => {
      const notice = (result as { accountNotice?: Parameters<typeof admitSuccessNotification>[0] }).accountNotice
      const toast = admitSuccessNotification(notice)
      notify({ tone: toast.tone, title: toast.title, description: toast.description })
      qc.invalidateQueries({ queryKey: ['office', 'applicants'] })
    },
    onError: (err) => {
      const toast = admitErrorNotification(err)
      notify(toast)
    },
  })
  return (
    <QueryPage
      title="Admissions Office"
      description="Applicant intake and admission"
      query={query}
      search={controls.search}
      onSearchChange={controls.setSearch}
      page={controls.page}
      lastPage={query.data?.meta.lastPage}
      pageSize={controls.pageSize}
      onPageSizeChange={controls.setPageSize}
      onPageChange={controls.setPage}
      isEmpty={(d) => d.data.length === 0}
    >
      {(page) => (
        <div className="space-y-3">
          <DashboardCard
            title="Pending / listed applicants"
            value={query.data?.meta.total ?? page.data.length}
          />
          <ul className="space-y-2">
            {page.data.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-4 py-3"
              >
                <span>
                  {a.lastName}, {a.firstName} ·{' '}
                  <span className="text-xs uppercase">{a.status}</span>
                </span>
                {a.status === 'pending' ? (
                  <Button type="button" size="sm" onClick={() => admit.mutate(a.id)}>
                    Admit
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </QueryPage>
  )
}

export function GuidanceOfficePage() {
  return (
    <RequirePermission anyOf={['guidance.read', 'guidance.write']}>
      <GuidanceInner />
    </RequirePermission>
  )
}

const guidanceRequestSchema = z.object({
  studentRef: z.string().min(1, 'Select a student'),
  channel: z.enum(['online', 'walk_in']),
})

function GuidanceInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const perms = useAuthStore((s) => s.user?.permissions ?? [])
  const canWrite = perms.includes('guidance.write') || perms.includes('*')
  const canCaseNotes =
    perms.includes('guidance.case_notes.write') ||
    perms.includes('guidance.case_notes.read') ||
    perms.includes('*')
  const report = useQuery({
    queryKey: ['office', 'guidance-report'],
    queryFn: () => fetchOfficeReport('guidance'),
  })
  const counselingReport = useQuery({
    queryKey: ['office', 'counseling-report'],
    queryFn: fetchCounselingCaseReport,
  })
  const counselingRequests = useQuery({
    queryKey: ['office', 'counseling-requests'],
    queryFn: () => fetchCounselingRequests(),
  })
  const queueDisplay = useQuery({
    queryKey: ['office', 'guidance-queue-display'],
    queryFn: () => fetchQueueDisplay('guidance'),
    refetchInterval: 8000,
  })
  const queueTickets = useQuery({
    queryKey: ['office', 'guidance-queue-tickets'],
    queryFn: () => fetchQueueTickets({ office: 'guidance', todayOnly: true }),
    refetchInterval: 8000,
  })
  const queueAnalytics = useQuery({
    queryKey: ['office', 'guidance-queue-analytics'],
    queryFn: () => fetchQueueAnalytics('guidance'),
  })
  const [specialistType, setSpecialistType] = useState<
    'psychologist' | 'medical_doctor' | 'psychiatrist' | 'social_worker'
  >('psychologist')
  const advanceQueue = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      advanceQueueTicket(input.id, input.status),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Ticket ${data.ticketNo} → ${data.status}` })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-display'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-tickets'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-analytics'] })
    },
    onError: (err) => notify(notifyGenericError(err)),
  })
  const slipQueue = useMutation({
    mutationFn: async (id: string) => {
      const blob = await downloadQueueTicketSlip(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `queue-slip-${id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const psychSchedules = useQuery({
    queryKey: ['office', 'psych-schedules'],
    queryFn: () => fetchPsychSchedules(),
  })
  const psychResults = useQuery({
    queryKey: ['office', 'psych-results'],
    queryFn: () => fetchPsychResults(),
  })
  const psychBatteries = useQuery({
    queryKey: ['office', 'psych-batteries'],
    queryFn: () => fetchPsychBatteries(),
  })
  const [psychTitle, setPsychTitle] = useState('College entrance screening')
  const [psychCollege, setPsychCollege] = useState('CCS')
  const [psychWhen, setPsychWhen] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  )
  const [psychVenue, setPsychVenue] = useState('Guidance Testing Room')
  const [psychStudentId, setPsychStudentId] = useState('')
  const [psychTestCode, setPsychTestCode] = useState<
    'ENTRANCE_PSYCH' | 'SHIFTING_PSYCH' | 'COUNSELING_INTAKE'
  >('ENTRANCE_PSYCH')
  const [psychScheduleId, setPsychScheduleId] = useState('')
  const [shiftStudentId, setShiftStudentId] = useState('')
  const [fromProgram, setFromProgram] = useState('BSCS')
  const [toProgram, setToProgram] = useState('BSIT')
  const [shiftWhen, setShiftWhen] = useState(() =>
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16)
  )
  const [paymentTag, setPaymentTag] = useState('')
  const shifting = useQuery({
    queryKey: ['office', 'shifting-exams'],
    queryFn: () => fetchShiftingExams(),
  })
  const form = useForm<z.infer<typeof guidanceRequestSchema>>({
    resolver: zodResolver(guidanceRequestSchema),
    defaultValues: { channel: 'walk_in', studentRef: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof guidanceRequestSchema>) => {
      const studentId = values.studentRef.trim()
      if (!studentId) throw new Error('Select a student')
      return createCounselingRequest({ studentId, channel: values.channel })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Counseling request opened' })
      form.reset({ channel: 'walk_in', studentRef: '' })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
      void qc.invalidateQueries({ queryKey: ['office', 'counseling-requests'] })
      void qc.invalidateQueries({ queryKey: ['office', 'counseling-report'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const invalidateCounseling = () => {
    void qc.invalidateQueries({ queryKey: ['office', 'counseling-requests'] })
    void qc.invalidateQueries({ queryKey: ['office', 'counseling-report'] })
    void qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
  }

  const intakeCounseling = useMutation({
    mutationFn: (id: string) =>
      documentCounselingIntake(id, `Intake interview documented ${new Date().toISOString()}`),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Intake → ${data.status}` })
      invalidateCounseling()
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const assignCounseling = useMutation({
    mutationFn: (id: string) => assignCounselingRequest(id),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Assigned · ${data.status}` })
      invalidateCounseling()
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const sessionCounseling = useMutation({
    mutationFn: (input: { id: string; isFollowUp?: boolean }) =>
      recordCounselingSession(input.id, {
        isFollowUp: input.isFollowUp,
        noteBody: canCaseNotes
          ? `${input.isFollowUp ? 'Follow-up' : 'Session'} note ${new Date().toISOString()}`
          : undefined,
      }),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Session · ${data.status}` })
      invalidateCounseling()
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const referCounseling = useMutation({
    mutationFn: (id: string) =>
      specialistCounselingReferral(id, {
        toOffice: 'health',
        specialistType,
        reasonSummary: 'Specialist referral scaffold',
      }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: 'Specialist referral filed',
        description: data.request ? `Case → ${data.request.status}` : undefined,
      })
      invalidateCounseling()
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const resolveCounseling = useMutation({
    mutationFn: (id: string) => resolveCounselingRequest(id, 'Case resolved (operational)'),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Resolved · ${data.status}` })
      invalidateCounseling()
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const queueMutation = useMutation({
    mutationFn: async () => {
      const studentId = form.getValues('studentRef').trim() || undefined
      return issueQueueTicket({ office: 'guidance', serviceCode: 'counseling', studentId })
    },
    onSuccess: (data) => {
      notify({ tone: 'success', title: 'Queue ticket issued', description: data.ticketNo })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-display'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-tickets'] })
      void qc.invalidateQueries({ queryKey: ['office', 'guidance-queue-analytics'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const schedulePsych = useMutation({
    mutationFn: () =>
      createPsychSchedule({
        title: psychTitle.trim(),
        collegeCode: psychCollege.trim() || undefined,
        scheduledAt: new Date(psychWhen).toISOString(),
        venue: psychVenue.trim() || undefined,
      }),
    onSuccess: (data) => {
      notify({ tone: 'success', title: 'Psych test scheduled' })
      setPsychScheduleId(data.id)
      void qc.invalidateQueries({ queryKey: ['office', 'psych-schedules'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const encodePsych = useMutation({
    mutationFn: async () => {
      if (!psychStudentId.trim()) throw new Error('Select a student')
      return encodePsychResult({
        studentId: psychStudentId,
        testCode: psychTestCode,
        scheduleId: psychScheduleId || undefined,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Psych result encoded' })
      void qc.invalidateQueries({ queryKey: ['office', 'psych-results'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const releasePsych = useMutation({
    mutationFn: (id: string) => releasePsychResult(id, true),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Result released after consultation' })
      void qc.invalidateQueries({ queryKey: ['office', 'psych-results'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const applyShift = useMutation({
    mutationFn: async () => {
      if (!shiftStudentId.trim()) throw new Error('Select a student')
      return applyShiftingExam({
        studentId: shiftStudentId,
        fromProgramCode: fromProgram.trim() || undefined,
        toProgramCode: toProgram.trim() || undefined,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Shifting exam application submitted' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const validateShiftReqs = useMutation({
    mutationFn: (id: string) =>
      updateShiftingRequirements(id, [
        { key: 'application_form', submitted: true },
        { key: 'current_grades', submitted: true },
        { key: 'dean_endorsement_letter', submitted: true },
        { key: 'parent_consent', submitted: true },
      ]),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Requirements validated' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) => notify(notifyGenericError(err)),
  })

  const scheduleShift = useMutation({
    mutationFn: (id: string) => scheduleShiftingExam(id, new Date(shiftWhen).toISOString()),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Exam scheduled' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const tagShiftPay = useMutation({
    mutationFn: (id: string) =>
      tagShiftingPayment(id, paymentTag.trim() || `UFMS-SHIFT-${Date.now().toString().slice(-6)}`),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Payment tagged' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const readyShift = useMutation({
    mutationFn: (id: string) =>
      markShiftingResultReady(id, 'Operational result ready for consultation'),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Result marked ready' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) => notify(notifyGenericError(err)),
  })

  const releaseShift = useMutation({
    mutationFn: (id: string) => releaseShiftingResult(id, true),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Result released after counseling' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const endorseShift = useMutation({
    mutationFn: (args: {
      id: string
      party: 'originating_college' | 'receiving_college' | 'admission'
    }) => endorseShiftingExam(args.id, { party: args.party, decision: 'endorsed' }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Endorsement recorded' })
      void qc.invalidateQueries({ queryKey: ['office', 'shifting-exams'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guidance & Counseling"
        description="Counseling, queue call/complete/slip (software), psychological testing, and shifting. Case note bodies stay restricted. Hardware printers VI.E.1.3 out of scope."
      />

      {report.isLoading ? <LoadingState label="Loading guidance desk" /> : null}
      {report.isError ? (
        <Alert variant="danger" title="Unable to load guidance desk">
          {getApiErrorMessage(report.error)}
        </Alert>
      ) : null}

      {report.isSuccess ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Open service requests"
            value={report.data.openServiceRequests}
            hint="Active counseling and guidance intakes"
            tone="primary"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <DashboardCard
            title="Queue waiting"
            value={report.data.queueWaiting}
            hint="Walk-in tickets waiting to be called"
            tone="warning"
            icon={<Ticket className="h-5 w-5" />}
          />
          <DashboardCard
            title="Open counseling"
            value={counselingReport.data?.openCount ?? '—'}
            hint=" open cases"
          />
          <DashboardCard
            title="Sessions recorded"
            value={counselingReport.data?.sessionTotal ?? '—'}
            hint="Including follow-ups"
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="h-4 w-4 text-[var(--color-primary)]" />
              Open counseling request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
              <FormField
                id="studentRef"
                label="Student"
                required
                error={form.formState.errors.studentRef?.message}
              >
                <Controller
                  name="studentRef"
                  control={form.control}
                  render={({ field }) => (
                    <StudentSearchSelect
                      id="studentRef"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField id="channel" label="Channel">
                <Select id="channel" {...form.register('channel')}>
                  <option value="walk_in">Walk-in</option>
                  <option value="online">Online</option>
                </Select>
              </FormField>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={!canWrite || mutation.isPending} className="flex-1">
                  {mutation.isPending ? 'Creating…' : 'Create request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canWrite || queueMutation.isPending}
                  onClick={() => queueMutation.mutate()}
                >
                  Issue queue ticket
                </Button>
              </div>
            </form>
            <Alert variant="info" title="Privacy" className="mt-4">
              Case note bodies require guidance.case_notes permissions and are never shown on this
              operational screen.
            </Alert>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Counseling cases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="info" title="Lifecycle">
                Submitted → intake → assigned → session / follow-up → specialist referral →
                resolved. Specialist types and retention policy remain [CONFIRM].
              </Alert>
              <FormField id="specialistType" label="Specialist type (scaffold)">
                <Select
                  id="specialistType"
                  value={specialistType}
                  onChange={(e) =>
                    setSpecialistType(
                      e.target.value as
                        'psychologist' | 'medical_doctor' | 'psychiatrist' | 'social_worker'
                    )
                  }
                >
                  <option value="psychologist">psychologist</option>
                  <option value="medical_doctor">medical_doctor</option>
                  <option value="psychiatrist">psychiatrist</option>
                  <option value="social_worker">social_worker</option>
                </Select>
              </FormField>
              {counselingRequests.isLoading ? (
                <LoadingState label="Loading counseling cases" />
              ) : null}
              {counselingRequests.data?.length ? (
                <ul className="space-y-3">
                  {counselingRequests.data.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                    >
                      <div className="font-medium">
                        {c.status} · {c.channel} · student {String(c.studentId).slice(0, 8)}…
                      </div>
                      <div className="text-[var(--color-muted-foreground)]">
                        Sessions {c.sessionCount} · notes {c.noteCount} · open referrals{' '}
                        {c.openReferralCount}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.allowedNextStatuses.includes('intake') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || !canCaseNotes || intakeCounseling.isPending}
                            onClick={() => intakeCounseling.mutate(c.id)}
                          >
                            Document intake
                          </Button>
                        ) : null}
                        {c.allowedNextStatuses.includes('assigned') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || assignCounseling.isPending}
                            onClick={() => assignCounseling.mutate(c.id)}
                          >
                            Assign counselor
                          </Button>
                        ) : null}
                        {c.allowedNextStatuses.includes('in_session') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || sessionCounseling.isPending}
                            onClick={() => sessionCounseling.mutate({ id: c.id })}
                          >
                            Record session
                          </Button>
                        ) : null}
                        {c.allowedNextStatuses.includes('follow_up') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || sessionCounseling.isPending}
                            onClick={() => sessionCounseling.mutate({ id: c.id, isFollowUp: true })}
                          >
                            Record follow-up
                          </Button>
                        ) : null}
                        {c.allowedNextStatuses.includes('referred') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canWrite || referCounseling.isPending}
                            onClick={() => referCounseling.mutate(c.id)}
                          >
                            Specialist referral
                          </Button>
                        ) : null}
                        {c.allowedNextStatuses.includes('resolved') ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={!canWrite || resolveCounseling.isPending}
                            onClick={() => resolveCounseling.mutate(c.id)}
                          >
                            Resolve case
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No counseling cases yet"
                  description="Create an online or walk-in request to open a counseling case."
                  icon={<ClipboardList className="h-6 w-6" />}
                />
              )}
              {counselingReport.data?.byStatus?.length ? (
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  Case report:{' '}
                  {counselingReport.data.byStatus.map((r) => `${r.status}=${r.total}`).join(' · ')}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open service requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!report.isSuccess ? (
                <LoadingState label="Loading requests" />
              ) : (report.data.recentRequests?.length ?? 0) === 0 ? (
                <EmptyState
                  title="No open requests"
                  description="New counseling intakes will appear here."
                  icon={<ClipboardList className="h-6 w-6" />}
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {report.data.recentRequests!.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {row.studentName || row.studentNumber || row.studentId}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {row.requestType} · {row.channel.replace('_', '-')}
                          {row.studentNumber ? ` · ${row.studentNumber}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Queue desk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="info" title="Software track">
                Call / complete / skip + printable PDF slip. Hardware printers and public displays
                remain TOR VI.E.1.3 (out of scope).
              </Alert>
              <div className="grid gap-3 sm:grid-cols-3">
                <DashboardCard title="Waiting" value={queueDisplay.data?.waitingCount ?? '—'} />
                <DashboardCard title="Now serving" value={queueDisplay.data?.calledCount ?? '—'} />
                <DashboardCard
                  title="Completed today"
                  value={queueDisplay.data?.completedToday ?? '—'}
                />
              </div>
              {queueDisplay.data?.nowServing?.length ? (
                <div className="text-sm">
                  <div className="font-medium">Now serving</div>
                  <ul className="mt-1 space-y-1 font-mono">
                    {queueDisplay.data.nowServing.map((t) => (
                      <li key={t.id}>
                        {t.ticketNo} · {t.studentName || t.studentNumber || 'Walk-in'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {queueTickets.isLoading ? <LoadingState label="Loading queue" /> : null}
              {queueTickets.data?.length ? (
                <ul className="space-y-3">
                  {queueTickets.data.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                    >
                      <div className="font-mono font-semibold">
                        {row.ticketNo} · {row.status}
                      </div>
                      <div className="text-[var(--color-muted-foreground)]">
                        {row.studentName || row.studentNumber || 'Walk-in guest'} ·{' '}
                        {row.serviceCode}
                        {typeof row.waitSeconds === 'number' ? ` · wait ${row.waitSeconds}s` : ''}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {row.allowedNextStatuses.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            variant={
                              status === 'skipped' || status === 'cancelled'
                                ? 'destructive'
                                : 'secondary'
                            }
                            disabled={!canWrite || advanceQueue.isPending}
                            onClick={() => advanceQueue.mutate({ id: row.id, status })}
                          >
                            {status === 'called'
                              ? 'Call'
                              : status === 'completed'
                                ? 'Complete'
                                : status}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={slipQueue.isPending}
                          onClick={() => slipQueue.mutate(row.id)}
                        >
                          Slip PDF
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="Queue is clear"
                  description="Issue a walk-in ticket to join the office queue."
                  icon={<Ticket className="h-6 w-6" />}
                />
              )}
              {queueAnalytics.data ? (
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  Analytics: total {queueAnalytics.data.totalTickets}
                  {queueAnalytics.data.avgWaitSeconds != null
                    ? ` · avg wait ${queueAnalytics.data.avgWaitSeconds}s`
                    : ''}
                  {queueAnalytics.data.avgServiceSeconds != null
                    ? ` · avg service ${queueAnalytics.data.avgServiceSeconds}s`
                    : ''}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Psychological testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Scaffold batteries">
            {psychBatteries.data?.note ??
              'Official instruments and scoring rules require Guidance confirmation before production.'}
          </Alert>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FormField id="psychTitle" label="Schedule title">
              <Input
                id="psychTitle"
                value={psychTitle}
                onChange={(e) => setPsychTitle(e.target.value)}
              />
            </FormField>
            <FormField id="psychCollege" label="College code">
              <Input
                id="psychCollege"
                value={psychCollege}
                onChange={(e) => setPsychCollege(e.target.value)}
              />
            </FormField>
            <FormField id="psychWhen" label="Scheduled at">
              <Input
                id="psychWhen"
                type="datetime-local"
                value={psychWhen}
                onChange={(e) => setPsychWhen(e.target.value)}
              />
            </FormField>
            <FormField id="psychVenue" label="Venue">
              <Input
                id="psychVenue"
                value={psychVenue}
                onChange={(e) => setPsychVenue(e.target.value)}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!canWrite || schedulePsych.isPending || !psychTitle.trim()}
            onClick={() => schedulePsych.mutate()}
          >
            Schedule college testing
          </Button>
          {(psychSchedules.data ?? []).length ? (
            <ul className="space-y-1 text-sm">
              {(psychSchedules.data ?? []).slice(0, 8).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-canvas)] px-3 py-2"
                >
                  <span>
                    {s.title} · {s.collegeCode ?? 'all'} · {s.status}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPsychScheduleId(s.id)}
                  >
                    Use for encode
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="psychStudentRef" label="Student">
              <StudentSearchSelect
                id="psychStudentRef"
                value={psychStudentId}
                onChange={setPsychStudentId}
              />
            </FormField>
            <FormField id="psychTestCode" label="Battery">
              <Select
                id="psychTestCode"
                value={psychTestCode}
                onChange={(e) =>
                  setPsychTestCode(
                    e.target.value as 'ENTRANCE_PSYCH' | 'SHIFTING_PSYCH' | 'COUNSELING_INTAKE'
                  )
                }
              >
                {(
                  psychBatteries.data?.batteries ?? [
                    { code: 'ENTRANCE_PSYCH', label: 'Entrance psychological screening' },
                    { code: 'SHIFTING_PSYCH', label: 'Shifting / program change battery' },
                    { code: 'COUNSELING_INTAKE', label: 'Counseling intake psychometrics' },
                  ]
                ).map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="psychSchedulePick" label="Schedule id (optional)">
              <Input
                id="psychSchedulePick"
                value={psychScheduleId}
                onChange={(e) => setPsychScheduleId(e.target.value)}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!canWrite || encodePsych.isPending || !psychStudentId.trim()}
            onClick={() => encodePsych.mutate()}
          >
            Encode result
          </Button>
          {(psychResults.data ?? []).length ? (
            <ul className="space-y-2 text-sm">
              {(psychResults.data ?? []).slice(0, 10).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <span>
                    {r.studentNumber ?? r.studentId} · {r.testCode} ·{' '}
                    {r.released ? 'released' : 'held'}
                  </span>
                  {!r.released ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canWrite || releasePsych.isPending}
                      onClick={() => releasePsych.mutate(r.id)}
                    >
                      Release after consultation
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No encoded results yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shifting exam processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Configurable workflow">
            Requirements checklist and fee payment tags are operational. Official eligibility
            thresholds and UFMS fee codes remain [CONFIRM].
          </Alert>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField id="shiftStudentRef" label="Student">
              <StudentSearchSelect
                id="shiftStudentRef"
                value={shiftStudentId}
                onChange={setShiftStudentId}
              />
            </FormField>
            <FormField id="fromProgram" label="From program">
              <Input
                id="fromProgram"
                value={fromProgram}
                onChange={(e) => setFromProgram(e.target.value)}
              />
            </FormField>
            <FormField id="toProgram" label="To program">
              <Input
                id="toProgram"
                value={toProgram}
                onChange={(e) => setToProgram(e.target.value)}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!canWrite || applyShift.isPending || !shiftStudentId.trim()}
            onClick={() => applyShift.mutate()}
          >
            Submit shifting application
          </Button>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="shiftWhen" label="Exam schedule">
              <Input
                id="shiftWhen"
                type="datetime-local"
                value={shiftWhen}
                onChange={(e) => setShiftWhen(e.target.value)}
              />
            </FormField>
            <FormField id="paymentTag" label="Payment tag">
              <Input
                id="paymentTag"
                value={paymentTag}
                onChange={(e) => setPaymentTag(e.target.value)}
                placeholder="UFMS-SHIFT-… (auto if blank)"
              />
            </FormField>
          </div>
          {(shifting.data ?? []).length ? (
            <ul className="space-y-3 text-sm">
              {(shifting.data ?? []).slice(0, 8).map((app) => (
                <li
                  key={app.id}
                  className="space-y-2 rounded-lg border border-[var(--color-border)] px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {app.studentNumber ?? app.studentId} · {app.fromProgramCode ?? '?'} →{' '}
                      {app.toProgramCode ?? '?'} · {app.status}
                    </span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {app.requirementsComplete ? 'reqs complete' : 'reqs incomplete'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['submitted', 'requirements_incomplete'].includes(app.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || validateShiftReqs.isPending}
                        onClick={() => validateShiftReqs.mutate(app.id)}
                      >
                        Validate requirements
                      </Button>
                    ) : null}
                    {app.status === 'requirements_validated' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || scheduleShift.isPending}
                        onClick={() => scheduleShift.mutate(app.id)}
                      >
                        Schedule exam
                      </Button>
                    ) : null}
                    {app.status === 'scheduled' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || tagShiftPay.isPending}
                        onClick={() => tagShiftPay.mutate(app.id)}
                      >
                        Tag payment
                      </Button>
                    ) : null}
                    {app.status === 'payment_tagged' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || readyShift.isPending}
                        onClick={() => readyShift.mutate(app.id)}
                      >
                        Mark result ready
                      </Button>
                    ) : null}
                    {app.status === 'result_ready' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canWrite || releaseShift.isPending}
                        onClick={() => releaseShift.mutate(app.id)}
                      >
                        Release after counseling
                      </Button>
                    ) : null}
                    {app.status === 'released' || app.status === 'endorsed' ? (
                      <>
                        {(['originating_college', 'receiving_college', 'admission'] as const).map(
                          (party) =>
                            app.requirements.endorsements[party] === 'endorsed' ? null : (
                              <Button
                                key={party}
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canWrite || endorseShift.isPending}
                                onClick={() => endorseShift.mutate({ id: app.id, party })}
                              >
                                Endorse {party.replaceAll('_', ' ')}
                              </Button>
                            )
                        )}
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No shifting applications yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function HealthOfficePage() {
  return (
    <RequirePermission anyOf={['health.read', 'health.write']}>
      <HealthInner />
    </RequirePermission>
  )
}

function HealthInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const report = useQuery({
    queryKey: ['office', 'health-report'],
    queryFn: () => fetchOfficeReport('health'),
  })
  const [ehrStudentId, setEhrStudentId] = useState('')
  const [conditionCode, setConditionCode] = useState('ASTHMA')
  const [conditionLabel, setConditionLabel] = useState('Asthma')
  const [alertCode, setAlertCode] = useState('ALLERGY_PENICILLIN')
  const [medLabel, setMedLabel] = useState('Paracetamol 500mg')
  const [facility, setFacility] = useState('ZCMC Emergency')
  const [programCode, setProgramCode] = useState<
    'DRUG_TESTING' | 'HIV_SCREENING' | 'DENTAL_EXAM' | 'MEDICAL_EXAM'
  >('DRUG_TESTING')
  const [assessmentContext, setAssessmentContext] = useState<
    'freshman' | 'transferee' | 'returning' | 'other'
  >('freshman')
  const form = useForm<{ studentId: string; status: 'pending' | 'cleared' | 'denied' }>({
    defaultValues: { status: 'cleared', studentId: '' },
  })
  const ehr = useQuery({
    queryKey: ['office', 'health-ehr', ehrStudentId],
    queryFn: () => fetchStudentEhr(ehrStudentId),
    enabled: Boolean(ehrStudentId),
  })
  const programCatalog = useQuery({
    queryKey: ['office', 'health-programs-catalog'],
    queryFn: fetchHealthProgramCatalog,
  })
  const healthStats = useQuery({
    queryKey: ['office', 'health-stats'],
    queryFn: fetchHealthProgramStatistics,
  })
  const healthGate = useQuery({
    queryKey: ['office', 'health-gate', ehrStudentId],
    queryFn: () => fetchEnrollmentHealthGate(ehrStudentId),
    enabled: Boolean(ehrStudentId),
  })
  const mutation = useMutation({
    mutationFn: (values: { studentId: string; status: 'pending' | 'cleared' | 'denied' }) =>
      createHealthClearance(values),
    onSuccess: () => notify({ tone: 'success', title: 'Health clearance updated' }),
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const requireEhrStudent = () => {
    if (!ehrStudentId.trim()) throw new Error('Select a student')
    return ehrStudentId
  }

  const addCondition = useMutation({
    mutationFn: async () => {
      const studentId = requireEhrStudent()
      return addHealthCondition({
        studentId,
        conditionCode,
        label: conditionLabel,
        isChronic: true,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Chronic condition recorded' })
      void qc.invalidateQueries({ queryKey: ['office', 'health-ehr', ehrStudentId] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const addAlert = useMutation({
    mutationFn: async () => {
      const studentId = requireEhrStudent()
      return addMedicalAlert({ studentId, alertCode, severity: 'warning' })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Medical alert added' })
      void qc.invalidateQueries({ queryKey: ['office', 'health-ehr', ehrStudentId] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const recordEncounter = useMutation({
    mutationFn: async () => {
      const studentId = requireEhrStudent()
      return recordHealthEncounter({
        studentId,
        encounterType: 'outpatient',
        isEmergency: true,
        clinicalNote: 'Emergency outpatient note (restricted body)',
        diagnosisLabel: 'Acute presentation',
        medicationLabel: medLabel,
        medicationInstructions: 'As directed',
        hospitalReferralFacility: facility,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Emergency encounter + Rx + hospital referral recorded' })
      void qc.invalidateQueries({ queryKey: ['office', 'health-ehr'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const recordProgram = useMutation({
    mutationFn: async () => {
      const studentId = requireEhrStudent()
      return recordHealthProgramParticipation({ studentId, programCode, status: 'completed' })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Health program participation recorded' })
      void qc.invalidateQueries({ queryKey: ['office', 'health-gate'] })
      void qc.invalidateQueries({ queryKey: ['office', 'health-stats'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const assessMedical = useMutation({
    mutationFn: async () => {
      const studentId = requireEhrStudent()
      return recordMedicalAssessment({
        studentId,
        assessmentContext,
        status: 'cleared',
        requireProgramsComplete: true,
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Medical assessment cleared' })
      void qc.invalidateQueries({ queryKey: ['office', 'health-gate'] })
      void qc.invalidateQueries({ queryKey: ['office', 'health-stats'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="University Health Services"
        description="EHR operations, health programs, medical assessment, and advisory enrollment gate. Clinical note bodies stay restricted."
      />
      <QueryPage title="Desk load" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
          </div>
        )}
      </QueryPage>
      <Card>
        <CardHeader>
          <CardTitle>Enrollment health clearance</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-md gap-3"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <FormField id="studentId" label="Student" required>
              <Controller
                name="studentId"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <StudentSearchSelect id="studentId" value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <FormField id="status" label="Status">
              <Select id="status" {...form.register('status')}>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="denied">Denied</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>
              Save clearance
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Electronic health record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Privacy">
            This screen shows operational EHR metadata. Full clinical note bodies require
            health.clinical.* permissions.
          </Alert>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FormField id="ehrStudentRef" label="Student">
              <StudentSearchSelect
                id="ehrStudentRef"
                value={ehrStudentId}
                onChange={setEhrStudentId}
              />
            </FormField>
            <FormField id="conditionCode" label="Condition code">
              <Input
                id="conditionCode"
                value={conditionCode}
                onChange={(e) => setConditionCode(e.target.value)}
              />
            </FormField>
            <FormField id="conditionLabel" label="Condition label">
              <Input
                id="conditionLabel"
                value={conditionLabel}
                onChange={(e) => setConditionLabel(e.target.value)}
              />
            </FormField>
            <FormField id="alertCode" label="Alert code">
              <Input
                id="alertCode"
                value={alertCode}
                onChange={(e) => setAlertCode(e.target.value)}
              />
            </FormField>
            <FormField id="medLabel" label="Medication">
              <Input id="medLabel" value={medLabel} onChange={(e) => setMedLabel(e.target.value)} />
            </FormField>
            <FormField id="facility" label="Hospital facility">
              <Input id="facility" value={facility} onChange={(e) => setFacility(e.target.value)} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={addCondition.isPending || !ehrStudentId.trim()}
              onClick={() => addCondition.mutate()}
            >
              Add chronic condition
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={addAlert.isPending || !ehrStudentId.trim()}
              onClick={() => addAlert.mutate()}
            >
              Add medical alert
            </Button>
            <Button
              type="button"
              disabled={recordEncounter.isPending || !ehrStudentId.trim()}
              onClick={() => recordEncounter.mutate()}
            >
              Record emergency + Rx + hospital referral
            </Button>
          </div>
          {ehr.isLoading ? <LoadingState label="Loading EHR" /> : null}
          {ehr.data ? (
            <div className="space-y-3 text-sm">
              <Alert
                variant="info"
                title={`${ehr.data.student.name} · ${ehr.data.student.studentNumber}`}
              >
                Emergencies logged: {ehr.data.emergencyCount}. Clearance:{' '}
                {ehr.data.clearance?.status ?? 'none'}.
              </Alert>
              <div>
                <div className="font-medium">Chronic conditions</div>
                <ul className="mt-1 space-y-1">
                  {ehr.data.chronicConditions.map((c) => (
                    <li key={c.id}>
                      {c.conditionCode} · {c.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium">Medical alerts</div>
                <ul className="mt-1 space-y-1">
                  {ehr.data.medicalAlerts.map((a) => (
                    <li key={a.id}>
                      {a.alertCode} · {a.severity}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium">Encounters / prescriptions / hospital referrals</div>
                <ul className="mt-1 space-y-1">
                  {ehr.data.encounters.slice(0, 6).map((e) => (
                    <li key={e.id}>
                      {e.encounterType}
                      {e.isEmergency ? ' (emergency)' : ''} · {e.status}
                    </li>
                  ))}
                  {ehr.data.prescriptions.slice(0, 4).map((p) => (
                    <li key={p.id}>Rx · {p.medicationLabel}</li>
                  ))}
                  {ehr.data.referrals
                    .filter((r) => r.isHospital)
                    .slice(0, 4)
                    .map((r) => (
                      <li key={r.id}>
                        Hospital · {r.toFacility} · {r.status}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health programs & enrollment gate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant="info"
            title={`Gate mode: ${programCatalog.data?.enrollmentGateMode ?? 'advisory'}`}
          >
            {programCatalog.data?.note ??
              'Mandatory program set is scaffolded. Hard enrollment block remains [CONFIRM] with Health/Registrar.'}
          </Alert>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="programCode" label="Program">
              <Select
                id="programCode"
                value={programCode}
                onChange={(e) =>
                  setProgramCode(
                    e.target.value as
                      'DRUG_TESTING' | 'HIV_SCREENING' | 'DENTAL_EXAM' | 'MEDICAL_EXAM'
                  )
                }
              >
                {(
                  programCatalog.data?.programs ?? [
                    { code: 'DRUG_TESTING', label: 'Drug testing' },
                    { code: 'HIV_SCREENING', label: 'HIV screening' },
                    { code: 'DENTAL_EXAM', label: 'Dental examination' },
                    { code: 'MEDICAL_EXAM', label: 'Medical examination' },
                  ]
                ).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="assessmentContext" label="Assessment context">
              <Select
                id="assessmentContext"
                value={assessmentContext}
                onChange={(e) =>
                  setAssessmentContext(
                    e.target.value as 'freshman' | 'transferee' | 'returning' | 'other'
                  )
                }
              >
                <option value="freshman">Freshman</option>
                <option value="transferee">Transferee</option>
                <option value="returning">Returning</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={recordProgram.isPending || !ehrStudentId.trim()}
              onClick={() => recordProgram.mutate()}
            >
              Record program participation
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={assessMedical.isPending || !ehrStudentId.trim()}
              onClick={() => assessMedical.mutate()}
            >
              Clear medical assessment (requires programs)
            </Button>
          </div>
          {healthGate.data ? (
            <Alert
              variant={healthGate.data.advisoryCleared ? 'success' : 'warning'}
              title={
                healthGate.data.advisoryCleared
                  ? 'Advisory gate cleared'
                  : `Missing: ${(healthGate.data.missingPrograms ?? []).join(', ') || 'clearance'}`
              }
            >
              Clearance {healthGate.data.clearanceCleared ? 'cleared' : 'not cleared'} · programs{' '}
              {healthGate.data.programsComplete ? 'complete' : 'incomplete'}. Hard block not
              enforced.
            </Alert>
          ) : null}
          {healthStats.data ? (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <div className="font-medium">Programs by code</div>
                <ul className="mt-1 space-y-1">
                  {healthStats.data.programsByCode.map((r) => (
                    <li key={r.programCode}>
                      {r.label}: {r.total}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium">Assessments by context</div>
                <ul className="mt-1 space-y-1">
                  {healthStats.data.assessmentsByContext.map((r) => (
                    <li key={String(r.assessmentContext)}>
                      {r.assessmentContext}: {r.total}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function OsaOfficePage() {
  return (
    <RequirePermission anyOf={['osa.read', 'osa.write']}>
      <OsaInner />
    </RequirePermission>
  )
}

function OsaInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const report = useQuery({
    queryKey: ['office', 'osa-report'],
    queryFn: () => fetchOfficeReport('osa'),
  })
  const disciplineReport = useQuery({
    queryKey: ['office', 'osa-discipline-report'],
    queryFn: fetchDisciplineCaseReport,
  })
  const disciplineCases = useQuery({
    queryKey: ['office', 'osa-discipline-cases'],
    queryFn: () => fetchDisciplineCases(),
  })
  const orgApps = useQuery({ queryKey: ['office', 'osa-org-apps'], queryFn: fetchOrgApplications })
  const accreditedOrgs = useQuery({
    queryKey: ['office', 'osa-orgs'],
    queryFn: fetchStudentOrganizations,
  })
  const idRequests = useQuery({
    queryKey: ['office', 'osa-id-requests'],
    queryFn: () => fetchStudentIdRequests(),
  })
  const [idStudentId, setIdStudentId] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [rfidRef, setRfidRef] = useState('')
  const [disciplineHistoryStudentId, setDisciplineHistoryStudentId] = useState('')
  const [sanctionCode, setSanctionCode] = useState('WARNING')
  const form = useForm<{ respondentStudentId: string; summary: string }>({
    defaultValues: { respondentStudentId: '', summary: '' },
  })
  const orgForm = useForm<{ proposedName: string; applicationType: 'new' | 'renewal' }>({
    defaultValues: { proposedName: '', applicationType: 'new' },
  })
  const mutation = useMutation({
    mutationFn: async (values: { respondentStudentId: string; summary: string }) => {
      const respondentStudentId = values.respondentStudentId.trim()
      if (!respondentStudentId) throw new Error('Select a student')
      return fileDisciplineComplaint({
        respondentStudentId,
        summary: values.summary,
        complainantRole: 'staff',
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Complaint filed' })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-cases'] })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-report'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const advanceDiscipline = useMutation({
    mutationFn: (input: { id: string; workflowStatus: string }) =>
      advanceDisciplineCase(input.id, { workflowStatus: input.workflowStatus }),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Case → ${data.workflowStatus}` })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-cases'] })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-report'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const sanction = useMutation({
    mutationFn: (input: { id: string }) => recordDisciplineSanction(input.id, { sanctionCode }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: 'Sanction recorded',
        description: `${data.sanctions?.length ?? 0} sanction(s) on case`,
      })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-cases'] })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-discipline-report'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const history = useMutation({
    mutationFn: async () => {
      if (!disciplineHistoryStudentId.trim()) throw new Error('Select a student')
      return fetchDisciplinaryHistory(disciplineHistoryStudentId)
    },
    onSuccess: (data) =>
      notify({
        tone: 'success',
        title: 'Disciplinary history',
        description: `${data.cases.length} case(s); ${data.sanctions.length} sanction(s)`,
      }),
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const submitOrg = useMutation({
    mutationFn: (values: { proposedName: string; applicationType: 'new' | 'renewal' }) =>
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
      notify({ tone: 'success', title: 'Org application submitted' })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-org-apps'] })
      orgForm.reset({ proposedName: '', applicationType: 'new' })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const advance = useMutation({
    mutationFn: (input: { id: string; workflowStatus: string }) =>
      advanceOrgApplication(input.id, { workflowStatus: input.workflowStatus }),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `Moved to ${data.workflowStatus}` })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-org-apps'] })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-orgs'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const cert = useMutation({
    mutationFn: async (studentOrgId: string) => {
      const blob = await downloadOrgCertificate(studentOrgId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coa-${studentOrgId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const submitId = useMutation({
    mutationFn: () =>
      submitStudentIdRequest({
        requestType: 'new',
        studentId: idStudentId.trim(),
      }),
    onSuccess: (data) => {
      notify({
        tone: 'success',
        title: 'ID request submitted',
        description: `Open discipline cases: ${data.osaSnapshot?.openDisciplineCount ?? 0}`,
      })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-id-requests'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const advanceId = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      updateStudentIdRequest(input.id, {
        status: input.status,
        paymentValidationRef: paymentRef.trim() || undefined,
        rfidRef: rfidRef.trim() || undefined,
      }),
    onSuccess: (data) => {
      notify({ tone: 'success', title: `ID request → ${data.status}` })
      void qc.invalidateQueries({ queryKey: ['office', 'osa-id-requests'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })
  const participation = useMutation({
    mutationFn: () => fetchStudentParticipation(idStudentId.trim()),
    onSuccess: (data) =>
      notify({
        tone: 'success',
        title: 'Participation profile',
        description: `Orgs ${data.organizations.length}; open discipline ${data.openDisciplineCases.length}`,
      }),
    onError: (err) =>
      notify(notifyGenericError(err)),
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
      notify(notifyGenericError(err)),
  })
  return (
    <div className="space-y-4">
      <PageHeader
        title="Office of Student Affairs"
        description="Discipline intake → investigation → committee → SDT → decision → closed; sanctions and case reports. Sanction catalog / appeal windows [CONFIRM]."
      />
      <QueryPage title="Desk load" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
            <DashboardCard
              title="Open discipline"
              value={disciplineReport.data?.openCount ?? '—'}
            />
            <DashboardCard
              title="SDT engaged"
              value={disciplineReport.data?.sdtEngagedCount ?? '—'}
            />
          </div>
        )}
      </QueryPage>
      <Card>
        <CardHeader>
          <CardTitle>Discipline & SDT workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Lifecycle">
            Intake → Investigation → Committee → (SDT optional) → Decision → Closed. Sanctions use
            scaffold codes until the university confirms the official catalog and appeal windows.
          </Alert>
          <form
            className="grid max-w-xl gap-3 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <FormField id="respondentStudentId" label="Respondent student" required>
              <Controller
                name="respondentStudentId"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <StudentSearchSelect
                    id="respondentStudentId"
                    value={field.value}
                    onChange={(id) => {
                      field.onChange(id)
                      setDisciplineHistoryStudentId(id)
                    }}
                  />
                )}
              />
            </FormField>
            <FormField id="summary" label="Complaint summary">
              <Input id="summary" {...form.register('summary')} />
            </FormField>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                File complaint
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!disciplineHistoryStudentId.trim() || history.isPending}
                onClick={() => history.mutate()}
              >
                Load disciplinary history
              </Button>
            </div>
          </form>
          <FormField id="sanctionCode" label="Sanction code (scaffold)">
            <Select
              id="sanctionCode"
              value={sanctionCode}
              onChange={(e) => setSanctionCode(e.target.value)}
            >
              <option value="WARNING">WARNING</option>
              <option value="REPRIMAND">REPRIMAND</option>
              <option value="PROBATION">PROBATION</option>
              <option value="SUSPENSION">SUSPENSION</option>
              <option value="EXPULSION">EXPULSION</option>
              <option value="COMMUNITY_SERVICE">COMMUNITY_SERVICE</option>
            </Select>
          </FormField>
          {disciplineCases.isLoading ? <LoadingState /> : null}
          {disciplineCases.data?.length ? (
            <ul className="space-y-3">
              {disciplineCases.data.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                >
                  <div className="font-medium">
                    {c.workflowStatus}
                    {c.sdtEngaged ? ' · SDT engaged' : ''} · student{' '}
                    {String(c.studentId).slice(0, 8)}…
                  </div>
                  <div className="text-[var(--color-muted-foreground)]">
                    Case {c.id.slice(0, 8)}… · complaint {c.complaintId.slice(0, 8)}…
                    {c.sanctions?.length ? ` · sanctions ${c.sanctions.length}` : ''}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.allowedNextStatuses.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={status === 'closed' ? 'destructive' : 'secondary'}
                        disabled={advanceDiscipline.isPending}
                        onClick={() =>
                          advanceDiscipline.mutate({ id: c.id, workflowStatus: status })
                        }
                      >
                        Advance → {status}
                      </Button>
                    ))}
                    {['sdt', 'decision', 'closed'].includes(c.workflowStatus) ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={sanction.isPending}
                        onClick={() => sanction.mutate({ id: c.id })}
                      >
                        Record {sanctionCode}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No discipline cases yet" />
          )}
          {disciplineReport.data?.byStatus?.length ? (
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Case report:{' '}
              {disciplineReport.data.byStatus
                .map((r) => `${r.workflowStatus}=${r.total}`)
                .join(' · ')}
              {disciplineReport.data.bySanction.length
                ? ` · sanctions ${disciplineReport.data.bySanction.map((s) => `${s.sanctionCode}=${s.total}`).join(', ')}`
                : ''}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Organization accreditation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid max-w-lg gap-3 sm:grid-cols-2"
            onSubmit={orgForm.handleSubmit((v) => submitOrg.mutate(v))}
          >
            <FormField id="proposedName" label="Proposed organization name" required>
              <Input id="proposedName" {...orgForm.register('proposedName', { required: true })} />
            </FormField>
            <FormField id="applicationType" label="Application type">
              <Select id="applicationType" {...orgForm.register('applicationType')}>
                <option value="new">New</option>
                <option value="renewal">Renewal</option>
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitOrg.isPending}>
                Submit with default checklist
              </Button>
            </div>
          </form>
          <Alert variant="info" title="Workflow">
            OSA → VPSAS → Legal → President → Accredited. Default checklist keys are scaffold until
            university confirms.
          </Alert>
          {orgApps.isLoading ? <LoadingState /> : null}
          {orgApps.data?.length ? (
            <ul className="space-y-3">
              {orgApps.data.map((app) => (
                <li
                  key={app.id}
                  className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                >
                  <div className="font-medium">{app.proposedName}</div>
                  <div className="text-[var(--color-muted-foreground)]">
                    {app.applicationType} · {app.workflowStatus}
                    {app.requirements.requirementsComplete
                      ? ' · requirements complete'
                      : ' · requirements incomplete'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {app.allowedNextStatuses.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={status === 'rejected' ? 'destructive' : 'secondary'}
                        disabled={advance.isPending}
                        onClick={() => advance.mutate({ id: app.id, workflowStatus: status })}
                      >
                        Advance → {status}
                      </Button>
                    ))}
                    {app.studentOrgId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={cert.isPending}
                        onClick={() => cert.mutate(app.studentOrgId!)}
                      >
                        Certificate PDF
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No organization applications yet" />
          )}
          {accreditedOrgs.data?.length ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Accredited organizations</div>
              <ul className="space-y-1 text-sm">
                {accreditedOrgs.data.map((org) => (
                  <li key={org.id} className="flex flex-wrap items-center gap-2">
                    <span>
                      {org.code} — {org.name}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => cert.mutate(org.id)}
                    >
                      Certificate
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Student ID / RFID requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="Software track">
            Workflow: submitted → OSA verified → payment → provisional digital ID (PDF+QR) and/or
            print queue → printed. RFID vendor + cashier payment validation remain
            university-confirmed references (not live hardware).
          </Alert>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <FormField id="idStudentId" label="Student" required>
              <StudentSearchSelect id="idStudentId" value={idStudentId} onChange={setIdStudentId} />
            </FormField>
            <FormField id="paymentRef" label="Payment validation ref">
              <Input
                id="paymentRef"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="UFMS/OR ref"
              />
            </FormField>
            <FormField id="rfidRef" label="RFID ref">
              <Input
                id="rfidRef"
                value={rfidRef}
                onChange={(e) => setRfidRef(e.target.value)}
                placeholder="Vendor card UID"
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!idStudentId.trim() || submitId.isPending}
              onClick={() => submitId.mutate()}
            >
              Submit new ID request
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!idStudentId.trim() || participation.isPending}
              onClick={() => participation.mutate()}
            >
              Load participation profile
            </Button>
          </div>
          {idRequests.isLoading ? <LoadingState /> : null}
          {idRequests.data?.length ? (
            <ul className="space-y-3">
              {idRequests.data.map((req) => (
                <li
                  key={req.id}
                  className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                >
                  <div className="font-medium">
                    {req.requestType} · {req.status} · print {req.printUnitStatus ?? '—'}
                  </div>
                  <div className="text-[var(--color-muted-foreground)]">
                    Student {req.studentId.slice(0, 8)}… · payment {req.paymentValidationRef ?? '—'}{' '}
                    · RFID {req.rfidRef ?? '—'}
                    {req.digitalDocumentToken
                      ? ` · digital ${req.digitalDocumentToken.slice(0, 8)}…`
                      : ''}
                  </div>
                  {req.digitalVerifyUrl ? (
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)] break-all">
                      Verify: {req.digitalVerifyUrl}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {req.allowedNextStatuses.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={status === 'rejected' ? 'destructive' : 'secondary'}
                        disabled={advanceId.isPending}
                        onClick={() => advanceId.mutate({ id: req.id, status })}
                      >
                        Advance → {status}
                      </Button>
                    ))}
                    {req.digitalDocumentToken ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={digitalPdf.isPending}
                        onClick={() => digitalPdf.mutate(req.id)}
                      >
                        Digital ID PDF
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No student ID requests yet" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const scholarshipProgramSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  sourceType: z.enum(['internal', 'external']),
})

export function ScholarshipOfficePage() {
  return (
    <RequirePermission anyOf={['scholarships.read', 'scholarships.write']}>
      <ScholarshipInner />
    </RequirePermission>
  )
}

function ScholarshipInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const report = useQuery({
    queryKey: ['office', 'scholarship-report'],
    queryFn: () => fetchOfficeReport('scholarship'),
  })
  const assistance = useQuery({
    queryKey: ['office', 'scholarship-assistance'],
    queryFn: fetchScholarshipAssistanceReport,
  })
  const applications = useQuery({
    queryKey: ['office', 'scholarship-applications'],
    queryFn: () => fetchScholarshipApplications(),
  })
  const awards = useQuery({
    queryKey: ['office', 'scholarship-awards'],
    queryFn: () => fetchScholarshipAwards(),
  })
  const saApps = useQuery({
    queryKey: ['office', 'sa-applications'],
    queryFn: fetchSaApplications,
  })
  const programForm = useForm<z.infer<typeof scholarshipProgramSchema>>({
    resolver: zodResolver(scholarshipProgramSchema),
    defaultValues: { sourceType: 'internal', code: '', name: '' },
  })
  const [programId, setProgramId] = useState('')
  const [scholarStudentId, setScholarStudentId] = useState('')
  const [awardResult, setAwardResult] = useState('')
  const [saStudentId, setSaStudentId] = useState('')
  const [deployOffice, setDeployOffice] = useState('Registrar')
  const createProgram = useMutation({
    mutationFn: (values: z.infer<typeof scholarshipProgramSchema>) =>
      createScholarshipProgram({
        ...values,
        eligibilityConfig: { note: 'Office-configured; no hard-coded cutoffs' },
        coverageConfig: { calculationMethod: 'fixed', fixedAmount: 1000 },
      }),
    onSuccess: (data) => {
      const id = (data as { id?: string }).id
      if (id) setProgramId(id)
      notify({ tone: 'success', title: 'Program saved' })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-assistance'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const apply = useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error('Create/select a program first')
      if (!scholarStudentId.trim()) throw new Error('Select a student')
      return applyScholarship({
        programId,
        studentId: scholarStudentId,
        incomeClassification: 'office_band',
        requirementsJson: { docs: ['doc://income'] },
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Application submitted' })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-applications'] })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-assistance'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const decide = useMutation({
    mutationFn: (id: string) =>
      decideScholarshipApplication(id, { approve: true, awardAmount: 1000 }),
    onSuccess: () => {
      setAwardResult(
        'Scholarship awarded. Tuition aid tagged. No cashier payment was posted.'
      )
      notify({ tone: 'success', title: 'Scholarship awarded' })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-applications'] })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-awards'] })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-assistance'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const submitSa = useMutation({
    mutationFn: async () => {
      if (!saStudentId.trim()) throw new Error('Select a student')
      return submitSaApplication({ studentId: saStudentId })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'SA application submitted' })
      void qc.invalidateQueries({ queryKey: ['office', 'sa-applications'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const completeSaReqs = useMutation({
    mutationFn: (id: string) =>
      updateSaRequirements(id, [
        { key: 'application_form', submitted: true },
        { key: 'grades_certification', submitted: true },
        { key: 'interview_availability', submitted: true },
        { key: 'office_preference', submitted: true },
      ]),
    onSuccess: () => {
      notify({ tone: 'success', title: 'SA requirements complete' })
      void qc.invalidateQueries({ queryKey: ['office', 'sa-applications'] })
    },
    onError: (err) => notify(notifyGenericError(err)),
  })

  const advanceSa = useMutation({
    mutationFn: (args: {
      id: string
      workflowStatus:
        'cjpc' | 'screening_committee' | 'vpsas' | 'president' | 'deployed' | 'rejected'
      deploymentOffice?: string
      interviewScore?: number
    }) =>
      advanceSaApplication(args.id, {
        workflowStatus: args.workflowStatus,
        deploymentOffice: args.deploymentOffice,
        interviewScore: args.interviewScore,
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'SA workflow advanced' })
      void qc.invalidateQueries({ queryKey: ['office', 'sa-applications'] })
      void qc.invalidateQueries({ queryKey: ['office', 'scholarship-assistance'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  const interviewSa = useMutation({
    mutationFn: (id: string) =>
      scheduleSaInterview(id, new Date(Date.now() + 2 * 86400000).toISOString()),
    onSuccess: () => {
      notify({ tone: 'success', title: 'SA interview scheduled' })
      void qc.invalidateQueries({ queryKey: ['office', 'sa-applications'] })
    },
    onError: (err) =>
      notify(notifyGenericError(err)),
  })

  function nextSaStatus(status: string) {
    const map: Record<string, 'cjpc' | 'screening_committee' | 'vpsas' | 'president' | 'deployed'> =
      {
        submitted: 'cjpc',
        cjpc: 'screening_committee',
        screening_committee: 'vpsas',
        vpsas: 'president',
        president: 'deployed',
      }
    return map[status]
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scholarship & student assistance"
        description="Scholarship applications/awards, tuition aid tagging, SA CJPC→President workflow, and assistance reports."
      />
      <QueryPage title="Desk load" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
          </div>
        )}
      </QueryPage>
      {assistance.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <DashboardCard title="Active awards" value={assistance.data.activeAwardCount} />
          <DashboardCard title="Fund utilization" value={assistance.data.fundUtilizationTotal} />
          <DashboardCard title="SA deployed" value={assistance.data.saDeployments.length} />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Scholarship program</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-md gap-3"
            onSubmit={programForm.handleSubmit((v) => createProgram.mutate(v))}
          >
            <FormField
              id="code"
              label="Code"
              error={programForm.formState.errors.code?.message}
              required
            >
              <Input id="code" {...programForm.register('code')} />
            </FormField>
            <FormField
              id="name"
              label="Name"
              error={programForm.formState.errors.name?.message}
              required
            >
              <Input id="name" {...programForm.register('name')} />
            </FormField>
            <FormField id="sourceType" label="Source">
              <Select id="sourceType" {...programForm.register('sourceType')}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={createProgram.isPending}>
              Save program
            </Button>
          </form>
          {programId ? (
            <div className="mt-4 grid max-w-xl gap-3">
              <Alert variant="success" title="Program ready">
                {programId}
              </Alert>
              <FormField id="scholarStudentRef" label="Student">
                <StudentSearchSelect
                  id="scholarStudentRef"
                  value={scholarStudentId}
                  onChange={setScholarStudentId}
                />
              </FormField>
              <Button
                type="button"
                variant="outline"
                onClick={() => apply.mutate()}
                disabled={apply.isPending || !scholarStudentId.trim()}
              >
                Submit scholarship application
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications & awards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {awardResult ? (
            <p data-testid="scholarship-award-result">{awardResult}</p>
          ) : null}
          {(applications.data ?? []).slice(0, 8).map((app) => (
            <div
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
            >
              <span>
                {app.studentNumber ?? app.studentId} · {app.programCode} · {app.status}
              </span>
              {app.status === 'submitted' || app.status === 'evaluated' ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate(app.id)}
                >
                  Approve + tag tuition aid
                </Button>
              ) : null}
            </div>
          ))}
          {(awards.data ?? []).length ? (
            <div>
              <div className="font-medium">Active awards (multiple per student supported)</div>
              <ul className="mt-1 space-y-1">
                {(awards.data ?? []).slice(0, 8).map((a) => (
                  <li key={a.id}>
                    {a.scholarshipCode} · {a.name} · {a.amount}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student assistant workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="info" title="CJPC → Screening → VPSAS → President → Deployed">
            Interview scoring thresholds remain [CONFIRM]. Requirements must be complete before
            advancing.
          </Alert>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="saStudentRef" label="Student">
              <StudentSearchSelect
                id="saStudentRef"
                value={saStudentId}
                onChange={setSaStudentId}
              />
            </FormField>
            <FormField id="deployOffice" label="Deployment office">
              <Input
                id="deployOffice"
                value={deployOffice}
                onChange={(e) => setDeployOffice(e.target.value)}
              />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={submitSa.isPending || !saStudentId.trim()}
            onClick={() => submitSa.mutate()}
          >
            Submit SA application
          </Button>
          <ul className="space-y-3 text-sm">
            {(saApps.data ?? []).slice(0, 8).map((app) => {
              const next = nextSaStatus(app.workflowStatus)
              return (
                <li
                  key={app.id}
                  className="space-y-2 rounded-lg border border-[var(--color-border)] px-3 py-3"
                >
                  <div>
                    {app.studentNumber ?? app.studentId} · {app.workflowStatus}
                    {app.deploymentOffice ? ` · ${app.deploymentOffice}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!app.requirementsComplete ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={completeSaReqs.isPending}
                        onClick={() => completeSaReqs.mutate(app.id)}
                      >
                        Complete requirements
                      </Button>
                    ) : null}
                    {app.workflowStatus === 'cjpc' ||
                    app.workflowStatus === 'screening_committee' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={interviewSa.isPending}
                        onClick={() => interviewSa.mutate(app.id)}
                      >
                        Schedule interview
                      </Button>
                    ) : null}
                    {next ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={advanceSa.isPending || !app.requirementsComplete}
                        onClick={() =>
                          advanceSa.mutate({
                            id: app.id,
                            workflowStatus: next,
                            deploymentOffice: next === 'deployed' ? deployOffice : undefined,
                            interviewScore:
                              next === 'screening_committee' || next === 'vpsas' ? 85 : undefined,
                          })
                        }
                      >
                        Advance to {next.replaceAll('_', ' ')}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
