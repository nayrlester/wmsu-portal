import vine from '@vinejs/vine'
import { QUEUE_OFFICES, SSS_OFFICES } from '#modules/enrollment/domain/student_support'

export const officeStaffValidator = vine.compile(
  vine.object({
    userId: vine.string().uuid(),
    office: vine.enum(SSS_OFFICES),
    roleTitle: vine.string().optional(),
  })
)

export const serviceRequestValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    office: vine.enum(SSS_OFFICES),
    requestType: vine.string(),
    channel: vine.string().optional(),
    summary: vine.string().optional(),
  })
)

export const counselingRequestValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    channel: vine.enum(['online', 'walk_in'] as const),
  })
)

export const caseNoteValidator = vine.compile(
  vine.object({
    counselingRequestId: vine.string().uuid(),
    sessionId: vine.string().uuid().optional(),
    studentId: vine.string().uuid().optional(),
    noteBody: vine.string().minLength(1),
    noteKind: vine
      .enum(['intake', 'session', 'follow_up', 'case_note', 'referral'] as const)
      .optional(),
  })
)

export const counselingIntakeValidator = vine.compile(
  vine.object({
    intakeSummary: vine.string().trim().minLength(1).maxLength(4000),
  })
)

export const counselingAssignValidator = vine.compile(
  vine.object({
    counselorId: vine.string().uuid().optional(),
  })
)

export const counselingSessionValidator = vine.compile(
  vine.object({
    sessionType: vine.string().trim().maxLength(40).optional(),
    isFollowUp: vine.boolean().optional(),
    noteBody: vine.string().trim().maxLength(4000).optional(),
  })
)

export const counselingSpecialistReferralValidator = vine.compile(
  vine.object({
    toOffice: vine.enum(['guidance', 'health', 'osa', 'scholarship'] as const),
    specialistType: vine.enum([
      'psychologist',
      'medical_doctor',
      'psychiatrist',
      'social_worker',
    ] as const),
    reasonSummary: vine.string().trim().maxLength(1000).optional(),
  })
)

export const counselingResolveValidator = vine.compile(
  vine.object({
    resolutionSummary: vine.string().trim().maxLength(4000).optional(),
  })
)

export const healthEncounterValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    encounterType: vine.string().optional(),
    isEmergency: vine.boolean().optional(),
    clinicalNote: vine.string().optional(),
    diagnosisLabel: vine.string().trim().maxLength(255).optional(),
    medicationLabel: vine.string().trim().maxLength(255).optional(),
    medicationInstructions: vine.string().trim().maxLength(512).optional(),
    hospitalReferralFacility: vine.string().trim().maxLength(255).optional(),
  })
)

export const healthConditionValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    conditionCode: vine.string().trim().minLength(2).maxLength(64),
    label: vine.string().trim().minLength(2).maxLength(255),
    isChronic: vine.boolean().optional(),
  })
)

export const medicalAlertValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    alertCode: vine.string().trim().minLength(2).maxLength(64),
    severity: vine.enum(['info', 'warning', 'critical'] as const).optional(),
  })
)

export const healthPrescriptionValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    encounterId: vine.string().uuid(),
    medicationLabel: vine.string().trim().minLength(2).maxLength(255),
    instructions: vine.string().trim().maxLength(512).optional(),
  })
)

export const hospitalReferralValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    toFacility: vine.string().trim().minLength(2).maxLength(255),
    encounterId: vine.string().uuid().optional(),
  })
)

export const healthClearanceValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    status: vine.enum(['pending', 'cleared', 'denied'] as const),
    clearanceType: vine.string().optional(),
    assessmentContext: vine.enum(['freshman', 'transferee', 'returning', 'other'] as const).optional(),
    validUntil: vine.string().optional(),
  })
)

export const medicalAssessmentValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    assessmentContext: vine.enum(['freshman', 'transferee', 'returning', 'other'] as const),
    status: vine.enum(['pending', 'cleared', 'denied'] as const),
    validUntil: vine.string().optional(),
    requireProgramsComplete: vine.boolean().optional(),
  })
)

export const healthProgramValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    programCode: vine.enum(['DRUG_TESTING', 'HIV_SCREENING', 'DENTAL_EXAM', 'MEDICAL_EXAM'] as const),
    status: vine.enum(['scheduled', 'completed', 'missed', 'excused'] as const).optional(),
  })
)

export const disciplineComplaintValidator = vine.compile(
  vine.object({
    respondentStudentId: vine.string().uuid(),
    complainantRole: vine.string().optional(),
    summary: vine.string().optional(),
  })
)

export const disciplineAdvanceValidator = vine.compile(
  vine.object({
    workflowStatus: vine.enum([
      'intake',
      'investigation',
      'committee',
      'sdt',
      'decision',
      'closed',
    ] as const),
    sdtEngaged: vine.boolean().optional(),
  })
)

export const disciplineSanctionValidator = vine.compile(
  vine.object({
    sanctionCode: vine.enum([
      'WARNING',
      'REPRIMAND',
      'PROBATION',
      'SUSPENSION',
      'EXPULSION',
      'COMMUNITY_SERVICE',
    ] as const),
    label: vine.string().trim().maxLength(255).optional(),
  })
)

export const scholarshipProgramValidator = vine.compile(
  vine.object({
    code: vine.string(),
    name: vine.string(),
    sourceType: vine.enum(['internal', 'external'] as const),
    eligibilityConfig: vine.any().optional(),
    coverageConfig: vine.any().optional(),
  })
)

