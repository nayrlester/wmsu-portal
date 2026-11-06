import axios from 'axios'
import { apiClient } from '@/lib/api-client'

export type PageParams = {
  page?: number
  limit?: number
  search?: string
  status?: string
  [key: string]: string | number | undefined
}

export type PaginatedResult<T> = {
  data: T[]
  meta: {
    total?: number
    perPage?: number
    currentPage?: number
    lastPage?: number
  }
}

function asArray<T>(payload: unknown): T[] {
  const root = payload as { data?: { data?: T[] } | T[] }
  if (!root?.data) return []
  if (Array.isArray(root.data)) return root.data
  return root.data.data ?? []
}

function asPaginated<T>(payload: unknown): PaginatedResult<T> {
  const root = payload as {
    data?:
      | T[]
      | {
          data?: T[]
          meta?: PaginatedResult<T>['meta'] & {
            per_page?: number
            current_page?: number
            last_page?: number
          }
          total?: number
          perPage?: number
          per_page?: number
          currentPage?: number
          current_page?: number
          lastPage?: number
          last_page?: number
        }
  }
  if (!root?.data) return { data: [], meta: {} }
  if (Array.isArray(root.data)) return { data: root.data, meta: {} }
  const block = root.data
  const meta = block.meta
  return {
    data: block.data ?? [],
    meta: {
      total: meta?.total ?? block.total,
      perPage: meta?.perPage ?? meta?.per_page ?? block.perPage ?? block.per_page,
      currentPage:
        meta?.currentPage ?? meta?.current_page ?? block.currentPage ?? block.current_page,
      lastPage: meta?.lastPage ?? meta?.last_page ?? block.lastPage ?? block.last_page,
    },
  }
}

function asData<T>(payload: unknown): T {
  const root = payload as { data?: T }
  return (root.data ?? payload) as T
}

export async function fetchApplicants(params: PageParams = {}) {
  const { data } = await apiClient.get('/applicants', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    firstName: string
    lastName: string
    status: string
    appliedAt: string
    email?: string
    classification?: string | null
    mdmCampusId?: string | null
  }>(data)
}

export async function updateApplicant(
  id: string,
  payload: {
    classification?: string | null
    mdmCampusId?: string | null
    status?: string
  }
) {
  const { data } = await apiClient.patch(`/applicants/${id}`, payload)
  return asData(data)
}

export async function admitApplicant(id: string, studentNumber: string) {
  const { data } = await apiClient.post(`/applicants/${id}/admit`, { studentNumber })
  return asData(data)
}

export type AdmissionFormField = {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
  required?: boolean
  options?: string[]
}

export type AdmissionSurveyQuestion = {
  key: string
  prompt: string
  required?: boolean
}

export type AdmissionFormConfig = {
  id: string
  version: string
  name: string
  formFields: AdmissionFormField[]
  surveyQuestions: AdmissionSurveyQuestion[]
  termsText: string
  privacyConsentText: string
  isActive: boolean
}

export async function fetchAdmissionForms() {
  const { data } = await apiClient.get('/admissions/forms')
  return (data as { data: AdmissionFormConfig[] }).data
}

export async function fetchActiveAdmissionForm() {
  const { data } = await apiClient.get('/admissions/forms/active')
  return (data as { data: AdmissionFormConfig | null }).data
}

export async function createAdmissionForm(payload: {
  version: string
  name: string
  formFields?: AdmissionFormField[]
  surveyQuestions?: AdmissionSurveyQuestion[]
  termsText?: string
  privacyConsentText?: string
  isActive?: boolean
}) {
  const { data } = await apiClient.post('/admissions/forms', payload)
  return (data as { data: AdmissionFormConfig }).data
}

export async function updateAdmissionForm(
  id: string,
  payload: Partial<{
    name: string
    formFields: AdmissionFormField[]
    surveyQuestions: AdmissionSurveyQuestion[]
    termsText: string
    privacyConsentText: string
    isActive: boolean
  }>
) {
  const { data } = await apiClient.patch(`/admissions/forms/${id}`, payload)
  return (data as { data: AdmissionFormConfig }).data
}

export async function applyOnlineAdmission(payload: {
  orgCode?: string
  firstName: string
  lastName: string
  email: string
  middleName?: string
  mobile?: string
  birthDate?: string
  programId?: string
  classification?: 'new' | 'freshman' | 'transferee' | 'returning'
  formAnswers?: Record<string, string>
  surveyAnswers?: Record<string, string>
  termsAccepted: boolean
  privacyConsentAccepted: boolean
  autoAssignEntranceExam?: boolean
}) {
  const { data } = await apiClient.post('/admissions/apply', payload)
  return (
    data as {
      data: {
        id: string
        applicationNumber: string
        status: string
        classification: string | null
        privacyConsentVersion: string | null
        formConfigId: string | null
        entranceExamAssigned: boolean
        entranceExamEventId: string | null
        nextPath: string
      }
    }
  ).data
}

export type ApplicantJourneyStep = {
  id: string
  label: string
  status: 'done' | 'current' | 'upcoming'
}

export type ApplicantProgramGuidance = {
  secondaryBackground: string | null
  academicStrand: string | null
  examSuggestedStrand?: string | null
  strandSource?: string | null
  strandName: string | null
  forStudents: string | null
  interests: string[]
  guidanceNote: string
  suggestedPrograms: Array<{
    id: string
    code: string
    name: string
    matchedToStrand: boolean
  }>
  allProgramsCount: number
}

export type EntranceExamOutcome = {
  eventId?: string
  eventTitle?: string
  result?: string
  percentScore?: number
  correct?: number
  maxScore?: number
  passScore?: number
  suggestedStrand?: string | null
  rankedStrands?: string[]
  strandScores?: Record<string, { correct: number; total: number; percent: number }>
  submittedAt?: string | null
}

export type ApplicantPortalStatus = {
  applicationNumber: string
  firstName: string
  lastName: string
  email: string
  status: string
  classification: string | null
  secondaryBackground?: string | null
  academicStrand?: string | null
  entranceExamOutcome?: EntranceExamOutcome | null
  programGuidance?: ApplicantProgramGuidance | null
  programId: string | null
  program: { id: string; code: string; name: string } | null
  appliedAt: string | null
  admittedAt: string | null
  statusHistory: Array<{
    fromStatus: string | null
    toStatus: string
    note: string | null
    createdAt: string | null
  }>
  events: Array<{
    eventId?: string
    eventType: string | null
    title: string | null
    scheduledAt: string | null
    location: string | null
    deliveryMode?: string
    result: string
    score: number | null
    percentScore?: number | null
    submittedAt?: string | null
    canTakeOnline?: boolean
  }>
  openOnlineExams?: Array<{
    id: string
    title: string
    scheduledAt: string | null
    durationMinutes: number | null
    passScore: number | null
    questionCount: number
  }>
  journey?: {
    classification: string | null
    needsEntranceExam: boolean
    passedExam: boolean
    canTakeExam: boolean
    takeExamEventId: string | null
    canJoinOpenExam: boolean
    requirements: string[]
    requirementsSubmitted: boolean
    programId: string | null
    steps: ApplicantJourneyStep[]
    nextAction: string | null
  }
}

export async function lookupApplicantPortalStatus(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
}) {
  const { data } = await apiClient.post('/admissions/status', payload)
  return (data as { data: ApplicantPortalStatus }).data
}

export async function fetchPublicAdmissionPrograms(orgCode = 'UNI') {
  const { data } = await apiClient.get('/admissions/programs', { params: { orgCode } })
  return (
    data as {
      data: Array<{
        id: string
        code: string
        name: string
        degreeLevel: string | null
        years: number
      }>
    }
  ).data
}

export async function fetchPublicAdmissionForm(orgCode = 'UNI') {
  const { data } = await apiClient.get('/admissions/form', { params: { orgCode } })
  return (data as { data: AdmissionFormConfig | null }).data
}

export async function updateGuestAdmissionJourney(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
  classification?: 'new' | 'freshman' | 'transferee' | 'returning'
  programId?: string | null
  secondaryBackground?: 'shs_academic' | 'shs_other' | 'not_shs' | 'undecided' | null
  academicStrand?: 'ABM' | 'STEM' | 'HUMSS' | 'GAS' | null
  requirementsChecklist?: string[]
  requirementsSubmitted?: boolean
}) {
  const { data } = await apiClient.post('/admissions/journey', payload)
  return (data as { data: ApplicantPortalStatus }).data
}

export type GuestExamQuestion = {
  id: string
  prompt: string
  choices: string[]
}

export type GuestExamSession = {
  eventId: string
  title: string
  durationMinutes: number | null
  passScore: number
  startedAt: string | null
  expiresAt: string | null
  questionCount: number
  questions: GuestExamQuestion[]
  applicant: { applicationNumber: string; firstName: string; lastName: string }
}

export async function openGuestEntranceExam(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
  eventId?: string
}) {
  const { data } = await apiClient.post('/admissions/exam/open', payload)
  return (data as { data: GuestExamSession }).data
}

export async function submitGuestEntranceExam(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
  eventId: string
  answers: Record<string, number>
}) {
  const { data } = await apiClient.post('/admissions/exam/submit', payload)
  return (
    data as {
      data: {
        result: string
        score: number
        percentScore: number
        maxScore: number
        correct: number
        passScore: number
        remarks: string | null
        suggestedStrand: string | null
        rankedStrands: string[]
        strandScores: Record<string, { correct: number; total: number; percent: number }>
        nextAction: string
      }
    }
  ).data
}

export type AdmissionEventType = 'entrance_exam' | 'interview' | 'assessment'
export type AdmissionEventResultValue = 'pending' | 'pass' | 'fail' | 'waived'
export type AdmissionDeliveryMode = 'onsite' | 'online' | 'hybrid'

export type AdmissionExamQuestion = {
  id: string
  prompt: string
  choices: string[]
  correctIndex: number
  strandTag?: 'ABM' | 'STEM' | 'HUMSS' | 'GAS' | 'general'
}

export type AdmissionEvent = {
  id: string
  eventType: AdmissionEventType
  title: string
  scheduledAt: string | null
  location: string | null
  capacity: number | null
  notes: string | null
  isActive: boolean
  deliveryMode?: AdmissionDeliveryMode
  passScore?: number | null
  durationMinutes?: number | null
  windowOpensAt?: string | null
  windowClosesAt?: string | null
  questionCount?: number
  questions?: AdmissionExamQuestion[]
}

export async function fetchAdmissionEvents(eventType?: AdmissionEventType) {
  const { data } = await apiClient.get('/admissions/events', {
    params: eventType ? { eventType } : undefined,
  })
  return (data as { data: AdmissionEvent[] }).data
}

export async function createAdmissionEvent(payload: {
  eventType: AdmissionEventType
  title: string
  scheduledAt: string
  location?: string
  capacity?: number
  notes?: string
  deliveryMode?: AdmissionDeliveryMode
  passScore?: number
  durationMinutes?: number
  windowOpensAt?: string
  windowClosesAt?: string
  questions?: AdmissionExamQuestion[]
}) {
  const { data } = await apiClient.post('/admissions/events', payload)
  return (data as { data: AdmissionEvent }).data
}

export async function updateAdmissionEvent(
  id: string,
  payload: Partial<{
    title: string
    scheduledAt: string
    location: string | null
    capacity: number | null
    notes: string | null
    isActive: boolean
    deliveryMode: AdmissionDeliveryMode
    passScore: number | null
    durationMinutes: number | null
    windowOpensAt: string | null
    windowClosesAt: string | null
    questions: AdmissionExamQuestion[] | null
  }>
) {
  const { data } = await apiClient.patch(`/admissions/events/${id}`, payload)
  return (data as { data: AdmissionEvent }).data
}

export async function assignApplicantToEvent(payload: { eventId: string; applicantId: string }) {
  const { data } = await apiClient.post('/admissions/events/assign', payload)
  return asData(data)
}

export async function recordAdmissionEventResult(payload: {
  eventId: string
  applicantId: string
  result: AdmissionEventResultValue
  score?: number
  remarks?: string
}) {
  const { data } = await apiClient.post('/admissions/events/results', payload)
  return asData(data)
}

export async function fetchApplicantStatusHistory(applicantId: string) {
  const { data } = await apiClient.get(`/applicants/${applicantId}/status-history`)
  return (
    data as {
      data: Array<{
        id: string
        fromStatus: string | null
        toStatus: string
        note: string | null
        createdAt: string | null
      }>
    }
  ).data
}

