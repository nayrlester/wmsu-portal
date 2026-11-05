export const DefaultRoleSlug = {
  ADMIN: 'admin',
  STAFF: 'staff',
  VIEWER: 'viewer',
  SUPPLY_OFFICER: 'supply_officer',
  PROPERTY_CUSTODIAN: 'property_custodian',
  SUPPLY_CLERK: 'supply_clerk',
} as const

export const AuditAction = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  RETURN: 'return',
  RETIRE: 'retire',
  STOCK_RECEIVE: 'stock_receive',
  STOCK_ISSUE: 'stock_issue',
  STOCK_TRANSFER: 'stock_transfer',
  STOCK_ADJUST: 'stock_adjust',
  STOCK_BEGINNING: 'stock_beginning',
  STOCK_RETURN: 'stock_return',
  STOCK_DISPOSAL: 'stock_disposal',
  STOCK_RESERVE: 'stock_reserve',
  STOCK_RELEASE: 'stock_release',
  MAINTENANCE_SCHEDULED: 'maintenance_scheduled',
  MAINTENANCE_COMPLETED: 'maintenance_completed',
  SUPPLIER_CREATE: 'supplier_create',
  SUPPLIER_UPDATE: 'supplier_update',
  SUPPLIER_DELETE: 'supplier_delete',
  REQUISITION_CREATE: 'requisition_create',
  REQUISITION_SUBMIT: 'requisition_submit',
  REQUISITION_APPROVE: 'requisition_approve',
  REQUISITION_REJECT: 'requisition_reject',
  REQUISITION_FULFILL: 'requisition_fulfill',
  COA_CREATE: 'coa_create',
  COA_UPDATE: 'coa_update',
  COA_APPROVE: 'coa_approve',
  COUNT_CREATE: 'count_open',
  COUNT_OPEN: 'count_open',
  COUNT_SCAN: 'count_scan',
  COUNT_RECONCILE: 'count_reconcile',
  COUNT_CLOSE: 'count_close',
  DEPRECIATION_PROFILE: 'depr_profile',
  DEPRECIATION_RUN: 'depr_run',
  DEPR_RUN: 'depr_run',
  ASSET_QR: 'asset_qr',
  REPORT_EXPORT: 'report_export',
} as const

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction]

export const TransactionType = {
  BEGINNING: 'beginning',
  RECEIVE: 'receive',
  ISSUE: 'issue',
  TRANSFER: 'transfer',
  ADJUST: 'adjust',
  RETURN: 'return',
  DISPOSAL: 'disposal',
  RESERVE: 'reserve',
  RELEASE: 'release',
} as const

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType]

export const AssetStatus = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  IN_MAINTENANCE: 'in_maintenance',
  RETIRED: 'retired',
  DISPOSED: 'disposed',
} as const

export const AssetLifecycleStage = {
  ACTIVE: 'active',
  RETIRED: 'retired',
  DISPOSED: 'disposed',
} as const

export const CoaFormType = {
  ICS: 'ICS',
  PAR: 'PAR',
  RPCPPE: 'RPCPPE',
  IIRUP: 'IIRUP',
  WMR: 'WMR',
} as const

export type CoaFormTypeValue = (typeof CoaFormType)[keyof typeof CoaFormType]

export const CoaDocumentStatus = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  VOID: 'void',
} as const

export const CountSessionStatus = {
  OPEN: 'open',
  COUNTING: 'counting',
  RECONCILING: 'reconciling',
  RECONCILED: 'reconciled',
  CLOSED: 'closed',
} as const

export const RequisitionStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
} as const

export const UIMS_PERMISSIONS = [
  { code: 'org.read', name: 'View organization', module: 'org' },
  { code: 'org.write', name: 'Manage organization', module: 'org' },
  { code: 'users.read', name: 'View users', module: 'users' },
  { code: 'users.write', name: 'Manage users', module: 'users' },
  { code: 'roles.read', name: 'View roles', module: 'roles' },
  { code: 'roles.write', name: 'Manage roles', module: 'roles' },
  { code: 'items.read', name: 'View items', module: 'items' },
  { code: 'items.write', name: 'Manage items', module: 'items' },
  { code: 'warehouses.read', name: 'View warehouses', module: 'warehouses' },
  { code: 'warehouses.write', name: 'Manage warehouses', module: 'warehouses' },
  { code: 'stock.read', name: 'View stock', module: 'stock' },
  { code: 'stock.write', name: 'Manage stock movements', module: 'stock' },
  { code: 'assets.read', name: 'View assets', module: 'assets' },
  { code: 'assets.write', name: 'Manage assets', module: 'assets' },
  { code: 'suppliers.read', name: 'View suppliers', module: 'suppliers' },
  { code: 'suppliers.write', name: 'Manage suppliers', module: 'suppliers' },
  { code: 'requisitions.read', name: 'View requisitions', module: 'requisitions' },
  { code: 'requisitions.write', name: 'Manage requisitions', module: 'requisitions' },
  { code: 'coa.read', name: 'View COA forms', module: 'coa' },
  { code: 'coa.write', name: 'Manage COA forms', module: 'coa' },
  { code: 'counts.read', name: 'View physical counts', module: 'counts' },
  { code: 'counts.write', name: 'Manage physical counts', module: 'counts' },
  { code: 'depreciation.read', name: 'View depreciation', module: 'depreciation' },
  { code: 'depreciation.write', name: 'Manage depreciation', module: 'depreciation' },
  { code: 'reports.read', name: 'View reports', module: 'reports' },
  { code: 'reports.export', name: 'Export reports', module: 'reports' },
  { code: 'announcements.read', name: 'View announcements and communications', module: 'communications' },
  { code: 'announcements.write', name: 'Manage announcements and mass communications', module: 'communications' },
  { code: 'faculty_eval.read', name: 'View faculty evaluation setup and reports', module: 'faculty_eval' },
  { code: 'faculty_eval.write', name: 'Manage faculty evaluation databank and schedules', module: 'faculty_eval' },
  { code: 'faculty_eval.submit', name: 'Submit faculty evaluations as a student', module: 'faculty_eval' },
  { code: 'audit.read', name: 'View audit logs', module: 'audit' },
] as const

