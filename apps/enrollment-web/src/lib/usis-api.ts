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
          meta?: PaginatedResult<T>['meta']
          total?: number
          perPage?: number
          currentPage?: number
          lastPage?: number
        }
  }
  if (!root?.data) return { data: [], meta: {} }
  if (Array.isArray(root.data)) return { data: root.data, meta: {} }
  const block = root.data
  return {
    data: block.data ?? [],
    meta: {
      total: block.meta?.total ?? block.total,
      perPage: block.meta?.perPage ?? block.perPage,
      currentPage: block.meta?.currentPage ?? block.currentPage,
      lastPage: block.meta?.lastPage ?? block.lastPage,
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
  }>(data)
}

export async function admitApplicant(id: string, studentNumber: string) {
  const { data } = await apiClient.post(`/applicants/${id}/admit`, { studentNumber })
  return asData(data)
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
    yearLevel?: number
    programId?: string
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
  }>(data)
}

export async function fetchEnrollment(id: string) {
  const { data } = await apiClient.get(`/enrollments/${id}`)
  return asData<{
    id: string
    status: string
    yearLevel: number
    semester: number
    studentId: string
    paymentVerified?: boolean
    registrarApprovedAt?: string | null
    lines?: Array<{ id: string; subjectCode: string; subjectTitle: string; units: number; status: string }>
    overrides?: unknown[]
  }>(data)
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
  const { data } = await apiClient.post(`/enrollments/${id}/verify-payment`)
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

export async function fetchClearanceReportVerify(token: string) {
  try {
    const { data } = await apiClient.get(`/clearance/reports/verify/${encodeURIComponent(token)}`)
    return (data as {
      data: {
        valid: boolean
        checksumMatches?: boolean
        cleared?: boolean
        studentNumber?: string
        studentName?: string
        issuedAt?: string
      }
    }).data
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
  const { data } = await apiClient.get('/advising/dashboard')
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
    roster: Array<{ studentId: string; studentNumber?: string; firstName?: string; lastName?: string }>
    entries: Array<{ id: string; studentId: string; markCode: string | null; status: string }>
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

export async function prepareAssessment(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/assessments/prepare', body)
  return asData(data)
}

export async function issueRegistrationDocument(body: {
  enrollmentId: string
  docType: 'assessment_form' | 'certificate_of_registration'
}) {
  const { data } = await apiClient.post('/assessments/documents', body)
  return asData<{ documentNumber: string; docType: string; qrToken: string }>(data)
}

export async function fetchRegistrationDocuments(params: PageParams = {}) {
  const { data } = await apiClient.get('/assessments/documents', { params })
  return asArray<{ id: string; documentNumber: string; docType: string; enrollmentId: string }>(data)
}

export async function fetchDeficiencies(params: PageParams = {}) {
  const { data } = await apiClient.get('/deficiencies', { params })
  return asArray<{ id: string; requirementCode: string; description: string; status: string }>(data)
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

export async function createCounselingRequest(body: { studentId: string; channel: 'online' | 'walk_in' }) {
  const { data } = await apiClient.post('/sss/guidance/counseling-requests', body)
  return asData(data)
}

export async function createHealthClearance(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/health/clearances', body)
  return asData(data)
}

export async function fileDisciplineComplaint(body: Record<string, unknown>) {
  const { data } = await apiClient.post('/sss/osa/discipline/complaints', body)
  return asData(data)
}

export async function issueQueueTicket(body: {
  office: string
  serviceCode: string
  studentId?: string
}) {
  const { data } = await apiClient.post('/sss/queue/tickets', body)
  return asData<{ id: string; ticketNo: string }>(data)
}

export async function fetchClearanceHints(studentId: string) {
  const { data } = await apiClient.get(`/sss/students/${studentId}/clearance-hints`)
  return asData<Record<string, unknown>>(data)
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
  const { data } = await apiClient.get('/academic/subjects', { params: { limit: 50, ...params } })
  return asArray<{ id: string; subjectCode: string; title: string; units: number }>(data)
}

export async function fetchPrograms(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/programs', { params })
  return asArray<{ id: string; code: string; name: string }>(data)
}

export async function fetchAcademicYears() {
  const { data } = await apiClient.get('/academic/years')
  return asArray<{ id: string; code: string; name: string; isActive: boolean }>(data)
}

export async function fetchSections(params: PageParams = {}) {
  const { data } = await apiClient.get('/academic/sections', { params })
  return asArray<{ id: string; code: string; name: string; yearLevel: number; semester: number }>(data)
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

export async function createAnnouncement(payload: {
  title: string
  body: string
  publishNow?: boolean
  isPinned?: boolean
  audience?: { roles?: string[] }
  deliverEmail?: boolean
  deliverSms?: boolean
}) {
  const { data } = await apiClient.post('/announcements', payload)
  return (data as { data: UsisAnnouncement }).data
}

export async function publishAnnouncement(id: string) {
  const { data } = await apiClient.post(`/announcements/${id}/publish`)
  return (data as { data: UsisAnnouncement }).data
}

export async function dispatchAnnouncement(id: string, channels: ('sms' | 'email')[]) {
  const { data } = await apiClient.post(`/announcements/${id}/dispatch`, { channels })
  return (data as { data: unknown }).data
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

export async function createFacultyEvalCode(payload: { code: string; name: string; description?: string }) {
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
  return (data as { data: Array<{ facultyUserId: string; facultyName: string; sectionId: string; sectionCode: string | null; subjectCode?: string; subjectTitle?: string }> }).data ?? []
}

export async function createFacultyEvalSchedule(payload: {
  evalCodeId: string
  title: string
  questionIds: string[]
  openNow?: boolean
  targets: Array<{ facultyUserId: string; sectionId: string | null; subjectCode?: string; subjectTitle?: string }>
}) {
  const { data } = await apiClient.post('/faculty-eval/schedules', payload)
  return (data as { data: { id: string } }).data
}

export async function fetchFacultyEvalPending() {
  const { data } = await apiClient.get('/faculty-eval/pending')
  const root = data as {
    data?: { items?: FacultyEvalPendingItem[]; questions?: FacultyEvalQuestion[]; studentLinked?: boolean }
  }
  return {
    items: root?.data?.items ?? [],
    questions: root?.data?.questions ?? [],
    studentLinked: root?.data?.studentLinked ?? false,
  }
}

export async function submitFacultyEvalResponse(payload: { targetId: string; answers: Record<string, number | string> }) {
  const { data } = await apiClient.post('/faculty-eval/responses', payload)
  return (data as { data: unknown }).data
}

export async function fetchFacultyEvalReport(scheduleId: string) {
  const { data } = await apiClient.get(`/faculty-eval/reports/${scheduleId}`)
  return (data as { data: { totalResponses: number; schedule: { title: string } } }).data
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

export async function fetchMyWaitlist() {
  const { data } = await apiClient.get('/scheduling/waitlist/mine')
  return (data as {
    data: Array<{
      id: string
      position: number
      sectionId: string
      sectionCode: string
      sectionName: string
      status: string
    }>
  }).data
}

export async function joinSectionWaitlist(sectionId: string) {
  const { data } = await apiClient.post('/scheduling/waitlist', { sectionId })
  return (data as { data: { id: string; position: number; sectionId: string } }).data
}

export async function fetchSectionSchedulingSummary(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/summary`)
  return (data as {
    data: {
      sectionCode: string
      atCapacity: boolean
      waitlistEnabled: boolean
      waitlistCount: number
      seated: number
      capacity: number
    }
  }).data
}

export async function checkScheduleConflicts(sectionId: string) {
  const { data } = await apiClient.post('/scheduling/conflicts/check', { sectionId })
  return (data as { data: { ok: boolean; conflicts: Array<{ kind: string; message: string }> } }).data
}

export async function fetchSectionMeetings(sectionId: string) {
  const { data } = await apiClient.get(`/scheduling/sections/${sectionId}/meetings`)
  return (data as {
    data: Array<{
      id: string
      dayOfWeek: number
      startMinute: number
      endMinute: number
      roomCode: string | null
    }>
  }).data
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

export async function fetchMyScheduleNotifications() {
  const { data } = await apiClient.get('/scheduling/notifications/mine')
  return (data as {
    data: Array<{ id: string; title: string; body: string; eventType: string; createdAt: string }>
  }).data
}

export async function resolveClassCodesLine(line: string) {
  const { data } = await apiClient.post('/scheduling/class-codes/resolve', { line })
  return (data as {
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
  }).data
}

export async function searchAlternateSections(payload: {
  conflictingSectionId?: string
  subjectCode?: string
  excludeSectionId?: string
}) {
  const { data } = await apiClient.post('/scheduling/alternate-sections/search', payload)
  return (data as {
    data: {
      alternatives: Array<{
        sectionId: string
        sectionCode: string
        sectionName: string
        seatsAvailable: number | null
        waitlistEnabled: boolean
      }>
    }
  }).data
}

export async function applyClassCodesLine(enrollmentId: string, line: string) {
  const { data } = await apiClient.post('/scheduling/class-codes/apply', { enrollmentId, line })
  return (data as { data: { addedCount: number; sectionCodes: string[] } }).data
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
  return (data as { data: Array<{ id: string; code: string; name: string; campusCode: string | null }> }).data
}

export async function createBuilding(payload: { code: string; name: string; campusCode?: string }) {
  const { data } = await apiClient.post('/academic/buildings', payload)
  return (data as { data: { id: string } }).data
}

export async function fetchRooms(buildingId?: string) {
  const { data } = await apiClient.get('/academic/rooms', { params: buildingId ? { buildingId } : {} })
  return (data as {
    data: Array<{
      id: string
      code: string
      name: string
      capacity: number | null
      buildingCode: string
      categoryCode: string | null
    }>
  }).data
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