export type SubjectCredit = {
  id: string
  subjectId: string | null
  subjectCode: string
  subjectTitle: string
  units: number
  creditType: string
  sourceSchool: string | null
  status: string
  externalSubjectCode: string | null
  externalSubjectTitle: string | null
  notes: string | null
  reviewedAt: string | null
  createdAt: string | null
}

export type CurriculumRemainingSubject = {
  id: string
  subjectCode: string
  title: string
  units: number
  yearLevel?: number | null
  semester?: number | null
}

export type CurriculumEvaluationResult = {
  passed: string[]
  failed: string[]
  remaining: CurriculumRemainingSubject[]
  currentTermRemaining?: CurriculumRemainingSubject[]
  planByTerm?: Array<{
    yearLevel: number
    semester: number
    subjects: CurriculumRemainingSubject[]
  }>
  creditedInternal: string[]
  creditedExternal: string[]
  creditedEquivalent: string[]
  academicStanding: string
}

export async function fetchStudentCurriculumEvaluation(studentId: string) {
  const { data } = await apiClient.get(`/students/${studentId}/curriculum-evaluation`)
  return (data as { data: CurriculumEvaluationResult }).data
}

export async function fetchMyCurriculumPlan() {
  const { data } = await apiClient.get('/student-portal/curriculum-plan')
  return data as {
    data: CurriculumEvaluationResult & {
      student: {
        id: string
        studentNumber: string
        yearLevel: number | null
        programId: string | null
      }
    }
  }
}

export async function fetchStudentOpenAcademicYears() {
  const { data } = await apiClient.get('/student-portal/academic-years')
  return asData<Array<{ id: string; code: string; name: string }>>(data)
}

export async function startMyEnrollment(payload: {
  academicYearId: string
  semester: number
  yearLevel?: number
}) {
  const { data } = await apiClient.post('/student-portal/enrollments/start', payload)
  return asData(data)
}

export async function fetchStudentSubjectCredits(studentId: string) {
  const { data } = await apiClient.get(`/students/${studentId}/subject-credits`)
  return (data as { data: SubjectCredit[] }).data
}

export async function autoCreditInternalSubjects(studentId: string) {
  const { data } = await apiClient.post(`/students/${studentId}/subject-credits/auto-internal`)
  return data as { data: { created: SubjectCredit[]; evaluation: CurriculumEvaluationResult } }
}

export async function submitExternalSubjectCredit(
  studentId: string,
  payload: {
    externalSubjectCode: string
    externalSubjectTitle: string
    units: number
    sourceSchool?: string
    notes?: string
    mapToSubjectId?: string
  }
) {
  const { data } = await apiClient.post(`/students/${studentId}/subject-credits/external`, payload)
  return (data as { data: SubjectCredit }).data
}

export async function reviewSubjectCredit(
  studentId: string,
  creditId: string,
  payload: { decision: 'credited' | 'rejected'; mapToSubjectId?: string; notes?: string }
) {
  const { data } = await apiClient.patch(
    `/students/${studentId}/subject-credits/${creditId}`,
    payload
  )
  return (data as { data: SubjectCredit }).data
}

export async function applySubjectEquivalencies(studentId: string) {
  const { data } = await apiClient.post(
    `/students/${studentId}/subject-credits/apply-equivalencies`
  )
  return (data as { data: SubjectCredit[] }).data
}

export async function fetchSubjectEquivalencies() {
  const { data } = await apiClient.get('/academic/subject-equivalencies')
  return (
    data as {
      data: Array<{
        id: string
        internalSubjectId: string
        internalSubjectCode: string | null
        internalSubjectTitle: string | null
        externalCode: string
        externalTitle: string | null
        sourceSchool: string | null
        isActive: boolean
      }>
    }
  ).data
}

export async function createSubjectEquivalency(payload: {
  internalSubjectId: string
  externalCode: string
  externalTitle?: string
  sourceSchool?: string
}) {
  const { data } = await apiClient.post('/academic/subject-equivalencies', payload)
  return asData(data)
}

export type StudentImportBatch = {
  id: string
  sourceName: string
  status: string
  totalRows: number
  acceptedCount: number
  rejectedCount: number
  createdAt: string | null
  completedAt: string | null
}

export type StudentImportResult = {
  batch: StudentImportBatch
  accepted: Array<{ id: string; rowNumber: number; studentId: string; studentNumber: string }>
  rejections: Array<{
    id: string
    rowNumber: number
    reason: string
    payload: Record<string, unknown>
  }>
}

export async function fetchStudentImportBatches() {
  const { data } = await apiClient.get('/students/import/batches')
  return (data as { data: StudentImportBatch[] }).data
}

export async function fetchStudentImportBatch(id: string) {
  const { data } = await apiClient.get(`/students/import/batches/${id}`)
  return (data as { data: StudentImportResult }).data
}

export async function importStudentsBulk(payload: {
  sourceName?: string
  rows: Array<{
    studentNumber?: string
    firstName?: string
    lastName?: string
    email?: string
    middleName?: string
    mobile?: string
    programCode?: string
    classification?: string
    yearLevel?: number
    status?: string
  }>
}) {
  const { data } = await apiClient.post('/students/import', payload)
  return (data as { data: StudentImportResult }).data
}

export async function downloadStudentImportRejectionCsv(batchId: string) {
  const { data } = await apiClient.get(`/students/import/batches/${batchId}/rejections.csv`, {
    responseType: 'blob',
  })
  return data as Blob
}

export async function fetchStudents(params: PageParams = {}) {
  const { data } = await apiClient.get('/students', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    studentNumber: string
    firstName: string
    lastName: string
    email: string
    status: string
    classification?: string | null
    mdmCampusId?: string | null
    yearLevel?: number
    programId?: string
  }>(data)
}

export type StudentProfilePayload = {
  student: {
    id: string
    studentNumber: string
    firstName: string
    middleName: string | null
    lastName: string
    email: string
    mobile: string | null
    status: string
    classification: string | null
    yearLevel: number | null
    mdmCampusId: string | null
    programCode: string | null
    programName: string | null
  }
  performance: {
    gradeCount: number
    grades: Array<Record<string, unknown>>
    gwa: {
      termGwa: number | null
      cumulativeGwa: number | null
      unitsEarned: number
      unitsGraded: number
      academicStanding: string | null
      asOf: string | null
    } | null
    academicStanding: string | null
  }
  absences: {
    summary: { total: number; absent: number; late: number; excused: number; present: number }
    records: Array<{ id: string; sessionDate: string; status: string; notes: string | null }>
  }
  violations: {
    academic: Array<{
      id: string
      violationCode: string
      title: string
      description: string | null
      status: string
      occurredAt: string | null
    }>
    osaSanctions: Array<{ id: string; sanctionCode: string; label: string }>
  }
  transcriptNote: string
  generatedAt: string
}

export async function fetchMyStudentProfile() {
  const { data } = await apiClient.get('/students/me/profile')
  return asData<StudentProfilePayload>(data)
}

export async function fetchStudentProfile(studentId: string) {
  const { data } = await apiClient.get(`/students/${studentId}/profile`)
  return asData<StudentProfilePayload>(data)
}

export async function computeStudentGwa(studentId: string) {
  const { data } = await apiClient.post(`/grades/students/${studentId}/gwa`)
  return asData<{
    cumulativeGwa: number | null
    termGwa: number | null
    unitsGraded: number | null
    academicStanding: string | null
  }>(data)
}

export async function recordStudentViolation(
  studentId: string,
  payload: {
    violationCode: string
    title: string
    description?: string | null
    status?: string
    occurredAt?: string
  }
) {
  const { data } = await apiClient.post(`/students/${studentId}/violations`, payload)
  return asData(data)
}

export async function fetchClassRecords(params: PageParams = {}) {
  const { data } = await apiClient.get('/grades/class-records', {
    params: { limit: 20, ...params },
  })
  return asPaginated<{
    id: string
    subjectCode: string
    subjectTitle: string
    status: string
    sectionId: string
    academicYearId: string
    semester: number
  }>(data)
}

export async function fetchClassGradeReport(classRecordId: string) {
  const { data } = await apiClient.get(`/grades/class-records/${classRecordId}/report`)
  return asData<{
    classRecord: Record<string, unknown>
    students: Array<Record<string, unknown>>
    signatories: Array<{ role: string; name: string }>
  }>(data)
}

export async function exportClassGradeReport(
  classRecordId: string,
  format: 'csv' | 'xlsx' | 'pdf'
) {
  const { data } = await apiClient.get(`/grades/class-records/${classRecordId}/report/export`, {
    params: { format },
    responseType: 'blob',
  })
  return data as Blob
}

export type StudentClassificationOption = { code: string; label: string }

export async function fetchStudentClassifications() {
  const { data } = await apiClient.get('/students/classifications')
  return asData<StudentClassificationOption[]>(data)
}

export async function updateStudentProfile(
  id: string,
  payload: {
    classification?: string | null
    mdmCampusId?: string | null
    yearLevel?: number | null
    status?: string
  }
) {
  const { data } = await apiClient.patch(`/students/${id}`, payload)
  return asData(data)
}

export type StudentMergeJob = {
  id: string
  survivorStudentId: string
  duplicateStudentId: string
  status: string
  reportJson: Record<string, unknown>
  note: string | null
  createdAt: string | null
  completedAt: string | null
}

export async function fetchStudentMergeJobs() {
  const { data } = await apiClient.get('/students/merge-jobs')
  return asData<StudentMergeJob[]>(data)
}

export async function mergeStudentAccounts(payload: {
  survivorStudentId: string
  duplicateStudentId: string
  note?: string
}) {
  const { data } = await apiClient.post('/students/merge', payload)
  return asData<{
    job: StudentMergeJob
    survivor: { id: string; studentNumber: string; status: string }
    duplicate: {
      id: string
      studentNumber: string
      status: string
      mergedIntoStudentId?: string | null
    }
  }>(data)
}

export async function fetchEnrollments(params: PageParams = {}) {
  const { data } = await apiClient.get('/enrollments', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    status: string
    yearLevel: number
    semester: number
    studentId: string
    student?: { id: string; studentNumber: string; firstName: string; lastName: string }
    assessments?: Array<{
      id: string
      assessmentNumber: string
      netAmount: number
      paidAmount?: number
      balanceAmount?: number
      ufmsPaymentStatus?: string | null
    }>
  }>(data)
}

export async function assessEnrollment(body: {
  enrollmentId: string
  feeScheduleId?: string
  tuitionFee?: number
  miscFees?: number
  discount?: number
}) {
  const { data } = await apiClient.post('/enrollments/assess', body)
  return asData(data)
}

export async function fetchEnrollment(id: string, options?: { includeSchedule?: boolean }) {
  const params = options?.includeSchedule ? { include: 'schedule' } : undefined
  const { data } = await apiClient.get(`/enrollments/${id}`, { params })
  return asData<{
    id: string
    status: string
    yearLevel: number
    semester: number
    studentId: string
    paymentVerified?: boolean
    registrarApprovedAt?: string | null
    lines?: Array<{
      id: string
      subjectCode: string
      subjectTitle: string
      units: number
      status: string
    }>
    overrides?: unknown[]
    scheduleRows?: Array<{
      lineId: string
      subjectCode: string
      subjectTitle: string
      units: number
      sectionCode: string | null
      status: string
      meetingLabels: string[]
      facultyNames: string[]
    }>
  }>(data)
}

export async function fetchStudentEnrollmentWorkflow() {
  const { data } = await apiClient.get('/student-portal/enrollment-workflow')
  return asData<EnrollmentWorkflowView | null>(data)
}

export async function fetchEnrollmentWorkflow(id: string) {
  const { data } = await apiClient.get(`/enrollments/${id}/workflow`)
  return asData<EnrollmentWorkflowView>(data)
}

export async function createEnrollment(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/enrollments', body)
  return asData(data)
}

export async function registerEnrollment(id: string) {
  const { data } = await apiClient.post(`/enrollments/${id}/register`)
  return asData(data)
}

export async function verifyEnrollmentPayment(id: string) {
  const { data } = await apiClient.post(`/enrollments/${id}/verify-payment`, undefined, {
    skipHttpToast: true,
  })
  return asData(data)
}

