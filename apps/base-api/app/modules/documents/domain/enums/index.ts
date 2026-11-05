export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIALING = 'trialing',
  CANCELLED = 'cancelled',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  RECEIVED = 'received',
  PENDING_REVIEW = 'pending_review',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned',
  DIGITALLY_SIGNED = 'digitally_signed',
  RELEASED = 'released',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum DocumentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DocumentVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/** Access classification (separate from public tracking visibility). */
export enum DocumentConfidentiality {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

/** NAP General Circular No. 5 categories. */
export enum NapCategory {
  ADMINISTRATIVE = 'administrative',
  FINANCIAL_PROPERTY = 'financial_property',
  LEGAL_CONTRACTUAL = 'legal_contractual',
  ACADEMIC_INSTRUCTIONAL = 'academic_instructional',
  PERSONNEL = 'personnel',
  STUDENT_SUPPORT = 'student_support',
  INSTITUTIONAL_GOVERNANCE = 'institutional_governance',
}

export enum RecordsLifecycleStatus {
  ACTIVE = 'active',
  SEMI_ACTIVE = 'semi_active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum DispositionAction {
  ARCHIVE = 'archive',
  DISPOSE = 'dispose',
  PERMANENT = 'permanent',
}

export enum EsignEnvelopeStatus {
  DRAFT = 'draft',
  UPLOADED = 'uploaded',
  SENT = 'sent',
  VIEWED = 'viewed',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  VOIDED = 'voided',
  ERROR = 'error',
}

export enum DocumentSourceType {
  UPLOAD = 'upload',
  EDITOR = 'editor',
  MIXED = 'mixed',
}

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  RETURN = 'return',
  FORWARD = 'forward',
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum WorkflowStepType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
}

export enum RecordRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  CHECKED_OUT = 'checked_out',
  PARTIALLY_RETURNED = 'partially_returned',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum RecordRequestItemStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  CHECKED_OUT = 'checked_out',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum RecordAccessMode {
  VIEW_ONLY = 'view_only',
  DOWNLOAD = 'download',
  PHYSICAL_CHECKOUT = 'physical_checkout',
}

export enum ReleaseEventType {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DENIED = 'denied',
  RELEASED = 'released',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
  NOTE = 'note',
}

export enum ReceivingChannel {
  WALK_IN = 'walk_in',
  EMAIL = 'email',
  COURIER = 'courier',
  PORTAL = 'portal',
  INTERNAL = 'internal',
}

export enum ReceivingReceiptStatus {
  LOGGED = 'logged',
  REGISTERED = 'registered',
  CANCELLED = 'cancelled',
}

export enum DigitizationBatchStatus {
  OPEN = 'open',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DigitizationItemStatus {
  QUEUED = 'queued',
  OCR_RUNNING = 'ocr_running',
  QA_PENDING = 'qa_pending',
  QA_PASSED = 'qa_passed',
  QA_FAILED = 'qa_failed',
  LINKED = 'linked',
}

export enum OcrQaStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ArchivalTransferStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DisposalRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  DOWNLOAD = 'download',
  APPROVE = 'approve',
  REJECT = 'reject',
  RETURN = 'return',
  FORWARD = 'forward',
  UPLOAD = 'upload',
  AI_ASSISTANT = 'ai_assistant',
  ESIGN_SENT = 'esign_sent',
  ESIGN_COMPLETED = 'esign_completed',
  ESIGN_FAILED = 'esign_failed',
  LIFECYCLE_UPDATE = 'lifecycle_update',
  RECORD_REQUEST_CREATE = 'record_request_create',
  RECORD_REQUEST_APPROVE = 'record_request_approve',
  RECORD_REQUEST_DENY = 'record_request_deny',
  RECORD_REQUEST_RELEASE = 'record_request_release',
  RECORD_REQUEST_RETURN = 'record_request_return',
  RECORD_REQUEST_CANCEL = 'record_request_cancel',
  DIGITIZATION_BATCH_CREATE = 'digitization_batch_create',
  DIGITIZATION_ITEM_QA = 'digitization_item_qa',
  DIGITIZATION_INGEST = 'digitization_ingest',
  DIGITIZATION_OCR = 'digitization_ocr',
  RECEIVING_RECEIPT_CREATE = 'receiving_receipt_create',
  RECEIVING_RECEIPT_REGISTER = 'receiving_receipt_register',
  ARCHIVAL_TRANSFER_CREATE = 'archival_transfer_create',
  ARCHIVAL_TRANSFER_APPROVE = 'archival_transfer_approve',
  ARCHIVAL_TRANSFER_COMPLETE = 'archival_transfer_complete',
  DISPOSAL_REQUEST_CREATE = 'disposal_request_create',
  DISPOSAL_REQUEST_APPROVE = 'disposal_request_approve',
  DISPOSAL_REQUEST_COMPLETE = 'disposal_request_complete',
  LEGAL_HOLD_SET = 'legal_hold_set',
  LEGAL_HOLD_RELEASE = 'legal_hold_release',
  METADATA_CORRECT = 'metadata_correct',
}

export enum DefaultRoleSlug {
  SUPER_ADMIN = 'super_admin',
  TENANT_OWNER = 'tenant_owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  APPROVER = 'approver',
  STAFF = 'staff',
  VIEWER = 'viewer',
}

export enum PlanSlug {
  STARTER = 'starter',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum BillingProvider {
  STRIPE = 'stripe',
  PAYMONGO = 'paymongo',
  STUB = 'stub',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum CouponDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export enum UsageMetric {
  USERS = 'users',
  DOCUMENTS = 'documents',
  STORAGE_BYTES = 'storage_bytes',
  OCR_JOBS = 'ocr_jobs',
  AI_JOBS = 'ai_jobs',
}
