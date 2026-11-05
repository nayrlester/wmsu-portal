import { apiClient } from '@/lib/api-client'

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
  const { data } = await apiClient.post('/enrollment/admissions/apply', payload)
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

export async function lookupApplicantPortalStatus(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
}) {
  const { data } = await apiClient.post('/enrollment/admissions/status', payload)
  return (data as { data: ApplicantPortalStatus }).data
}

export async function fetchPublicAdmissionPrograms(orgCode = 'UNI') {
  const { data } = await apiClient.get('/enrollment/admissions/programs', {
    params: { orgCode },
  })
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
  const { data } = await apiClient.get('/enrollment/admissions/form', {
    params: { orgCode },
  })
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
  const { data } = await apiClient.post('/enrollment/admissions/journey', payload)
  return (data as { data: ApplicantPortalStatus }).data
}

export async function openGuestEntranceExam(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
  eventId?: string
}) {
  const { data } = await apiClient.post('/enrollment/admissions/exam/open', payload)
  return (data as { data: GuestExamSession }).data
}

export async function submitGuestEntranceExam(payload: {
  orgCode?: string
  applicationNumber: string
  email: string
  eventId: string
  answers: Record<string, number>
}) {
  const { data } = await apiClient.post('/enrollment/admissions/exam/submit', payload)
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
      }
    }
  ).data
}