export async function approveRegistrarEnrollment(id: string) {
  const { data } = await apiClient.post(`/enrollments/${id}/registrar-approve`)
  return asData(data)
}

export async function fetchPayments(params: PageParams = {}) {
  const { data } = await apiClient.get('/payments', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    amount: number
    orNumber: string | null
    paymentType: string
    paidAt: string
    ufmsConfirmed?: boolean
    student?: { studentNumber: string; firstName: string; lastName: string }
  }>(data)
}

export async function fetchClearance(studentNumber: string) {
  const { data } = await apiClient.get(`/clearance/${encodeURIComponent(studentNumber)}`)
  return asData<{
    cleared: boolean
    student: { studentNumber: string; name: string }
    checks: Record<string, { cleared: boolean; openItems?: number; error?: boolean }>
  }>(data)
}

export type OfficeClearanceBundle = {
  student: { id: string; studentNumber: string; name: string }
  overallCleared: boolean
  holdOffices: string[]
  offices: Array<{
    office: string
    cleared: boolean
    items: Array<{
      id: string
      requirementCode: string
      label: string
      status: string
      autoSynced: boolean
      sourceRef: string | null
    }>
  }>
  assessment?: {
    assessmentNumber: string
    netAmount: number | null
    paidAmount: number | null
    balanceAmount: number | null
    ufmsPaymentStatus: string | null
  } | null
  note?: string
}

export async function fetchOfficeClearanceRequirements(office?: string) {
  const { data } = await apiClient.get('/clearance/office-requirements', {
    params: office ? { office } : undefined,
  })
  return asArray<{
    id: string
    office: string
    requirementCode: string
    label: string
    autoSource: string | null
    isActive: boolean
    sortOrder: number
  }>(data)
}

export async function syncStudentOfficeClearance(studentId: string) {
  const { data } = await apiClient.post(`/clearance/students/${studentId}/office-sync`)
  return asData<OfficeClearanceBundle>(data)
}

export async function advanceOfficeClearanceItem(
  id: string,
  body: { status: 'pending' | 'in_review' | 'cleared' | 'deficient' | 'waived'; notes?: string }
) {
  const { data } = await apiClient.patch(`/clearance/office-items/${id}`, body)
  return asData<OfficeClearanceBundle>(data)
}

export type ClearanceReportIssuePayload = {
  reportId: string
  documentToken: string
  snapshotChecksum: string
  verifyUrl: string
  issuedAt: string
  cleared: boolean
  snapshot: {
    schemaVersion: string
    studentNumber: string
    studentName: string
    cleared: boolean
    generatedAt: string
    checks: Record<string, { cleared: boolean; openItems?: number; error?: boolean }>
  }
}

export async function issueClearanceReport(studentNumber: string) {
  const { data } = await apiClient.post('/clearance/reports', { studentNumber })
  return (data as { data: ClearanceReportIssuePayload }).data
}

export async function fetchClearanceReports(
  params: { studentNumber?: string; limit?: number } = {}
) {
  const { data } = await apiClient.get('/clearance/reports', { params })
  return asArray<{
    reportId: string
    documentToken: string
    studentNumber: string
    studentName: string
    cleared: boolean
    issuedAt: string | null
    verifyUrl: string
    snapshotChecksum: string
  }>(data)
}

export async function downloadClearanceReportPdf(token: string) {
  const { data } = await apiClient.get(`/clearance/reports/${encodeURIComponent(token)}/pdf`, {
    responseType: 'blob',
  })
  return data as Blob
}

export async function fetchClearanceReportVerify(token: string) {
  try {
    const { data } = await apiClient.get(`/clearance/reports/verify/${encodeURIComponent(token)}`)
    return (
      data as {
        data: {
          valid: boolean
          checksumMatches?: boolean
          cleared?: boolean
          studentNumber?: string
          studentName?: string
          issuedAt?: string
        }
      }
    ).data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { valid: false as const }
    }
    throw err
  }
}

export async function fetchAdvisingSessions(params: PageParams = {}) {
  const dash = await fetchAdvisingDashboard()
  const rows = (dash.recentSessions as Array<Record<string, unknown>> | undefined) ?? []
  if (rows.length) {
    return rows.map((r) => ({
      id: String(r.id ?? ''),
      status: String(r.status ?? ''),
      enrollmentId: String(r.enrollmentId ?? ''),
      mode: String(r.mode ?? ''),
      createdAt: String(r.createdAt ?? ''),
    }))
  }
  void params
  return [] as Array<{
    id: string
    status: string
    enrollmentId: string
    mode: string
    createdAt: string
  }>
}

export async function fetchAdvisingDashboard() {
  const { data } = await apiClient.get('/advising/dashboard', { skipHttpErrorToast: true })
  return asData<Record<string, unknown>>(data)
}

export async function startAdvisingSession(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/advising/sessions', body)
  return asData(data)
}

export async function endorseAdvisingSession(id: string) {
  const { data } = await apiClient.post(`/advising/sessions/${id}/endorse`)
  return asData(data)
}

export async function fetchGrades(params: PageParams = {}) {
  const { data } = await apiClient.get('/grades', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    courseCode: string
    courseTitle: string
    units: number
    grade: number | null
    markCode?: string | null
    status?: string
    remarks?: string | null
    submittedAt?: string | null
    studentId?: string | null
    student?: {
      id: string
      studentNumber: string
      firstName: string
      lastName: string
    } | null
  }>(data)
}

export async function fetchMyFacultyAssignments() {
  const { data } = await apiClient.get('/grades/faculty-assignments/mine')
  return asArray<{
    id: string
    sectionId: string
    academicYearId: string
    semester: number
    section?: { code: string; name: string }
  }>(data)
}

export async function openClassRecord(body: {
  sectionId: string
  academicYearId: string
  semester: number
}) {
  const { data } = await apiClient.post('/grades/class-records/open', body)
  return asData<{
    classRecord: { id: string; subjectCode: string; subjectTitle: string; status: string }
    roster: Array<{
      studentId: string
      studentNumber?: string
      firstName?: string
      lastName?: string
    }>
    entries: Array<{
      id: string
      studentId: string
      markCode: string | null
      rawScore?: number | null
      status: string
    }>
  }>(data)
}

export async function enlistClassStudent(classRecordId: string, studentNumber: string) {
  const { data } = await apiClient.post(`/grades/class-records/${classRecordId}/roster`, {
    studentNumber,
  })
  return asData<{
    studentNumber: string
    enrollmentStatus: string
    paymentVerified: boolean
    created: boolean
  }>(data)
}

export async function encodeClassGrades(body: {
  classRecordId: string
  grades: Array<{ studentId: string; markCode: string; rawScore?: number }>
}) {
  const { data } = await apiClient.post('/grades/encode', body)
  return asData(data)
}

export async function submitClassGrades(body: {
  classRecordId: string
  signatories?: Array<{ role: string; name: string }>
}) {
  const { data } = await apiClient.post('/grades/class-records/submit', body)
  return asData(data)
}

export async function requestGradeCorrection(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/grades/corrections', body)
  return asData(data)
}

export async function fetchGradeCorrections(params: PageParams = {}) {
  const { data } = await apiClient.get('/grades/corrections', { params })
  return asArray<{
    id: string
    status: string
    reasonCode: string
    proposedMarkCode: string
    priorMarkCode: string | null
  }>(data)
}

export async function fetchAcademicRecords(studentId: string) {
  const { data } = await apiClient.get(`/grades/students/${studentId}/academic-records`)
  return asData<{
    student: Record<string, unknown>
    grades: Array<Record<string, unknown>>
    gwa: Record<string, unknown> | null
  }>(data)
}

export async function fetchAssessments(params: PageParams = {}) {
  const { data } = await apiClient.get('/assessments', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    assessmentNumber: string
    status: string
    netAmount: number
    ufmsPaymentStatus?: string
  }>(data)
}

export async function syncAssessmentPayment(assessmentId: string) {
  const { data } = await apiClient.post(`/assessments/${assessmentId}/sync-payment-status`)
  return asData<{
    assessment: {
      id: string
      assessmentNumber: string
      paidAmount: number
      netAmount: number
      ufmsPaymentStatus?: string | null
    }
    status: { paymentStatus: string; paidAmount: number; balanceAmount: number }
  }>(data)
}

export async function prepareAssessment(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/assessments/prepare', body)
  return asData(data)
}

export async function issueRegistrationDocument(body: {
  enrollmentId: string
  docType: 'assessment_form' | 'certificate_of_registration'
}) {
  const { data } = await apiClient.post('/assessments/documents', body)
  return asData<{
    id: string
    documentNumber: string
    docType: string
    qrToken: string
    enrollmentId: string
    snapshot?: Record<string, unknown>
    issuedAt?: string | null
  }>(data)
}

export async function fetchRegistrationDocuments(params: PageParams = {}) {
  const { data } = await apiClient.get('/assessments/documents', { params })
  return asArray<{
    id: string
    documentNumber: string
    docType: string
    enrollmentId: string
    qrToken?: string
    snapshot?: Record<string, unknown>
    issuedAt?: string | null
  }>(data)
}

export type EnrollmentWorkflowView = {
  enrollment: {
    id: string
    status: string
    yearLevel: number
    semester: number
    classification: string | null
    sectionCode: string | null
    academicYearCode: string | null
    paymentVerified: boolean
    advisingWaived: boolean
  }
  approvalSteps: string[]
  workflowSteps: Array<{
    key: string
    label: string
    state: 'complete' | 'current' | 'pending' | 'skipped'
    detail: string | null
  }>
  scheduleRows: Array<{
    lineId: string
    subjectCode: string
    subjectTitle: string
    units: number
    sectionCode: string | null
    status: string
    meetingLabels: string[]
    facultyNames: string[]
  }>
  tuitionSummary: {
    netAmount: number | null
    balanceAmount: number | null
    minimumDueRequired: number | null
  }
}

export type StudentAccountMonitor = {
  student: {
    id: string
    studentNumber: string
    firstName: string
    lastName: string
    email: string
    classification: string | null
    status: string
  }
  deficiencies: Array<{
    id: string
    requirementCode: string
    description: string
    status: string
    createdAt: string | null
  }>
  openDeficiencyCount: number
  assessmentBreakdown: Array<{
    feeCode: string
    description: string
    feeType: string
    quantity: number
    unitAmount: number
    amount: number
  }>
  tuitionBalance: {
    assessedAmount: number
    paidAmount: number
    balanceAmount: number
    minimumDueRequired?: number | null
    source: string
    asOf: string | null
    assessmentId: string | null
  } | null
  paymentSchedule: {
    minimumDueRequired: number | null
    installments: Array<{
      sequence: number
      label: string
      amount: number
      paidAmount: number
      dueDate: string | null
      status: string
    }>
  } | null
  runningGrades: Array<{
    id: string
    courseCode: string
    courseTitle: string
    units: number
    markCode: string | null
    grade: number | null
    numericGrade: number | null
    status: string
    enrollmentId: string
  }>
  assessmentForms: Array<{
    id: string
    documentNumber: string
    enrollmentId: string
    assessmentId: string | null
    qrToken: string
    issuedAt: string | null
    snapshot: Record<string, unknown>
  }>
  latestAssessment: {
    id: string
    assessmentNumber: string
    enrollmentId: string
    status: string
    netAmount: number
    paidAmount: number
    balanceAmount: number
    ufmsPaymentStatus: string | null
    minimumDueRequired?: number | null
  } | null
}

export async function fetchMyAccountMonitor() {
  const { data } = await apiClient.get('/assessments/me/monitor')
  return asData<StudentAccountMonitor>(data)
}

export async function fetchStudentAccountMonitor(studentId: string) {
  const { data } = await apiClient.get(`/assessments/students/${studentId}/monitor`)
  return asData<StudentAccountMonitor>(data)
}

export type StudentRequirement = {
  id: string
  studentId: string
  studentNumber: string | null
  studentName: string | null
  requirementCode: string
  description: string
  status: string
  reviewNotes: string | null
  reviewedAt: string | null
  clearedAt: string | null
  createdAt: string | null
}

export async function fetchDeficiencies(params: PageParams = {}) {
  const { data } = await apiClient.get('/deficiencies', { params })
  return asArray<StudentRequirement>(data)
}

export async function createStudentRequirement(payload: {
  studentId: string
  requirementCode: string
  description: string
}) {
  const { data } = await apiClient.post('/deficiencies', payload)
  return (data as { data: StudentRequirement }).data
}

