export const ULMIS_MATERIAL_TYPES = [
  'book',
  'serial',
  'journal',
  'article',
  'thesis',
  'dissertation',
  'audiovisual',
  'electronic',
] as const

export type UlmisMaterialType = (typeof ULMIS_MATERIAL_TYPES)[number]

export const ULMIS_CLASSIFICATION_SCHEMES = ['ddc', 'lcc'] as const

export type UlmisClassificationScheme = (typeof ULMIS_CLASSIFICATION_SCHEMES)[number]

export const ACTIVE_CIRCULATION_COPY_STATUSES = ['on_loan', 'reserved'] as const

export const ACTIVE_BORROWING_STATUSES = ['borrowed', 'overdue', 'approved', 'requested'] as const