export const scholarshipApplyValidator = vine.compile(
  vine.object({
    programId: vine.string().uuid(),
    studentId: vine.string().uuid(),
    incomeClassification: vine.string().optional(),
    requirementsJson: vine.any().optional(),
  })
)

export const scholarshipDecideValidator = vine.compile(
  vine.object({
    approve: vine.boolean(),
    awardAmount: vine.number().optional(),
    enrollmentId: vine.string().uuid().optional(),
  })
)

export const saApplyValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    requirementsJson: vine.any().optional(),
  })
)

export const saRequirementsValidator = vine.compile(
  vine.object({
    documents: vine.array(
      vine.object({
        key: vine.string().trim().minLength(1).maxLength(64),
        submitted: vine.boolean(),
        label: vine.string().trim().maxLength(120).optional(),
      })
    ),
  })
)

export const saInterviewValidator = vine.compile(
  vine.object({
    interviewAt: vine.string().trim(),
  })
)

export const saAdvanceValidator = vine.compile(
  vine.object({
    workflowStatus: vine.enum([
      'submitted',
      'cjpc',
      'screening_committee',
      'vpsas',
      'president',
      'deployed',
      'rejected',
    ] as const),
    deploymentOffice: vine.string().trim().maxLength(128).optional(),
    interviewScore: vine.number().min(0).max(100).optional(),
  })
)

export const queueTicketValidator = vine.compile(
  vine.object({
    office: vine.enum(QUEUE_OFFICES),
    serviceCode: vine.string(),
    studentId: vine.string().uuid().optional(),
  })
)

export const queueAdvanceValidator = vine.compile(
  vine.object({
    status: vine.enum(['waiting', 'called', 'completed', 'skipped', 'cancelled'] as const),
  })
)

export const orgApplicationSubmitValidator = vine.compile(
  vine.object({
    proposedName: vine.string().trim().minLength(3).maxLength(200),
    applicationType: vine.enum(['new', 'renewal'] as const),
    requirementsJson: vine.any().optional(),
  })
)

export const orgApplicationAdvanceValidator = vine.compile(
  vine.object({
    workflowStatus: vine.enum(['osa', 'vpsas', 'legal', 'president', 'accredited', 'rejected'] as const),
    issueCertificateRef: vine.string().trim().optional(),
  })
)

export const studentIdRequestSubmitValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid().optional(),
    requestType: vine.enum(['new', 'replacement'] as const),
  })
)

export const studentIdRequestUpdateValidator = vine.compile(
  vine.object({
    status: vine
      .enum([
        'submitted',
        'osa_verified',
        'payment_pending',
        'payment_validated',
        'digital_issued',
        'print_queued',
        'printed',
        'rejected',
      ] as const)
      .optional(),
    rfidRef: vine.string().trim().maxLength(128).optional(),
    paymentValidationRef: vine.string().trim().maxLength(128).optional(),
    printUnitStatus: vine.string().trim().maxLength(40).optional(),
  })
)

export const officeReferralValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    fromOffice: vine.enum(['guidance', 'health'] as const),
    toOffice: vine.enum(['guidance', 'health', 'osa', 'scholarship'] as const),
    reasonSummary: vine.string().trim().maxLength(1000).optional(),
    fromRequestId: vine.string().uuid().optional(),
    encounterId: vine.string().uuid().optional(),
  })
)

export const psychScheduleValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    collegeCode: vine.string().trim().maxLength(64).optional(),
    scheduledAt: vine.string().trim(),
    venue: vine.string().trim().maxLength(255).optional(),
  })
)

export const psychScheduleStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(['scheduled', 'in_progress', 'completed', 'cancelled'] as const),
  })
)

export const psychEncodeValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    testCode: vine.enum(['ENTRANCE_PSYCH', 'SHIFTING_PSYCH', 'COUNSELING_INTAKE'] as const),
    scheduleId: vine.string().uuid().optional(),
  })
)

export const psychReleaseValidator = vine.compile(
  vine.object({
    consultationCompleted: vine.boolean(),
  })
)

export const shiftingApplyValidator = vine.compile(
  vine.object({
    studentId: vine.string().uuid(),
    fromProgramCode: vine.string().trim().maxLength(64).optional(),
    toProgramCode: vine.string().trim().maxLength(64).optional(),
    requirementsJson: vine.any().optional(),
  })
)

export const shiftingRequirementsValidator = vine.compile(
  vine.object({
    documents: vine.array(
      vine.object({
        key: vine.string().trim().minLength(1).maxLength(64),
        submitted: vine.boolean(),
        label: vine.string().trim().maxLength(120).optional(),
      })
    ),
  })
)

export const shiftingScheduleValidator = vine.compile(
  vine.object({
    examScheduledAt: vine.string().trim(),
  })
)

export const shiftingPaymentValidator = vine.compile(
  vine.object({
    paymentTag: vine.string().trim().minLength(2).maxLength(128),
  })
)

export const shiftingResultReadyValidator = vine.compile(
  vine.object({
    resultSummary: vine.string().trim().maxLength(1000).optional(),
  })
)

export const shiftingReleaseValidator = vine.compile(
  vine.object({
    consultationCompleted: vine.boolean(),
  })
)

export const shiftingEndorseValidator = vine.compile(
  vine.object({
    party: vine.enum(['originating_college', 'receiving_college', 'admission'] as const),
    decision: vine.enum(['endorsed', 'rejected'] as const),
  })
)