export async function submitStudentRequirement(id: string, notes?: string) {
  const { data } = await apiClient.post(`/deficiencies/${id}/submit`, { notes })
  return (data as { data: StudentRequirement }).data
}

export async function approveStudentRequirement(id: string, notes?: string) {
  const { data } = await apiClient.post(`/deficiencies/${id}/approve`, { notes })
  return (data as { data: StudentRequirement }).data
}

export async function rejectStudentRequirement(id: string, notes?: string) {
  const { data } = await apiClient.post(`/deficiencies/${id}/reject`, { notes })
  return (data as { data: StudentRequirement }).data
}

export async function clearStudentRequirement(id: string) {
  const { data } = await apiClient.post(`/deficiencies/${id}/clear`)
  return (data as { data: StudentRequirement }).data
}

export async function deleteStudentRequirement(id: string) {
  await apiClient.delete(`/deficiencies/${id}`)
}

export async function fetchRequirementsComplianceReport() {
  const { data } = await apiClient.get('/deficiencies/compliance-report')
  return (
    data as {
      data: {
        generatedAt: string
        statusCounts: Record<string, number>
        openByRequirementCode: Array<{ requirementCode: string; total: number }>
        nonCompliantStudents: Array<{
          studentId: string
          studentNumber: string
          name: string
          email: string
          openCount: number
        }>
        blockingStatuses: string[]
      }
    }
  ).data
}

export async function fetchScholarships(params: PageParams = {}) {
  const { data } = await apiClient.get('/scholarships', { params: { limit: 50, ...params } })
  return asArray<{
    id: string
    scholarshipCode: string
    name: string
    amount: number
    status: string
    awardedAt: string
  }>(data)
}

export async function fetchScholarshipPrograms() {
  const { data } = await apiClient.get('/sss/scholarships/programs').catch(async () => {
    return { data: { data: [] } }
  })
  return asArray<{ id: string; code: string; name: string; sourceType: string }>(data)
}

export async function createScholarshipProgram(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/scholarships/programs', body)
  return asData(data)
}

export async function applyScholarship(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/scholarships/applications', body)
  return asData(data)
}

export async function decideScholarshipApplication(
  id: string,
  body: { approve: boolean; awardAmount?: number; enrollmentId?: string }
) {
  const { data } = await apiClient.post(`/sss/scholarships/applications/${id}/decide`, body)
  return asData(data)
}

export async function fetchScholarshipApplications(params?: {
  studentId?: string
  status?: string
}) {
  const { data } = await apiClient.get('/sss/scholarships/applications', { params })
  return asArray<{
    id: string
    studentId: string
    studentNumber: string | null
    studentName: string | null
    programCode: string
    programName: string
    status: string
    sourceType: string
  }>(data)
}

export async function fetchScholarshipAwards(studentId?: string) {
  const { data } = await apiClient.get('/sss/scholarships/awards', {
    params: studentId ? { studentId } : undefined,
  })
  return asArray<{
    id: string
    studentId: string
    scholarshipCode: string
    name: string
    amount: number
    status: string
  }>(data)
}

export async function fetchScholarshipAssistanceReport() {
  const { data } = await apiClient.get('/sss/scholarships/reports/assistance')
  return asData<{
    scholarsAndGrantees: Array<{
      awardId: string
      scholarshipCode: string
      name: string
      amount: number
    }>
    applicationsByStatus: Record<string, number>
    fundUtilizationTotal: number
    activeAwardCount: number
    saByStatus: Record<string, number>
    saDeployments: Array<{
      applicationId: string
      studentNumber: string | null
      deploymentOffice: string | null
    }>
    note?: string
  }>(data)
}

export type SaApplication = {
  id: string
  studentId: string
  studentNumber: string | null
  studentName: string | null
  workflowStatus: string
  requirementsComplete: boolean
  deploymentOffice: string | null
  interviewAt: string | null
  requirements: {
    documents: Array<{ key: string; label: string; submitted: boolean }>
    interviewScore: number | null
  }
}

export async function fetchSaApplications() {
  const { data } = await apiClient.get('/sss/scholarships/sa-applications')
  return asArray<SaApplication>(data)
}

export async function submitSaApplication(body: {
  studentId: string
  requirementsJson?: Record<string, unknown>
}) {
  const { data } = await apiClient.post('/sss/scholarships/sa-applications', body)
  return asData<{ id: string }>(data)
}

export async function updateSaRequirements(
  id: string,
  documents: Array<{ key: string; submitted: boolean; label?: string }>
) {
  const { data } = await apiClient.patch(`/sss/scholarships/sa-applications/${id}/requirements`, {
    documents,
  })
  return asData<SaApplication>(data)
}

export async function scheduleSaInterview(id: string, interviewAt: string) {
  const { data } = await apiClient.post(`/sss/scholarships/sa-applications/${id}/interview`, {
    interviewAt,
  })
  return asData<SaApplication>(data)
}

export async function advanceSaApplication(
  id: string,
  body: {
    workflowStatus: 'cjpc' | 'screening_committee' | 'vpsas' | 'president' | 'deployed' | 'rejected'
    deploymentOffice?: string
    interviewScore?: number
  }
) {
  const { data } = await apiClient.post(`/sss/scholarships/sa-applications/${id}/advance`, body)
  return asData<SaApplication>(data)
}

export async function createCounselingRequest(body: {
  studentId: string
  channel: 'online' | 'walk_in'
}) {
  const { data } = await apiClient.post('/sss/guidance/counseling-requests', body)
  return asData<{ id: string; serviceRequestId: string }>(data)
}

export type CounselingRequest = {
  id: string
  studentId: string
  serviceRequestId: string | null
  channel: string
  status: string
  assignedCounselorId: string | null
  requestedAt: string | null
  intakeAt: string | null
  resolvedAt: string | null
  allowedNextStatuses: string[]
  sessionCount: number
  noteCount: number
  openReferralCount: number
  sessions?: Array<{
    id: string
    sessionAt: string | null
    sessionType: string
    isFollowUp: boolean
    status: string
    counselorId: string | null
  }>
  referrals?: Array<{
    id: string
    toOffice: string
    specialistType: string | null
    status: string
    reasonSummary: string | null
    createdAt: string | null
  }>
  note?: string
}

export async function fetchCounselingRequests(params?: {
  studentId?: string
  status?: string
  openOnly?: boolean
}) {
  const { data } = await apiClient.get('/sss/guidance/counseling-requests', { params })
  return asData<CounselingRequest[]>(data)
}

export async function documentCounselingIntake(id: string, intakeSummary: string) {
  const { data } = await apiClient.post(`/sss/guidance/counseling-requests/${id}/intake`, {
    intakeSummary,
  })
  return asData<CounselingRequest>(data)
}

export async function assignCounselingRequest(id: string, counselorId?: string) {
  const { data } = await apiClient.post(`/sss/guidance/counseling-requests/${id}/assign`, {
    counselorId,
  })
  return asData<CounselingRequest>(data)
}

export async function recordCounselingSession(
  id: string,
  body?: { sessionType?: string; isFollowUp?: boolean; noteBody?: string }
) {
  const { data } = await apiClient.post(
    `/sss/guidance/counseling-requests/${id}/sessions`,
    body ?? {}
  )
  return asData<CounselingRequest>(data)
}

export async function specialistCounselingReferral(
  id: string,
  body: {
    toOffice: 'guidance' | 'health' | 'osa' | 'scholarship'
    specialistType: 'psychologist' | 'medical_doctor' | 'psychiatrist' | 'social_worker'
    reasonSummary?: string
  }
) {
  const { data } = await apiClient.post(
    `/sss/guidance/counseling-requests/${id}/specialist-referral`,
    body
  )
  return asData<{ referralId: string; request?: CounselingRequest }>(data)
}

export async function resolveCounselingRequest(id: string, resolutionSummary?: string) {
  const { data } = await apiClient.post(`/sss/guidance/counseling-requests/${id}/resolve`, {
    resolutionSummary,
  })
  return asData<CounselingRequest>(data)
}

export async function fetchCounselingCaseReport() {
  const { data } = await apiClient.get('/sss/guidance/counseling/reports/cases')
  return asData<{
    openCount: number
    followUpCount: number
    referredCount: number
    totalCases: number
    sessionTotal: number
    byStatus: Array<{ status: string; total: number }>
    note?: string
  }>(data)
}

export async function fetchPsychBatteries() {
  const { data } = await apiClient.get('/sss/guidance/psych/batteries')
  return asData<{
    batteries: Array<{ code: string; label: string; scoringMode: string }>
    note?: string
  }>(data)
}

export async function fetchPsychSchedules(collegeCode?: string) {
  const { data } = await apiClient.get('/sss/guidance/psych/schedules', {
    params: collegeCode ? { collegeCode } : undefined,
  })
  return asArray<{
    id: string
    title: string
    collegeCode: string | null
    scheduledAt: string
    venue: string | null
    status: string
  }>(data)
}

export async function createPsychSchedule(body: {
  title: string
  collegeCode?: string
  scheduledAt: string
  venue?: string
}) {
  const { data } = await apiClient.post('/sss/guidance/psych/schedules', body)
  return asData<{ id: string }>(data)
}

export async function updatePsychScheduleStatus(id: string, status: string) {
  const { data } = await apiClient.patch(`/sss/guidance/psych/schedules/${id}`, { status })
  return asData<{ id: string; status: string }>(data)
}

export async function fetchPsychResults(params?: { studentId?: string; scheduleId?: string }) {
  const { data } = await apiClient.get('/sss/guidance/psych/results', { params })
  return asArray<{
    id: string
    scheduleId: string | null
    studentId: string
    studentNumber: string | null
    studentName: string | null
    testCode: string
    released: boolean
    encodedAt: string | null
  }>(data)
}

export async function encodePsychResult(body: {
  studentId: string
  testCode: 'ENTRANCE_PSYCH' | 'SHIFTING_PSYCH' | 'COUNSELING_INTAKE'
  scheduleId?: string
}) {
  const { data } = await apiClient.post('/sss/guidance/psych/results', body)
  return asData<{ id: string }>(data)
}

export async function fetchPsychResultReport(id: string) {
  const { data } = await apiClient.get(`/sss/guidance/psych/results/${id}/report`)
  return asData<{
    resultId: string
    testCode: string
    batteryLabel: string
    student: { studentNumber: string | null; name: string | null }
    released: boolean
    consultationRequiredBeforeRelease: boolean
    note?: string
  }>(data)
}

export async function releasePsychResult(id: string, consultationCompleted: boolean) {
  const { data } = await apiClient.post(`/sss/guidance/psych/results/${id}/release`, {
    consultationCompleted,
  })
  return asData<{ id: string; released: boolean }>(data)
}

export type ShiftingExamApplication = {
  id: string
  studentId: string
  studentNumber: string | null
  studentName: string | null
  fromProgramCode: string | null
  toProgramCode: string | null
  status: string
  requirementsComplete: boolean
  requirements: {
    documents: Array<{ key: string; label: string; submitted: boolean }>
    endorsements: Record<string, string>
    counselingLinked: boolean
    resultSummary: string | null
  }
  examScheduledAt: string | null
  paymentTag: string | null
  resultReleased: boolean
  endorsementStatus: string | null
}

export async function fetchShiftingExams(studentId?: string) {
  const { data } = await apiClient.get('/sss/guidance/shifting-exams', {
    params: studentId ? { studentId } : undefined,
  })
  return asArray<ShiftingExamApplication>(data)
}

export async function applyShiftingExam(body: {
  studentId: string
  fromProgramCode?: string
  toProgramCode?: string
}) {
  const { data } = await apiClient.post('/sss/guidance/shifting-exams', body)
  return asData<{ id: string }>(data)
}

export async function updateShiftingRequirements(
  id: string,
  documents: Array<{ key: string; submitted: boolean; label?: string }>
) {
  const { data } = await apiClient.patch(`/sss/guidance/shifting-exams/${id}/requirements`, {
    documents,
  })
  return asData<ShiftingExamApplication>(data)
}

export async function scheduleShiftingExam(id: string, examScheduledAt: string) {
  const { data } = await apiClient.post(`/sss/guidance/shifting-exams/${id}/schedule`, {
    examScheduledAt,
  })
  return asData<ShiftingExamApplication>(data)
}

