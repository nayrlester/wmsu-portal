import { UimsSchema } from '../helpers/uims_schema.js'

/**
 * ENR-053–063 Student Support Services (Guidance, Health, OSA, Scholarship).
 * Sensitive clinical/counseling content lives in restricted tables.
 * Sponsor AR / cashier posting remain UFMS.
 */
export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('sss_office_staff_assignments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('role_title', 80).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.uuid('assigned_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('assigned_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'user_id', 'office'])
    })

    this.s.createTable('sss_service_requests', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('request_type', 80).notNullable()
      t.string('channel', 32).notNullable().defaultTo('online')
      t.string('status', 40).notNullable().defaultTo('submitted')
      t.uuid('assigned_to').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.text('summary').nullable()
      t.jsonb('payload').nullable()
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('closed_at', { useTz: true }).nullable()
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'office', 'status'])
      t.index(['student_id', 'office'])
    })

    this.s.createTable('sss_supporting_documents', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('owner_type', 64).notNullable()
      t.uuid('owner_id').notNullable()
      t.string('document_ref', 512).notNullable()
      t.string('label', 255).nullable()
      t.uuid('uploaded_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('uploaded_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['owner_type', 'owner_id'])
    })

    this.s.createTable('sss_notifications_outbox', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('SET NULL')
      t.uuid('user_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.string('channel', 32).notNullable().defaultTo('portal')
      t.string('template_code', 80).notNullable()
      t.string('subject', 255).nullable()
      t.string('status', 32).notNullable().defaultTo('pending')
      t.jsonb('payload').nullable()
      t.timestamp('scheduled_at', { useTz: true }).nullable()
      t.timestamp('sent_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('sss_sensitive_access_logs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('actor_user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('entity_type', 64).notNullable()
      t.uuid('entity_id').notNullable()
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('SET NULL')
      t.string('access_type', 32).notNullable().defaultTo('read')
      t.string('purpose', 255).nullable()
      t.timestamp('accessed_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.index(['organization_id', 'office', 'accessed_at'])
      t.index(['entity_type', 'entity_id'])
    })

    this.s.createTable('sss_queue_tickets', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('office', 40).notNullable()
      t.string('service_code', 64).notNullable()
      t.string('ticket_no', 32).notNullable()
      t.uuid('student_id').nullable().references('id').inTable(this.ref('students')).onDelete('SET NULL')
      t.string('status', 32).notNullable().defaultTo('waiting')
      t.uuid('called_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('issued_at', { useTz: true }).notNullable()
      t.timestamp('called_at', { useTz: true }).nullable()
      t.timestamp('completed_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'office', 'ticket_no'])
    })

    this.s.createTable('psych_test_schedules', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('title', 255).notNullable()
      t.string('college_code', 64).nullable()
      t.timestamp('scheduled_at', { useTz: true }).notNullable()
      t.string('venue', 255).nullable()
      t.string('status', 32).notNullable().defaultTo('scheduled')
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('psych_test_results', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('schedule_id').nullable().references('id').inTable(this.ref('psych_test_schedules')).onDelete('SET NULL')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('test_code', 64).notNullable()
      t.boolean('controlled_release').notNullable().defaultTo(true)
      t.boolean('released').notNullable().defaultTo(false)
      t.timestamp('released_at', { useTz: true }).nullable()
      t.uuid('encoded_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('encoded_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('counseling_requests', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('service_request_id').nullable().references('id').inTable(this.ref('sss_service_requests')).onDelete('SET NULL')
      t.string('channel', 32).notNullable().defaultTo('online')
      t.string('status', 40).notNullable().defaultTo('submitted')
      t.uuid('assigned_counselor_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('requested_at', { useTz: true }).notNullable()
      t.timestamp('intake_at', { useTz: true }).nullable()
      t.timestamp('resolved_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('counseling_sessions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('counseling_request_id').notNullable().references('id').inTable(this.ref('counseling_requests')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('counselor_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('session_at', { useTz: true }).notNullable()
      t.string('session_type', 40).notNullable().defaultTo('session')
      t.boolean('is_follow_up').notNullable().defaultTo(false)
      t.string('status', 32).notNullable().defaultTo('completed')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('counseling_case_notes', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('counseling_request_id').notNullable().references('id').inTable(this.ref('counseling_requests')).onDelete('CASCADE')
      t.uuid('session_id').nullable().references('id').inTable(this.ref('counseling_sessions')).onDelete('SET NULL')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('author_user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.text('note_body').notNullable()
      t.string('note_kind', 40).notNullable().defaultTo('case_note')
      t.timestamp('authored_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('guidance_referrals', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('from_request_id').nullable().references('id').inTable(this.ref('counseling_requests')).onDelete('SET NULL')
      t.string('from_office', 40).notNullable().defaultTo('guidance')
      t.string('to_office', 40).notNullable()
      t.string('specialist_type', 80).nullable()
      t.string('status', 32).notNullable().defaultTo('open')
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.text('reason_summary').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('shifting_exam_applications', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('from_program_code', 64).nullable()
      t.string('to_program_code', 64).nullable()
      t.string('status', 40).notNullable().defaultTo('submitted')
      t.jsonb('requirements_json').nullable()
      t.timestamp('exam_scheduled_at', { useTz: true }).nullable()
      t.string('payment_tag', 128).nullable()
      t.boolean('result_released').notNullable().defaultTo(false)
      t.string('endorsement_status', 40).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_records', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('opened_at', { useTz: true }).notNullable()
      t.uuid('opened_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'student_id'])
    })

    this.s.createTable('health_conditions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('health_record_id').notNullable().references('id').inTable(this.ref('health_records')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('condition_code', 64).notNullable()
      t.string('label', 255).notNullable()
      t.boolean('is_chronic').notNullable().defaultTo(false)
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('recorded_at', { useTz: true }).notNullable()
      t.uuid('recorded_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('medical_alerts', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('health_record_id').notNullable().references('id').inTable(this.ref('health_records')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('alert_code', 64).notNullable()
      t.string('severity', 32).notNullable().defaultTo('info')
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_encounters', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('health_record_id').notNullable().references('id').inTable(this.ref('health_records')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('encounter_type', 40).notNullable().defaultTo('outpatient')
      t.boolean('is_emergency').notNullable().defaultTo(false)
      t.uuid('clinician_user_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('encountered_at', { useTz: true }).notNullable()
      t.string('status', 32).notNullable().defaultTo('completed')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_clinical_notes', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('encounter_id').notNullable().references('id').inTable(this.ref('health_encounters')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('author_user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.text('note_body').notNullable()
      t.string('note_kind', 40).notNullable().defaultTo('consultation')
      t.timestamp('authored_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_prescriptions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('encounter_id').notNullable().references('id').inTable(this.ref('health_encounters')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('medication_label', 255).notNullable()
      t.string('instructions', 512).nullable()
      t.uuid('prescribed_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('prescribed_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_referrals', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('encounter_id').nullable().references('id').inTable(this.ref('health_encounters')).onDelete('SET NULL')
      t.string('to_facility', 255).nullable()
      t.string('to_office', 40).nullable()
      t.boolean('is_hospital').notNullable().defaultTo(false)
      t.string('status', 32).notNullable().defaultTo('open')
      t.uuid('created_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('health_clearances', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('clearance_type', 64).notNullable().defaultTo('enrollment')
      t.string('status', 32).notNullable().defaultTo('pending')
      t.string('assessment_context', 64).nullable()
      t.uuid('decided_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('decided_at', { useTz: true }).nullable()
      t.timestamp('valid_until', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'student_id', 'status'])
    })

    this.s.createTable('health_program_participations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('program_code', 64).notNullable()
      t.string('status', 32).notNullable().defaultTo('scheduled')
      t.timestamp('participated_at', { useTz: true }).nullable()
      t.uuid('recorded_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('discipline_complaints', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('respondent_student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.uuid('complainant_user_id').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.string('complainant_role', 40).nullable()
      t.string('status', 40).notNullable().defaultTo('filed')
      t.text('summary').nullable()
      t.timestamp('filed_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('discipline_cases', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('complaint_id').notNullable().references('id').inTable(this.ref('discipline_complaints')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('workflow_status', 40).notNullable().defaultTo('intake')
      t.boolean('sdt_engaged').notNullable().defaultTo(false)
      t.uuid('assigned_to').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('opened_at', { useTz: true }).notNullable()
      t.timestamp('closed_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('discipline_sanctions', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('case_id').notNullable().references('id').inTable(this.ref('discipline_cases')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('sanction_code', 64).notNullable()
      t.string('label', 255).notNullable()
      t.timestamp('effective_from', { useTz: true }).nullable()
      t.timestamp('effective_to', { useTz: true }).nullable()
      t.uuid('recorded_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('student_organizations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('accredited_at', { useTz: true }).nullable()
      t.string('accreditation_certificate_ref', 512).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('org_applications', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_org_id').nullable().references('id').inTable(this.ref('student_organizations')).onDelete('SET NULL')
      t.string('application_type', 32).notNullable().defaultTo('new')
      t.string('proposed_name', 255).notNullable()
      t.string('workflow_status', 40).notNullable().defaultTo('osa')
      t.uuid('submitted_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.jsonb('requirements_json').nullable()
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('decided_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('org_memberships', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_org_id').notNullable().references('id').inTable(this.ref('student_organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('role_title', 80).nullable()
      t.string('status', 32).notNullable().defaultTo('active')
      t.timestamp('joined_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['student_org_id', 'student_id'])
    })

    this.s.createTable('student_id_requests', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('request_type', 32).notNullable().defaultTo('new')
      t.string('status', 40).notNullable().defaultTo('submitted')
      t.string('rfid_ref', 128).nullable()
      t.string('payment_validation_ref', 128).nullable()
      t.string('print_unit_status', 40).nullable()
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('scholarship_programs', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.string('source_type', 32).notNullable().defaultTo('internal')
      t.boolean('is_active').notNullable().defaultTo(true)
      t.jsonb('eligibility_config').nullable()
      t.jsonb('coverage_config').nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('scholarship_applications', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('program_id').notNullable().references('id').inTable(this.ref('scholarship_programs')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('status', 40).notNullable().defaultTo('submitted')
      t.string('income_classification', 64).nullable()
      t.jsonb('eligibility_snapshot').nullable()
      t.jsonb('requirements_json').nullable()
      t.uuid('submitted_by').nullable().references('id').inTable(this.ref('users')).onDelete('SET NULL')
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('decided_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['organization_id', 'status'])
    })

    this.s.createTable('scholarship_evaluations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('application_id').notNullable().references('id').inTable(this.ref('scholarship_applications')).onDelete('CASCADE')
      t.uuid('evaluator_user_id').notNullable().references('id').inTable(this.ref('users')).onDelete('CASCADE')
      t.string('decision', 32).notNullable()
      t.text('notes').nullable()
      t.timestamp('evaluated_at', { useTz: true }).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('student_assistant_applications', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('student_id').notNullable().references('id').inTable(this.ref('students')).onDelete('CASCADE')
      t.string('workflow_status', 40).notNullable().defaultTo('submitted')
      t.jsonb('requirements_json').nullable()
      t.string('deployment_office', 128).nullable()
      t.timestamp('interview_at', { useTz: true }).nullable()
      t.timestamp('submitted_at', { useTz: true }).notNullable()
      t.timestamp('decided_at', { useTz: true }).nullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.alterTable('scholarships', (t) => {
      t.uuid('program_id').nullable()
      t.uuid('application_id').nullable()
      t.uuid('academic_year_id').nullable()
      t.integer('semester').nullable()
      t.string('award_status', 40).nullable()
    })
  }

  async down() {
    this.s.alterTable('scholarships', (t) => {
      t.dropColumn('program_id')
      t.dropColumn('application_id')
      t.dropColumn('academic_year_id')
      t.dropColumn('semester')
      t.dropColumn('award_status')
    })
    const tables = [
      'student_assistant_applications',
      'scholarship_evaluations',
      'scholarship_applications',
      'scholarship_programs',
      'student_id_requests',
      'org_memberships',
      'org_applications',
      'student_organizations',
      'discipline_sanctions',
      'discipline_cases',
      'discipline_complaints',
      'health_program_participations',
      'health_clearances',
      'health_referrals',
      'health_prescriptions',
      'health_clinical_notes',
      'health_encounters',
      'medical_alerts',
      'health_conditions',
      'health_records',
      'shifting_exam_applications',
      'guidance_referrals',
      'counseling_case_notes',
      'counseling_sessions',
      'counseling_requests',
      'psych_test_results',
      'psych_test_schedules',
      'sss_queue_tickets',
      'sss_sensitive_access_logs',
      'sss_notifications_outbox',
      'sss_supporting_documents',
      'sss_service_requests',
      'sss_office_staff_assignments',
    ]
    for (const table of tables) this.s.dropTableIfExists(table)
  }
}