export const ENROLLMENT_PERMISSIONS = [
  { code: 'applicants.read', name: 'View applicants', module: 'enrollment' },
  { code: 'applicants.write', name: 'Manage applicants', module: 'enrollment' },
  { code: 'students.read', name: 'View students', module: 'enrollment' },
  { code: 'students.write', name: 'Manage students', module: 'enrollment' },
  { code: 'students.self', name: 'View own student record', module: 'enrollment' },
  { code: 'portal.student', name: 'Access student portal', module: 'enrollment' },
  { code: 'academic.read', name: 'View academic setup', module: 'enrollment' },
  { code: 'academic.write', name: 'Manage academic setup', module: 'enrollment' },
  { code: 'subjects.read', name: 'View subject catalog', module: 'enrollment' },
  { code: 'enrollments.read', name: 'View enrollments', module: 'enrollment' },
  { code: 'enrollments.write', name: 'Manage enrollments', module: 'enrollment' },
  { code: 'advising.read', name: 'View academic advising', module: 'enrollment' },
  { code: 'advising.write', name: 'Manage academic advising', module: 'enrollment' },
  { code: 'enrollments.override', name: 'Authorize enrollment overrides', module: 'enrollment' },
  { code: 'grades.read', name: 'View grades and class records', module: 'enrollment' },
  { code: 'grades.write', name: 'Encode and submit grades', module: 'enrollment' },
  { code: 'grades.approve', name: 'Approve grade corrections', module: 'enrollment' },
  { code: 'grades.admin', name: 'Configure grading schemes and deadlines', module: 'enrollment' },
  { code: 'assessments.read', name: 'View assessments', module: 'enrollment' },
  { code: 'assessments.write', name: 'Prepare and sync assessments', module: 'enrollment' },
  { code: 'payments.read', name: 'View payments', module: 'enrollment' },
  { code: 'payments.write', name: 'Record payments', module: 'enrollment' },
  { code: 'scholarships.read', name: 'View scholarships', module: 'enrollment' },
  { code: 'scholarships.write', name: 'Manage scholarships', module: 'enrollment' },
  { code: 'deficiencies.read', name: 'View deficiencies', module: 'enrollment' },
  { code: 'deficiencies.write', name: 'Manage deficiencies', module: 'enrollment' },
  { code: 'clearance.read', name: 'View clearance', module: 'enrollment' },
  { code: 'queue.self', name: 'Issue own SSS queue tickets', module: 'sss' },
  { code: 'counseling.self', name: 'Submit own guidance counseling requests', module: 'sss' },
  { code: 'guidance.read', name: 'View guidance service metadata', module: 'sss' },
  { code: 'guidance.write', name: 'Manage guidance workflows', module: 'sss' },
  { code: 'guidance.case_notes.read', name: 'Read counseling case notes (restricted)', module: 'sss' },
  { code: 'guidance.case_notes.write', name: 'Write counseling case notes (restricted)', module: 'sss' },
  { code: 'health.read', name: 'View health service metadata', module: 'sss' },
  { code: 'health.write', name: 'Manage health workflows', module: 'sss' },
  { code: 'health.clinical.read', name: 'Read clinical notes (restricted)', module: 'sss' },
  { code: 'health.clinical.write', name: 'Write clinical notes (restricted)', module: 'sss' },
  { code: 'osa.read', name: 'View OSA records', module: 'sss' },
  { code: 'osa.write', name: 'Manage OSA workflows', module: 'sss' },
  { code: 'sss.admin', name: 'Assign SSS office staff and view sensitive access logs', module: 'sss' },
] as const