export async function tagShiftingPayment(id: string, paymentTag: string) {
  const { data } = await apiClient.post(`/sss/guidance/shifting-exams/${id}/payment-tag`, {
    paymentTag,
  })
  return asData<ShiftingExamApplication>(data)
}

export async function markShiftingResultReady(id: string, resultSummary?: string) {
  const { data } = await apiClient.post(`/sss/guidance/shifting-exams/${id}/result-ready`, {
    resultSummary,
  })
  return asData<ShiftingExamApplication>(data)
}

export async function releaseShiftingResult(id: string, consultationCompleted: boolean) {
  const { data } = await apiClient.post(`/sss/guidance/shifting-exams/${id}/release`, {
    consultationCompleted,
  })
  return asData<ShiftingExamApplication>(data)
}

export async function endorseShiftingExam(
  id: string,
  body: {
    party: 'originating_college' | 'receiving_college' | 'admission'
    decision: 'endorsed' | 'rejected'
  }
) {
  const { data } = await apiClient.post(`/sss/guidance/shifting-exams/${id}/endorse`, body)
  return asData<ShiftingExamApplication>(data)
}

export async function createHealthClearance(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/health/clearances', body)
  return asData(data)
}

export type StudentEhrProfile = {
  student: { id: string; studentNumber: string; name: string }
  healthRecordId: string
  clearance: { status: string; clearanceType: string; decidedAt: string | null } | null
  chronicConditions: Array<{
    id: string
    conditionCode: string
    label: string
    isChronic: boolean
    status: string
  }>
  medicalAlerts: Array<{ id: string; alertCode: string; severity: string; status: string }>
  encounters: Array<{
    id: string
    encounterType: string
    isEmergency: boolean
    status: string
    encounteredAt: string
  }>
  prescriptions: Array<{
    id: string
    medicationLabel: string
    instructions: string | null
    encounterId: string
  }>
  referrals: Array<{ id: string; toFacility: string | null; isHospital: boolean; status: string }>
  emergencyCount: number
  note?: string
}

export async function fetchStudentEhr(studentId: string) {
  const { data } = await apiClient.get(`/sss/health/students/${studentId}/ehr`)
  return asData<StudentEhrProfile>(data)
}

export async function recordHealthEncounter(body: {
  studentId: string
  encounterType?: string
  isEmergency?: boolean
  clinicalNote?: string
  diagnosisLabel?: string
  medicationLabel?: string
  medicationInstructions?: string
  hospitalReferralFacility?: string
}) {
  const { data } = await apiClient.post('/sss/health/encounters', body)
  return asData<{
    healthRecordId: string
    encounterId: string
    prescriptionId: string | null
    hospitalReferralId: string | null
  }>(data)
}

export async function addHealthCondition(body: {
  studentId: string
  conditionCode: string
  label: string
  isChronic?: boolean
}) {
  const { data } = await apiClient.post('/sss/health/conditions', body)
  return asData<{ id: string }>(data)
}

export async function addMedicalAlert(body: {
  studentId: string
  alertCode: string
  severity?: 'info' | 'warning' | 'critical'
}) {
  const { data } = await apiClient.post('/sss/health/alerts', body)
  return asData<{ id: string }>(data)
}

export async function fetchHealthProgramCatalog() {
  const { data } = await apiClient.get('/sss/health/programs/catalog')
  return asData<{
    programs: Array<{ code: string; label: string; mandatoryDefault: boolean }>
    assessmentContexts: string[]
    enrollmentGateMode: string
    note?: string
  }>(data)
}

export async function recordHealthProgramParticipation(body: {
  studentId: string
  programCode: 'DRUG_TESTING' | 'HIV_SCREENING' | 'DENTAL_EXAM' | 'MEDICAL_EXAM'
  status?: 'scheduled' | 'completed' | 'missed' | 'excused'
}) {
  const { data } = await apiClient.post('/sss/health/programs', body)
  return asData<{ id: string }>(data)
}

export async function recordMedicalAssessment(body: {
  studentId: string
  assessmentContext: 'freshman' | 'transferee' | 'returning' | 'other'
  status: 'pending' | 'cleared' | 'denied'
  requireProgramsComplete?: boolean
}) {
  const { data } = await apiClient.post('/sss/health/medical-assessments', body)
  return asData<{ id: string }>(data)
}

export async function fetchEnrollmentHealthGate(studentId: string) {
  const { data } = await apiClient.get(`/sss/health/students/${studentId}/enrollment-gate`)
  return asData<{
    enrollmentGateMode: string
    programsComplete: boolean
    clearanceCleared: boolean
    advisoryCleared: boolean
    missingPrograms: string[]
    programs: Array<{ programCode: string; label: string; status: string; complete: boolean }>
    clearance: { status: string; assessmentContext: string | null } | null
    note?: string
  }>(data)
}

export async function fetchHealthProgramStatistics() {
  const { data } = await apiClient.get('/sss/health/statistics')
  return asData<{
    programsByCode: Array<{ programCode: string; label: string; total: number }>
    programsByStatus: Array<{ status: string; total: number }>
    clearancesByStatus: Array<{ status: string; total: number }>
    assessmentsByContext: Array<{ assessmentContext: string; total: number }>
  }>(data)
}

export async function fileDisciplineComplaint(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/osa/discipline/complaints', body)
  return asData<{ complaintId: string; caseId: string }>(data)
}

export type DisciplineCase = {
  id: string
  complaintId: string
  studentId: string
  workflowStatus: string
  sdtEngaged: boolean
  assignedTo: string | null
  openedAt: string | null
  closedAt: string | null
  allowedNextStatuses: string[]
  complaint?: {
    id: string
    summary: string | null
    status: string
    complainantRole: string | null
    complainantUserId: string | null
    filedAt: string | null
  }
  sanctions?: Array<{
    id: string
    sanctionCode: string
    label: string
    effectiveFrom: string | null
    effectiveTo: string | null
    recordedBy: string | null
  }>
  note?: string
}

export async function fetchDisciplineCases(params?: {
  studentId?: string
  workflowStatus?: string
  openOnly?: boolean
}) {
  const { data } = await apiClient.get('/sss/osa/discipline/cases', { params })
  return asData<DisciplineCase[]>(data)
}

export async function advanceDisciplineCase(
  id: string,
  body: { workflowStatus: string; sdtEngaged?: boolean }
) {
  const { data } = await apiClient.post(`/sss/osa/discipline/cases/${id}/advance`, body)
  return asData<DisciplineCase>(data)
}

export async function recordDisciplineSanction(
  id: string,
  body: { sanctionCode: string; label?: string }
) {
  const { data } = await apiClient.post(`/sss/osa/discipline/cases/${id}/sanctions`, body)
  return asData<DisciplineCase>(data)
}

export async function fetchDisciplinaryHistory(studentId: string) {
  const { data } = await apiClient.get(`/sss/osa/discipline/students/${studentId}/history`)
  return asData<{
    studentId: string
    cases: DisciplineCase[]
    sanctions: Array<{
      id: string
      caseId: string
      sanctionCode: string
      label: string
      effectiveFrom: string | null
      effectiveTo: string | null
    }>
    note?: string
  }>(data)
}

export async function fetchDisciplineCaseReport() {
  const { data } = await apiClient.get('/sss/osa/discipline/reports/cases')
  return asData<{
    openCount: number
    sdtEngagedCount: number
    totalCases: number
    byStatus: Array<{ workflowStatus: string; total: number }>
    bySanction: Array<{ sanctionCode: string; total: number }>
    note?: string
  }>(data)
}

export type OrgRequirementDoc = { key: string; label: string; submitted: boolean }

export type OrgApplication = {
  id: string
  proposedName: string
  applicationType: string
  workflowStatus: string
  studentOrgId: string | null
  submittedBy: string
  submittedAt: string | null
  decidedAt: string | null
  requirements: {
    documents: OrgRequirementDoc[]
    missingRequired: string[]
    requirementsComplete: boolean
    note?: string
  }
  allowedNextStatuses: string[]
}

export type StudentOrganization = {
  id: string
  code: string
  name: string
  status: string
  accredited_at?: string | null
  accreditation_certificate_ref?: string | null
}

export async function fetchOrgApplications() {
  const { data } = await apiClient.get('/sss/osa/org-applications')
  return asArray<OrgApplication>(data)
}

export async function fetchStudentOrganizations() {
  const { data } = await apiClient.get('/sss/osa/organizations')
  return asArray<StudentOrganization>(data)
}

export async function submitOrgApplication(body: {
  proposedName: string
  applicationType: 'new' | 'renewal'
  requirementsJson?: { documents: OrgRequirementDoc[] }
}) {
  const { data } = await apiClient.post('/sss/osa/org-applications', body)
  return asData<OrgApplication>(data)
}

export async function advanceOrgApplication(
  id: string,
  body: { workflowStatus: string; issueCertificateRef?: string }
) {
  const { data } = await apiClient.post(`/sss/osa/org-applications/${id}/advance`, body)
  return asData<OrgApplication>(data)
}

export async function downloadOrgCertificate(studentOrgId: string) {
  const { data } = await apiClient.get(`/sss/osa/organizations/${studentOrgId}/certificate`, {
    responseType: 'blob',
  })
  return data as Blob
}

export type StudentIdRequest = {
  id: string
  studentId: string
  requestType: string
  status: string
  rfidRef: string | null
  paymentValidationRef: string | null
  printUnitStatus: string | null
  submittedAt: string | null
  digitalDocumentToken: string | null
  digitalSnapshotChecksum: string | null
  digitalIssuedAt: string | null
  digitalVerifyUrl: string | null
  allowedNextStatuses: string[]
  osaSnapshot?: {
    openDisciplineCount: number
    organizationCount: number
    note?: string
  }
}

export async function fetchStudentIdRequests(params: { studentId?: string } = {}) {
  const { data } = await apiClient.get('/sss/osa/id-requests', { params })
  return asArray<StudentIdRequest>(data)
}

export async function submitStudentIdRequest(body: {
  requestType: 'new' | 'replacement'
  studentId?: string
}) {
  const { data } = await apiClient.post('/sss/osa/id-requests', body)
  return asData<StudentIdRequest>(data)
}

export async function updateStudentIdRequest(
  id: string,
  body: {
    status?: string
    rfidRef?: string
    paymentValidationRef?: string
    printUnitStatus?: string
  }
) {
  const { data } = await apiClient.patch(`/sss/osa/id-requests/${id}`, body)
  return asData<StudentIdRequest>(data)
}

export async function downloadDigitalStudentIdPdf(requestId: string) {
  const { data } = await apiClient.get(`/sss/osa/id-requests/${requestId}/digital-pdf`, {
    responseType: 'blob',
  })
  return data as Blob
}

export async function fetchDigitalStudentIdVerify(token: string) {
  try {
    const { data } = await apiClient.get(
      `/sss/osa/id-requests/digital/verify/${encodeURIComponent(token)}`
    )
    return (
      data as {
        data: {
          valid: boolean
          checksumMatches?: boolean
          studentNumber?: string
          studentName?: string
          issuedAt?: string | null
          status?: string
          requestType?: string
          provisional?: boolean
          note?: string
          verifyUrl?: string
        }
      }
    ).data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { valid: false as const }
    }
    throw err
  }
}

export async function fetchStudentParticipation(studentId: string) {
  const { data } = await apiClient.get(`/sss/osa/students/${studentId}/participation`)
  return asData<{
    studentId: string
    organizations: Array<{
      orgCode: string
      orgName: string
      roleTitle: string | null
      status: string
    }>
    openDisciplineCases: Array<{ id: string; workflowStatus: string }>
    note?: string
  }>(data)
}

export type QueueTicket = {
  id: string
  office: string
  serviceCode: string
  ticketNo: string
  studentId: string | null
  studentNumber: string | null
  studentName: string | null
  status: string
  calledBy: string | null
  issuedAt: string | null
  calledAt: string | null
  completedAt: string | null
  waitSeconds: number | null
  serviceSeconds: number | null
  allowedNextStatuses: string[]
  note?: string
}

export async function issueQueueTicket(body: {
  office: string
  serviceCode: string
  studentId?: string
}) {
  const { data } = await apiClient.post('/sss/queue/tickets', body)
  return asData<QueueTicket>(data)
}

