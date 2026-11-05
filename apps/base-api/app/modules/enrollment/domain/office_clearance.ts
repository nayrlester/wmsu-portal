export const CLEARANCE_OFFICES = [
  'registrar',
  'finance',
  'library',
  'inventory',
  'guidance',
  'health',
  'osa',
] as const

export type ClearanceOffice = (typeof CLEARANCE_OFFICES)[number]

export const OFFICE_CLEARANCE_ITEM_STATUSES = [
  'pending',
  'in_review',
  'cleared',
  'deficient',
  'waived',
] as const

export type OfficeClearanceItemStatus = (typeof OFFICE_CLEARANCE_ITEM_STATUSES)[number]

export const OFFICE_CLEARANCE_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_review', 'cleared', 'deficient', 'waived'],
  in_review: ['cleared', 'deficient', 'waived', 'pending'],
  deficient: ['in_review', 'cleared', 'waived'],
  cleared: ['in_review', 'deficient'],
  waived: ['in_review', 'pending'],
}

export const DEFAULT_OFFICE_CLEARANCE_REQUIREMENTS: Array<{
  office: ClearanceOffice
  requirementCode: string
  label: string
  autoSource: string
  sortOrder: number
}> = [
  {
    office: 'registrar',
    requirementCode: 'REG_ACADEMIC_HOLDS',
    label: 'No open academic enrollment deficiencies',
    autoSource: 'student_deficiencies',
    sortOrder: 10,
  },
  {
    office: 'finance',
    requirementCode: 'FIN_ACCOUNT_CLEAR',
    label: 'Finance account clearance',
    autoSource: 'finance_internal',
    sortOrder: 20,
  },
  {
    office: 'library',
    requirementCode: 'LIB_NO_OPEN_LOANS',
    label: 'Library clearance',
    autoSource: 'library_internal',
    sortOrder: 30,
  },
  {
    office: 'inventory',
    requirementCode: 'INV_NO_OPEN_PROPERTY',
    label: 'Property / inventory clearance',
    autoSource: 'inventory_internal',
    sortOrder: 40,
  },
  {
    office: 'guidance',
    requirementCode: 'GUI_NO_OPEN_COUNSELING',
    label: 'No pending counseling cases',
    autoSource: 'sss_guidance',
    sortOrder: 50,
  },
  {
    office: 'health',
    requirementCode: 'HLT_ENROLLMENT_CLEARANCE',
    label: 'Health enrollment clearance',
    autoSource: 'sss_health',
    sortOrder: 60,
  },
  {
    office: 'osa',
    requirementCode: 'OSA_NO_OPEN_DISCIPLINE',
    label: 'No open disciplinary cases',
    autoSource: 'sss_osa',
    sortOrder: 70,
  },
]