export async function fetchQueueTickets(params?: {
  office?: string
  status?: string
  studentId?: string
  todayOnly?: boolean
}) {
  const { data } = await apiClient.get('/sss/queue/tickets', { params })
  return asData<QueueTicket[]>(data)
}

export async function fetchQueueDisplay(office: string) {
  const { data } = await apiClient.get('/sss/queue/display', { params: { office } })
  return asData<{
    office: string
    asOf: string
    waitingCount: number
    calledCount: number
    completedToday: number
    nowServing: QueueTicket[]
    nextWaiting: QueueTicket[]
    note?: string
  }>(data)
}

export async function advanceQueueTicket(id: string, status: string) {
  const { data } = await apiClient.post(`/sss/queue/tickets/${id}/advance`, { status })
  return asData<QueueTicket>(data)
}

export async function fetchQueueAnalytics(office?: string) {
  const { data } = await apiClient.get('/sss/queue/reports/analytics', {
    params: office ? { office } : undefined,
  })
  return asData<{
    totalTickets: number
    byOffice: Array<{ office: string; total: number }>
    byStatus: Array<{ status: string; total: number }>
    avgWaitSeconds: number | null
    avgServiceSeconds: number | null
    note?: string
  }>(data)
}

export async function downloadQueueTicketSlip(id: string) {
  const { data } = await apiClient.get(`/sss/queue/tickets/${id}/slip.pdf`, {
    responseType: 'blob',
  })
  return data as Blob
}

export async function fetchClearanceHints(studentId: string) {
  const { data } = await apiClient.get(`/sss/students/${studentId}/clearance-hints`)
  return asData<Record<string, unknown>>(data)
}

export async function fetchCrossOfficeClearance(studentId: string) {
  const { data } = await apiClient.get(`/sss/students/${studentId}/cross-office-clearance`)
  return asData<{
    studentId: string
    enrollmentGateMode: string
    overallAdvisoryCleared: boolean
    holdOffices: string[]
    offices: Record<string, Record<string, unknown>>
    openReferrals: { guidance: number; health: number }
    note?: string
  }>(data)
}

export async function fetchUnifiedStudentSupportProfile(studentId: string) {
  const { data } = await apiClient.get(`/sss/students/${studentId}/unified-profile`)
  return asData<{
    student: { id: string; studentNumber: string; name: string; status: string }
    clearance: {
      overallAdvisoryCleared: boolean
      holdOffices: string[]
      enrollmentGateMode: string
      offices: Record<string, Record<string, unknown>>
    }
    referrals: {
      guidance: Array<{
        id: string
        fromOffice: string
        toOffice: string
        status: string
        reasonSummary?: string
      }>
      health: Array<{ id: string; toOffice: string | null; status: string }>
    }
    alerts: Array<{
      id: string
      templateCode: string
      subject: string | null
      status: string
      createdAt: string
    }>
    organizations: Array<{ orgCode: string; orgName: string }>
    openDisciplineCases: Array<{ id: string; workflowStatus: string }>
    note?: string
  }>(data)
}

export async function createOfficeReferral(body: {
  studentId: string
  fromOffice: 'guidance' | 'health'
  toOffice: 'guidance' | 'health' | 'osa' | 'scholarship'
  reasonSummary?: string
}) {
  const { data } = await apiClient.post('/sss/referrals', body)
  return asData<{ id: string; channel: string }>(data)
}

export type OfficeReportRequest = {
  id: string
  studentId: string
  studentNumber: string | null
  studentName: string | null
  requestType: string
  channel: string
  status: string
  submittedAt: string | null
}

export type OfficeQueueTicket = {
  id: string
  ticketNo: string
  serviceCode: string
  studentId: string | null
  studentNumber: string | null
  studentName: string | null
  createdAt: string | null
}

export type OfficeReport = {
  office: string
  openServiceRequests: number
  queueWaiting: number
  recentRequests?: OfficeReportRequest[]
  waitingTickets?: OfficeQueueTicket[]
}

export async function fetchOfficeReport(office: string) {
  const { data } = await apiClient.get(`/sss/offices/${office}/report`)
  return asData<OfficeReport>(data)
}

export async function fetchSubjects(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/subjects', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    subjectCode: string
    title: string
    units: number
    lectureHours?: number | null
    laboratoryHours?: number | null
  }>(data)
}

export async function createSubject(payload: {
  subjectCode: string
  title: string
  units?: number
  lectureHours?: number
  laboratoryHours?: number
  programId?: string
}) {
  const { data } = await apiClient.post('/academic/subjects', payload)
  return asData(data) as {
    id: string
    subjectCode: string
    title: string
    units: number
    lectureHours: number | null
    laboratoryHours: number | null
  }
}

export async function updateSubjectCatalog(
  id: string,
  payload: Partial<{
    subjectCode: string
    title: string
    units: number
    lectureHours: number | null
    laboratoryHours: number | null
    isActive: boolean
  }>
) {
  const { data } = await apiClient.patch(`/academic/subjects/${id}`, payload)
  return asData(data)
}

export async function deleteSubject(id: string) {
  const { data } = await apiClient.delete(`/academic/subjects/${id}`)
  return asData<{ id: string; deleted: boolean }>(data)
}

export async function fetchSubjectPrerequisites(subjectId: string) {
  const { data } = await apiClient.get(`/academic/subjects/${subjectId}/prerequisites`)
  return (
    data as {
      data: Array<{
        id: string
        requiresSubjectId: string
        subjectCode: string | null
        title: string | null
      }>
    }
  ).data
}

export async function addSubjectPrerequisite(subjectId: string, requiresSubjectId: string) {
  const { data } = await apiClient.post(`/academic/subjects/${subjectId}/prerequisites`, {
    requiresSubjectId,
  })
  return asData(data)
}

export async function removeSubjectPrerequisite(subjectId: string, linkId: string) {
  await apiClient.delete(`/academic/subjects/${subjectId}/prerequisites/${linkId}`)
}

export type UsisCurriculum = {
  id: string
  programId: string
  programCode: string | null
  programName: string | null
  code: string
  name: string
  isActive: boolean
  versions: Array<{
    id: string
    curriculumId: string
    versionLabel: string
    status: string
    effectiveFrom: string | null
    notes: string | null
    duplicatedFromVersionId: string | null
    createdAt: string | null
  }>
}

export async function fetchCurricula(programId?: string) {
  const { data } = await apiClient.get('/academic/curricula', {
    params: programId ? { programId } : undefined,
  })
  return (data as { data: UsisCurriculum[] }).data
}

export async function createCurriculum(payload: {
  programId: string
  code: string
  name: string
  versionLabel?: string
}) {
  const { data } = await apiClient.post('/academic/curricula', payload)
  return asData(data)
}

export async function updateCurriculum(
  id: string,
  payload: { code?: string; name?: string; programId?: string; isActive?: boolean }
) {
  const { data } = await apiClient.patch(`/academic/curricula/${id}`, payload)
  return asData<{ id: string; code: string; name: string }>(data)
}

export async function deleteCurriculum(id: string) {
  const { data } = await apiClient.delete(`/academic/curricula/${id}`)
  return asData<{ id: string; deleted: boolean }>(data)
}

export async function duplicateCurriculumVersion(
  versionId: string,
  payload: { versionLabel: string; notes?: string }
) {
  const { data } = await apiClient.post(
    `/academic/curriculum-versions/${versionId}/duplicate`,
    payload
  )
  return asData(data) as UsisCurriculum['versions'][number]
}

export async function activateCurriculumVersion(versionId: string) {
  const { data } = await apiClient.patch(`/academic/curriculum-versions/${versionId}/status`, {
    status: 'active',
  })
  return asData(data)
}

export async function fetchCurriculumVersionSubjects(versionId: string) {
  const { data } = await apiClient.get(`/academic/curriculum-versions/${versionId}/subjects`)
  return (
    data as {
      data: Array<{
        id: string
        subjectId: string
        subjectCode: string | null
        title: string | null
        units: number | null
        lectureHours: number | null
        laboratoryHours: number | null
        yearLevel: number
        semester: number
        isRequired: boolean
      }>
    }
  ).data
}

export async function addCurriculumVersionSubject(
  versionId: string,
  payload: { subjectId: string; yearLevel?: number; semester?: number; isRequired?: boolean }
) {
  const { data } = await apiClient.post(
    `/academic/curriculum-versions/${versionId}/subjects`,
    payload
  )
  return asData(data)
}

export async function removeCurriculumVersionSubject(versionId: string, lineId: string) {
  await apiClient.delete(`/academic/curriculum-versions/${versionId}/subjects/${lineId}`)
}

export async function fetchPrograms(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/programs', { params: { limit: 20, ...params } })
  return asPaginated<{ id: string; code: string; name: string }>(data)
}

export async function fetchAcademicYears(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/years', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    code: string
    name: string
    isActive: boolean
    startDate?: string | null
    endDate?: string | null
  }>(data)
}

export async function updateAcademicYear(
  id: string,
  payload: {
    code?: string
    name?: string
    startDate?: string
    endDate?: string
    isActive?: boolean
  }
) {
  const { data } = await apiClient.patch(`/academic/years/${id}`, payload)
  return asData<{ id: string; code: string; name: string; isActive: boolean }>(data)
}

export async function deleteAcademicYear(id: string) {
  const { data } = await apiClient.delete(`/academic/years/${id}`)
  return asData<{ id: string; deleted: boolean }>(data)
}

export async function updateProgram(
  id: string,
  payload: { code?: string; name?: string; isActive?: boolean }
) {
  const { data } = await apiClient.patch(`/academic/programs/${id}`, payload)
  return asData<{ id: string; code: string; name: string }>(data)
}

export async function deleteProgram(id: string) {
  const { data } = await apiClient.delete(`/academic/programs/${id}`)
  return asData<{ id: string; deleted: boolean }>(data)
}

export async function fetchSections(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/sections', { params: { limit: 20, ...params } })
  return asPaginated<{
    id: string
    code: string
    name: string
    yearLevel: number
    semester: number
    isBlockSection?: boolean
    blockGroupCode?: string | null
  }>(data)
}

export async function patchSection(
  sectionId: string,
  payload: {
    capacity?: number
    waitlistEnabled?: boolean
    isBlockSection?: boolean
    blockGroupCode?: string | null
    subjectId?: string | null
    code?: string
    name?: string
    yearLevel?: number
    semester?: number
  }
) {
  const { data } = await apiClient.patch(`/academic/sections/${sectionId}`, payload)
  return (data as { data: { id: string; blockGroupCode: string | null; isBlockSection: boolean } })
    .data
}

export async function deleteSection(sectionId: string) {
  const { data } = await apiClient.delete(`/academic/sections/${sectionId}`)
  return asData<{ id: string; deleted: boolean }>(data)
}

export async function resolveStudentForUser(email: string | null | undefined) {
  if (!email) return null
  try {
    const { data } = await apiClient.get('/students/me', { skipHttpErrorToast: true })
    const root = data as { data?: Record<string, unknown> }
    const row = root?.data
    if (!row?.id) return null
    return row as {
      id: string
      studentNumber: string
      firstName: string
      lastName: string
      email: string
      status: string
      yearLevel?: number | null
      classification?: string | null
      programId?: string | null
    }
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 403)) {
      return null
    }
    throw err
  }
}

export type UsisAnnouncement = {
  id: string
  title: string
  body: string
  status: string
  isPinned: boolean
  publishAt: string | null
  expiresAt: string | null
  audience: Record<string, unknown>
  deliverPortal: boolean
  deliverEmail: boolean
  deliverSms: boolean
  likeCount?: number
  commentCount?: number
  likedByMe?: boolean
  comments?: Array<{ id: string; body: string | null; userId: string; createdAt: string | null }>
}

export async function fetchAnnouncementFeed() {
  const { data } = await apiClient.get('/announcements/feed')
  const root = data as {
    data?: { items?: UsisAnnouncement[]; settings?: { socialFeaturesEnabled: boolean } }
  }
  return {
    items: root?.data?.items ?? [],
    settings: root?.data?.settings ?? { socialFeaturesEnabled: false },
  }
}

export async function fetchAnnouncements(params: PageParams = {}) {
  const { data } = await apiClient.get('/announcements', { params })
  return asPaginated<UsisAnnouncement>(data)
}

export async function fetchAnnouncementSettings() {
  const { data } = await apiClient.get('/announcements/settings')
  return asData<{ organizationId: string; socialFeaturesEnabled: boolean }>(data)
}

export async function updateAnnouncementSettings(payload: { socialFeaturesEnabled: boolean }) {
  const { data } = await apiClient.patch('/announcements/settings', payload)
  return asData<{ organizationId: string; socialFeaturesEnabled: boolean }>(data)
}

export async function createAnnouncement(payload: {
  title: string
  body: string
  publishNow?: boolean
  isPinned?: boolean
  audience?: { roles?: string[] }
  deliverEmail?: boolean
  deliverSms?: boolean
  deliverPortal?: boolean
  publishAt?: string
  expiresAt?: string
}) {
  const { data } = await apiClient.post('/announcements', payload)
  return (data as { data: UsisAnnouncement }).data
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<{
    title: string
    body: string
    isPinned: boolean
    status: 'draft' | 'scheduled' | 'published' | 'archived'
    publishAt: string | null
    expiresAt: string | null
    deliverPortal: boolean
    deliverEmail: boolean
    deliverSms: boolean
    audience: { roles?: string[] }
  }>
) {
  const { data } = await apiClient.patch(`/announcements/${id}`, payload)
  return (data as { data: UsisAnnouncement }).data
}

export async function publishAnnouncement(id: string) {
  const { data } = await apiClient.post(`/announcements/${id}/publish`)
  return (data as { data: UsisAnnouncement }).data
}

export async function archiveAnnouncement(id: string) {
  const { data } = await apiClient.post(`/announcements/${id}/archive`)
  return (data as { data: UsisAnnouncement }).data
}

export async function dispatchAnnouncement(
  id: string,
  channels: ('sms' | 'email')[],
  opts?: {
    audience?: MassSmsFilters
    recipientKinds?: Array<'student' | 'parent' | 'guardian' | 'sponsor'>
  }
) {
  const { data } = await apiClient.post(`/announcements/${id}/dispatch`, {
    channels,
    audience: opts?.audience,
    recipientKinds: opts?.recipientKinds,
  })
  return (data as { data: unknown }).data
}

export type MassSmsFilters = {
  yearLevels?: number[]
  educationalLevels?: string[]
  departmentCodes?: string[]
  programIds?: string[]
  sectionCodes?: string[]
}

export type MassSmsPreview = {
  matchedStudents: number
  studentMobiles: number
  contactMobiles: number
  recipientCount: number
  recipientKinds: string[]
  filters: MassSmsFilters
}

export async function previewMassSms(payload: {
  filters?: MassSmsFilters
  recipientKinds?: Array<'student' | 'parent' | 'guardian' | 'sponsor'>
}) {
  const { data } = await apiClient.post('/mass-sms/preview', payload)
  return (data as { data: MassSmsPreview }).data
}

export async function queueMassSms(payload: {
  title: string
  message: string
  filters?: MassSmsFilters
  recipientKinds?: Array<'student' | 'parent' | 'guardian' | 'sponsor'>
}) {
  const { data } = await apiClient.post('/mass-sms/campaigns', payload)
  return (
    data as {
      data: {
        campaign: { id: string; status: string; recipientCount: number }
        preview: MassSmsPreview
      }
    }
  ).data
}

export async function fetchMassSmsCampaigns(page = 1, limit = 20) {
  const { data } = await apiClient.get('/mass-sms/campaigns', { params: { page, limit } })
  const root = data as {
    data?: { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
  }
  const payload = root?.data
  if (Array.isArray(payload)) return payload
  return payload?.data ?? []
}

export type UsisSurvey = {
  id: string
  kind: string
  title: string
  description: string | null
  status: string
  questions: Array<{ id: string; prompt: string; questionType: string; options?: string[] }>
}

export async function fetchSurveys(page = 1, limit = 20) {
  const { data } = await apiClient.get('/surveys', { params: { page, limit } })
  const root = data as { data?: { data?: UsisSurvey[] } | UsisSurvey[] }
  const payload = root?.data
  if (Array.isArray(payload)) return payload
  return payload?.data ?? []
}

export async function createSurvey(payload: {
  kind?: 'survey' | 'poll'
  title: string
  description?: string
  questions: Array<{
    prompt: string
    questionType?: 'single' | 'multi' | 'text' | 'likert'
    options?: string[]
    required?: boolean
  }>
  audience?: { roles?: string[] }
  openNow?: boolean
  closesAt?: string | null
}) {
  const { data } = await apiClient.post('/surveys', payload)
  return (data as { data: UsisSurvey }).data
}

export async function publishSurvey(id: string) {
  const { data } = await apiClient.post(`/surveys/${id}/publish`)
  return (data as { data: UsisSurvey }).data
}

export async function closeSurvey(id: string) {
  const { data } = await apiClient.post(`/surveys/${id}/close`)
  return (data as { data: UsisSurvey }).data
}

export async function fetchSurveyResults(id: string) {
  const { data } = await apiClient.get(`/surveys/${id}/results`)
  return (
    data as { data: { totalResponses: number; questionStats: Array<Record<string, unknown>> } }
  ).data
}

export async function toggleAnnouncementLike(id: string) {
  const { data } = await apiClient.post(`/announcements/${id}/like`)
  return asData<{ liked: boolean; announcementId: string }>(data)
}

export async function commentOnAnnouncement(id: string, body: string) {
  const { data } = await apiClient.post(`/announcements/${id}/comments`, { body })
  return asData<{ id: string }>(data)
}

export type FacultyEvalQuestion = {
  id: string
  prompt: string
  questionType: string
  code: string | null
  sortOrder: number
}

export type FacultyEvalPendingItem = {
  targetId: string
  scheduleId: string
  scheduleTitle: string
  evalCode: string
  facultyName: string
  sectionLabel: string
  subjectCode: string | null
  questionIds: string[]
}

export async function fetchFacultyEvalCodes() {
  const { data } = await apiClient.get('/faculty-eval/codes')
  return (data as { data: Array<{ id: string; code: string; name: string }> }).data ?? []
}

export async function createFacultyEvalCode(payload: {
  code: string
  name: string
  description?: string
}) {
  const { data } = await apiClient.post('/faculty-eval/codes', payload)
  return (data as { data: { id: string } }).data
}

export async function fetchFacultyEvalQuestions() {
  const { data } = await apiClient.get('/faculty-eval/questions')
  return (data as { data: FacultyEvalQuestion[] }).data ?? []
}

export async function createFacultyEvalQuestion(payload: { prompt: string; code?: string }) {
  const { data } = await apiClient.post('/faculty-eval/questions', payload)
  return (data as { data: FacultyEvalQuestion }).data
}

export async function fetchFacultyEvalAssignmentOptions() {
  const { data } = await apiClient.get('/faculty-eval/assignment-options')
  return (
    (
      data as {
        data: Array<{
          facultyUserId: string
          facultyName: string
          sectionId: string
          sectionCode: string | null
          subjectCode?: string
          subjectTitle?: string
        }>
      }
    ).data ?? []
  )
}

export async function createFacultyEvalSchedule(payload: {
  evalCodeId: string
  title: string
  questionIds: string[]
  openNow?: boolean
  opensAt?: string | null
  closesAt?: string | null
  targets: Array<{
    facultyUserId: string
    sectionId: string | null
    subjectCode?: string
    subjectTitle?: string
  }>
}) {
  const { data } = await apiClient.post('/faculty-eval/schedules', payload)
  return (data as { data: { id: string } }).data
}

export type FacultyEvalScheduleRow = {
  id: string
  title: string
  status: 'draft' | 'open' | 'closed' | string
  opensAt: string | null
  closesAt: string | null
  evalCode?: { code?: string; name?: string } | null
  targets?: Array<{ id: string; facultyUserId: string; sectionId: string | null }>
}

export async function fetchFacultyEvalSchedules(page = 1, limit = 20) {
  const { data } = await apiClient.get('/faculty-eval/schedules', { params: { page, limit } })
  const root = data as {
    data?: FacultyEvalScheduleRow[] | { data?: FacultyEvalScheduleRow[]; meta?: unknown }
  }
  const payload = root?.data
  if (Array.isArray(payload)) return payload
  return payload?.data ?? []
}

export async function closeFacultyEvalSchedule(scheduleId: string, closesAt?: string | null) {
  const { data } = await apiClient.post(`/faculty-eval/schedules/${scheduleId}/close`, {
    closesAt: closesAt ?? undefined,
  })
  return (data as { data: FacultyEvalScheduleRow }).data
}

export async function openFacultyEvalSchedule(scheduleId: string) {
  const { data } = await apiClient.post(`/faculty-eval/schedules/${scheduleId}/open`)
  return (data as { data: FacultyEvalScheduleRow }).data
}

export async function patchFacultyEvalScheduleWindow(
  scheduleId: string,
  payload: {
    opensAt?: string | null
    closesAt?: string | null
    status?: 'draft' | 'open' | 'closed'
  }
) {
  const { data } = await apiClient.patch(`/faculty-eval/schedules/${scheduleId}/window`, payload)
  return (data as { data: FacultyEvalScheduleRow }).data
}

export async function fetchFacultyEvalPending() {
  const { data } = await apiClient.get('/faculty-eval/pending')
  const root = data as {
    data?: {
      items?: FacultyEvalPendingItem[]
      questions?: FacultyEvalQuestion[]
      studentLinked?: boolean
    }
  }
  return {
    items: root?.data?.items ?? [],
    questions: root?.data?.questions ?? [],
    studentLinked: root?.data?.studentLinked ?? false,
  }
}

export async function submitFacultyEvalResponse(payload: {
  targetId: string
  answers: Record<string, number | string>
}) {
  const { data } = await apiClient.post('/faculty-eval/responses', payload)
  return (data as { data: unknown }).data
}

export type FacultyEvalReport = {
  totalResponses: number
  anonymity?: string
  schedule: {
    id?: string
    title: string
    status?: string
    evalCode?: string | null
    opensAt?: string | null
    closesAt?: string | null
  }
  questions?: Array<{ id: string; prompt: string; questionType: string }>
  targets?: Array<{
    targetId: string
    facultyName: string
    sectionLabel: string | null
    subjectCode: string | null
    responseCount: number
    questionStats: Record<string, { sum: number; count: number; average: number }>
  }>
}

export async function fetchFacultyEvalReport(scheduleId: string) {
  const { data } = await apiClient.get(`/faculty-eval/reports/${scheduleId}`)
  return (data as { data: FacultyEvalReport }).data
}

export async function exportFacultyEvalReport(scheduleId: string, format: 'csv' | 'xlsx' | 'pdf') {
  const { data } = await apiClient.get(`/faculty-eval/reports/${scheduleId}/export`, {
    params: { format },
    responseType: 'blob',
  })
  return data as Blob
}

export type StudentTaskCalendarItem = {
  id: string
  kind: 'faculty_evaluation' | 'grade_posted' | 'grade_period_end'
  title: string
  detail: string
  dueAt: string | null
  occurredAt: string | null
  actionPath: string
  status: 'open' | 'upcoming' | 'overdue'
}

export type StudentTaskCalendarPayload = {
  generatedAt: string
  pendingFacultyEvalCount: number
  nearestDueAt: string | null
  items: StudentTaskCalendarItem[]
}

export async function fetchStudentTaskCalendar() {
  const { data } = await apiClient.get('/student-portal/task-calendar')
  return (data as { data: StudentTaskCalendarPayload }).data
}

export type StudentGradeFeedbackItem = {
  id: string
  courseCode: string
  courseTitle: string
  markCode: string
  remarks: string | null
  status: string
  submittedAt: string | null
  justPosted: boolean
}

export async function fetchStudentGradeFeedback(sinceMinutes = 60) {
  const { data } = await apiClient.get('/student-portal/grade-feedback', {
    params: { sinceMinutes },
  })
  return (
    data as {
      data: { generatedAt: string; sinceMinutes: number; items: StudentGradeFeedbackItem[] }
    }
  ).data
}

export async function fetchMyWaitlist() {
  const { data } = await apiClient.get('/scheduling/waitlist/mine')
  return (
    data as {
      data: Array<{
        id: string
        position: number
        sectionId: string
        sectionCode: string
        sectionName: string
        status: string
      }>
    }
  ).data
}

export async function joinSectionWaitlist(sectionId: string) {
  const { data } = await apiClient.post('/scheduling/waitlist', { sectionId })
  return (data as { data: { id: string; position: number; sectionId: string } }).data
}

export async function leaveSectionWaitlist(entryId: string) {
  const { data } = await apiClient.post(`/scheduling/waitlist/${entryId}/leave`)
  return (data as { data: { id: string; status: string } }).data
}

export async function fetchSectionWaitlist(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/waitlist`)
  return (
    data as {
      data: Array<{
        id: string
        position: number
        studentId: string
        studentNumber: string
        studentName: string
      }>
    }
  ).data
}

export async function promoteSectionWaitlist(sectionId: string) {
  const { data } = await apiClient.post(`/scheduling/sections/${sectionId}/waitlist/promote`)
  return (
    data as {
      data: { promoted: boolean; entryId?: string; studentId?: string; reason?: string }
    }
  ).data
}

export async function checkMeetingSlotConflicts(
  sectionId: string,
  body: {
    dayOfWeek: number
    startMinute: number
    endMinute: number
    roomCode?: string
    facultyUserId?: string
  }
) {
  const { data } = await apiClient.post(
    `/scheduling/sections/${sectionId}/meetings/conflicts`,
    body
  )
  return (data as { data: { ok: boolean; conflicts: Array<{ kind: string; message: string }> } })
    .data
}

export async function fetchSectionSchedulingSummary(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/summary`)
  return (
    data as {
      data: {
        sectionCode: string
        atCapacity: boolean
        waitlistEnabled: boolean
        waitlistCount: number
        seated: number
        capacity: number
      }
    }
  ).data
}

export async function reviewStoredSectionConflicts(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/stored-conflicts`)
  return (
    data as {
      data: {
        sectionCode: string
        meetingsChecked: number
        ok: boolean
        unchanged: boolean
        conflicts: Array<{ message: string }>
      }
    }
  ).data
}

export async function checkScheduleConflicts(sectionId: string) {
  const { data } = await apiClient.post('/scheduling/conflicts/check', { sectionId })
  return (data as { data: { ok: boolean; conflicts: Array<{ kind: string; message: string }> } })
    .data
}

export async function fetchSectionMeetings(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/meetings`)
  return (
    data as {
      data: Array<{
        id: string
        dayOfWeek: number
        startMinute: number
        endMinute: number
        roomCode: string | null
      }>
    }
  ).data
}

export async function addSectionMeeting(
  sectionId: string,
  payload: { dayOfWeek: number; startMinute: number; endMinute: number; roomCode?: string }
) {
  const { data } = await apiClient.post(`/scheduling/sections/${sectionId}/meetings`, payload)
  return (data as { data: { id: string } }).data
}

export async function deleteSectionMeeting(meetingId: string) {
  await apiClient.delete(`/scheduling/meetings/${meetingId}`)
}

export type SectionRosterRow = {
  enrollmentLineId: string
  enrollmentId: string
  status: string
  studentId: string | null
  studentNumber: string | null
  studentName: string | null
  subjectCode: string | null
}

export async function fetchSectionRoster(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/roster`)
  return (data as { data: SectionRosterRow[] }).data ?? []
}

export async function updateSectionMeeting(
  meetingId: string,
  payload: {
    dayOfWeek?: number
    startMinute?: number
    endMinute?: number
    roomCode?: string | null
    facultyUserId?: string | null
  }
) {
  const { data } = await apiClient.patch(`/scheduling/meetings/${meetingId}`, payload)
  return (data as { data: unknown }).data
}

export async function dropSectionEnrollmentLine(
  sectionId: string,
  payload: { enrollmentLineId: string; reason?: string }
) {
  const { data } = await apiClient.post(`/scheduling/sections/${sectionId}/drop-line`, payload)
  return (data as { data: { promotedWaitlistEntryId: string | null } }).data
}

export async function transferSectionEnrollmentLine(
  sectionId: string,
  payload: { enrollmentLineId: string; toSectionId: string }
) {
  const { data } = await apiClient.post(`/scheduling/sections/${sectionId}/transfer-line`, payload)
  return (data as { data: { toSectionId: string } }).data
}

export async function dissolveSection(sectionId: string, reason?: string) {
  const { data } = await apiClient.post(`/scheduling/sections/${sectionId}/dissolve`, { reason })
  return (data as { data: { affectedStudents: number; droppedLines: number } }).data
}

export type ScheduleNotification = {
  id: string
  title: string
  body: string
  eventType: string
  createdAt: string
  readAt?: string | null
  sectionId?: string | null
}

export async function fetchMyScheduleNotifications() {
  const { data } = await apiClient.get('/scheduling/notifications/mine')
  return (data as { data: ScheduleNotification[] }).data ?? []
}

export async function fetchFacultyScheduleNotifications() {
  const { data } = await apiClient.get('/scheduling/notifications/faculty', {
    skipHttpErrorToast: true,
  })
  return (data as { data: ScheduleNotification[] }).data ?? []
}

export async function markScheduleNotificationRead(id: string) {
  const { data } = await apiClient.post(`/scheduling/notifications/${id}/read`)
  return (data as { data: { id: string; readAt: string | null } }).data
}

export async function resolveClassCodesLine(line: string) {
  const { data } = await apiClient.post('/scheduling/class-codes/resolve', { line })
  return (
    data as {
      data: {
        requestedCodes: string[]
        missingCodes: string[]
        sections: Array<{
          code: string
          sectionId: string
          name: string
          atCapacity: boolean
          seatsAvailable: number | null
        }>
      }
    }
  ).data
}

export async function searchAlternateSections(payload: {
  conflictingSectionId?: string
  subjectCode?: string
  excludeSectionId?: string
}) {
  const { data } = await apiClient.post('/scheduling/alternate-sections/search', payload)
  return (
    data as {
      data: {
        alternatives: Array<{
          sectionId: string
          sectionCode: string
          sectionName: string
          seatsAvailable: number | null
          waitlistEnabled: boolean
        }>
      }
    }
  ).data
}

export async function applyClassCodesLine(
  enrollmentId: string,
  line: string,
  mode: 'irregular' | 'block' = 'irregular'
) {
  const { data } = await apiClient.post('/scheduling/class-codes/apply', {
    enrollmentId,
    line,
    mode,
  })
  return (
    data as {
      data: {
        addedCount: number
        sectionCodes: string[]
        autoReassessment: string
        requiresReadvising: boolean
        requiresReassessment: boolean
      }
    }
  ).data
}

export async function encodeBlockGroup(enrollmentId: string, blockGroupCode: string) {
  const { data } = await apiClient.post('/scheduling/block-groups/encode', {
    enrollmentId,
    blockGroupCode,
  })
  return (
    data as {
      data: {
        addedCount: number
        blockGroupCode: string
        sectionCodes: string[]
        autoReassessment: string
        requiresReadvising: boolean
        requiresReassessment: boolean
      }
    }
  ).data
}

export async function fetchRoomCategories() {
  const { data } = await apiClient.get('/academic/room-categories')
  return (data as { data: Array<{ id: string; code: string; name: string }> }).data
}

export async function createRoomCategory(payload: { code: string; name: string }) {
  const { data } = await apiClient.post('/academic/room-categories', payload)
  return (data as { data: { id: string } }).data
}

export async function fetchBuildings() {
  const { data } = await apiClient.get('/academic/buildings')
  return (
    data as { data: Array<{ id: string; code: string; name: string; campusCode: string | null }> }
  ).data
}

export async function createBuilding(payload: { code: string; name: string; campusCode?: string }) {
  const { data } = await apiClient.post('/academic/buildings', payload)
  return (data as { data: { id: string } }).data
}

export async function fetchRooms(buildingId?: string) {
  const { data } = await apiClient.get('/academic/rooms', {
    params: buildingId ? { buildingId } : {},
  })
  return (
    data as {
      data: Array<{
        id: string
        code: string
        name: string
        capacity: number | null
        buildingCode: string
        categoryCode: string | null
      }>
    }
  ).data
}

export async function createRoom(payload: {
  buildingId: string
  categoryId?: string
  code: string
  name: string
  capacity?: number
}) {
  const { data } = await apiClient.post('/academic/rooms', payload)
  return (data as { data: { id: string } }).data
}

export type AcademicPoliciesPayload = {
  enrollmentApprovalSteps: string[]
  gradeDisplayMode: 'immediate' | 'after_deadline' | 'manual_release'
  gradeDocumentSignatories: Array<{ docType: string; role: string; name: string }>
}

export async function fetchAcademicPolicies() {
  const { data } = await apiClient.get('/academic/policies')
  return (data as { data: AcademicPoliciesPayload }).data
}

export async function updateAcademicPolicies(payload: AcademicPoliciesPayload) {
  const { data } = await apiClient.patch('/academic/policies', payload)
  return (data as { data: AcademicPoliciesPayload }).data
}

export type InstitutionalProfilePayload = {
  legalName: string
  displayName: string | null
  logoUrl: string | null
  signatories: Array<{ role: string; name: string; title?: string | null }>
}

export async function fetchInstitutionalProfile() {
  const { data } = await apiClient.get('/academic/institution')
  return (data as { data: InstitutionalProfilePayload }).data
}

export async function updateInstitutionalProfile(payload: {
  legalName: string
  displayName?: string
  logoUrl?: string
  signatories: Array<{ role: string; name: string; title?: string }>
}) {
  const { data } = await apiClient.patch('/academic/institution', payload)
  return (data as { data: InstitutionalProfilePayload }).data
}

export type UsisCollege = {
  id: string
  code: string
  name: string
  deanName: string | null
  isActive: boolean
}

export type UsisAcademicDepartment = {
  id: string
  collegeId: string
  collegeCode: string | null
  collegeName: string | null
  code: string
  name: string
  headName: string | null
  headPlatformUserId: string | null
  isActive: boolean
}

export type UsisPosition = {
  id: string
  code: string
  name: string
  isActive: boolean
}

export type UsisSubjectArea = {
  id: string
  collegeId: string | null
  collegeCode: string | null
  code: string
  name: string
  isActive: boolean
}

export type UsisEmployeeAssignment = {
  id: string
  platformUserId: string
  displayName: string | null
  collegeId: string | null
  collegeCode: string | null
  academicDepartmentId: string | null
  academicDepartmentCode: string | null
  positionId: string | null
  positionCode: string | null
  isDepartmentHead: boolean
  isActive: boolean
}

export async function fetchColleges() {
  const { data } = await apiClient.get('/academic/colleges')
  return (data as { data: UsisCollege[] }).data
}

export async function createCollege(payload: { code: string; name: string; deanName?: string }) {
  const { data } = await apiClient.post('/academic/colleges', payload)
  return (data as { data: UsisCollege }).data
}

export async function fetchAcademicDepartments(collegeId?: string) {
  const { data } = await apiClient.get('/academic/structure-departments', {
    params: collegeId ? { collegeId } : undefined,
  })
  return (data as { data: UsisAcademicDepartment[] }).data
}

export async function createAcademicDepartment(payload: {
  collegeId: string
  code: string
  name: string
  headName?: string
  headPlatformUserId?: string
}) {
  const { data } = await apiClient.post('/academic/structure-departments', payload)
  return (data as { data: UsisAcademicDepartment }).data
}

export async function fetchPositions() {
  const { data } = await apiClient.get('/academic/positions')
  return (data as { data: UsisPosition[] }).data
}

export async function createPosition(payload: { code: string; name: string }) {
  const { data } = await apiClient.post('/academic/positions', payload)
  return (data as { data: UsisPosition }).data
}

export async function fetchSubjectAreas(collegeId?: string) {
  const { data } = await apiClient.get('/academic/subject-areas', {
    params: collegeId ? { collegeId } : undefined,
  })
  return (data as { data: UsisSubjectArea[] }).data
}

export async function createSubjectArea(payload: {
  code: string
  name: string
  collegeId?: string
}) {
  const { data } = await apiClient.post('/academic/subject-areas', payload)
  return (data as { data: UsisSubjectArea }).data
}

export async function fetchEmployeeAssignments() {
  const { data } = await apiClient.get('/academic/employee-assignments')
  return (data as { data: UsisEmployeeAssignment[] }).data
}

export async function createEmployeeAssignment(payload: {
  platformUserId: string
  displayName?: string
  collegeId?: string
  academicDepartmentId?: string
  positionId?: string
  isDepartmentHead?: boolean
}) {
  const { data } = await apiClient.post('/academic/employee-assignments', payload)
  return (data as { data: UsisEmployeeAssignment }).data
}
