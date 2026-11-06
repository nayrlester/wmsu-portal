import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'
import Student from '#modules/enrollment/models/student'

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function findAlumniRow(organizationId: string, idOrStudent: string) {
  const key = idOrStudent.trim()
  if (!key) return null
  if (UUID_RE.test(key)) {
    return db
      .from(t('alumni_profiles'))
      .where({ organization_id: organizationId, id: key })
      .first()
  }
  return db
    .from(t('alumni_profiles'))
    .where({ organization_id: organizationId, student_number: key })
    .first()
}

function publicAlumniView(row: Record<string, unknown>, staff: boolean) {
  const prefs = (row.visibility_prefs ?? {}) as Record<string, unknown>
  const base = {
    id: row.id,
    studentNumber: row.student_number,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    programCode: row.program_code,
    degreeTitle: row.degree_title,
    graduationYear: row.graduation_year,
    collegeCode: row.college_code,
    location: row.location,
    ownership: {
      academicSoR: 'USiS',
      alumniProfileSoR: 'TORMS',
      note: 'Academic fields are references only; grades are not editable here',
    },
  }
  if (staff) {
    return {
      ...base,
      email: row.email,
      mobile: row.mobile,
      employmentInfo: row.employment_info,
      consentProfileUpdate: row.consent_profile_update,
      consentTracer: row.consent_tracer,
      visibilityPrefs: prefs,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
  return {
    ...base,
    email: prefs.hideEmail ? null : row.email,
    mobile: prefs.hideMobile ? null : row.mobile,
    employmentInfo: prefs.hideEmployment ? null : row.employment_info,
    consentProfileUpdate: row.consent_profile_update,
    consentTracer: row.consent_tracer,
  }
}

export class AlumniProfileService {
  async ensureFromGraduation(input: {
    organizationId: string
    studentNumber: string
    firstName?: string | null
    middleName?: string | null
    lastName?: string | null
    email?: string | null
    mobile?: string | null
    programCode?: string | null
    degreeTitle?: string | null
    graduationYear?: number | null
    collegeCode?: string | null
    location?: string | null
  }) {
    const studentNumber = input.studentNumber.trim()
    if (!studentNumber) throw httpError('studentNumber is required', 422)

    const existing = await db
      .from(t('alumni_profiles'))
      .where({ organization_id: input.organizationId, student_number: studentNumber })
      .first()
    if (existing) return { created: false, profile: existing }

    const now = new Date()
    const [row] = await db
      .table(t('alumni_profiles'))
      .insert({
        organization_id: input.organizationId,
        student_number: studentNumber,
        first_name: input.firstName ?? null,
        middle_name: input.middleName ?? null,
        last_name: input.lastName ?? null,
        email: input.email ?? null,
        mobile: input.mobile ?? null,
        program_code: input.programCode ?? null,
        degree_title: input.degreeTitle ?? null,
        graduation_year: input.graduationYear ?? null,
        college_code: input.collegeCode ?? null,
        location: input.location ?? null,
        consent_profile_update: false,
        consent_tracer: false,
        created_at: now,
        updated_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: null,
      action: 'torms.alumni.created_from_graduation',
      entityType: 'alumni_profile',
      entityId: row.id,
      metadata: { studentNumber },
    })

    return { created: true, profile: row }
  }

  async list(input: {
    organizationId: string
    isStaff: boolean
    studentNumber?: string
    q?: string
    collegeCode?: string
    programCode?: string
    graduationYear?: number
    location?: string
    limit?: number
    offset?: number
  }) {
    if (!input.isStaff) throw httpError('Staff permission required to search alumni directory', 403)

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
    const offset = Math.max(input.offset ?? 0, 0)

    let q = db.from(t('alumni_profiles')).where('organization_id', input.organizationId)
    if (input.studentNumber?.trim()) {
      q = q.andWhere('student_number', input.studentNumber.trim())
    }
    if (input.collegeCode?.trim()) {
      q = q.andWhere('college_code', input.collegeCode.trim())
    }
    if (input.programCode?.trim()) {
      q = q.andWhere('program_code', input.programCode.trim())
    }
    if (input.graduationYear !== undefined && input.graduationYear !== null) {
      q = q.andWhere('graduation_year', input.graduationYear)
    }
    if (input.location?.trim()) {
      q = q.andWhere('location', 'ilike', `%${input.location.trim()}%`)
    }
    if (input.q?.trim()) {
      const term = `%${input.q.trim()}%`
      q = q.andWhere((builder) => {
        builder
          .where('student_number', 'ilike', term)
          .orWhere('first_name', 'ilike', term)
          .orWhere('last_name', 'ilike', term)
          .orWhere('email', 'ilike', term)
      })
    }

    const countRow = await q.clone().count('* as total').first()
    const total = Number((countRow as { total?: number | string } | undefined)?.total ?? 0)
    const rows = await q
      .clone()
      .orderBy('graduation_year', 'desc')
      .orderBy('last_name', 'asc')
      .limit(limit)
      .offset(offset)

    return {
      items: rows.map((r) => publicAlumniView(r, true)),
      meta: { total, limit, offset },
    }
  }

  async standing(studentNumber: string) {
    const number = studentNumber.trim()
    const student = await Student.query().where('student_number', number).first()
    const alumni = await db.from(t('alumni_profiles')).where('student_number', number).first()
    const studentStatus = student?.status ?? null
    const alumniRecord = Boolean(alumni)
    let message = 'No student and no alumni record.'
    if (alumniRecord) {
      message = 'Alumni record exists. This check did not create another one.'
    } else if (studentStatus === 'active') {
      message = 'Active student. No alumni record was created.'
    } else if (studentStatus) {
      message = `Student status ${studentStatus}. No alumni record was created.`
    }
    return {
      studentNumber: number,
      studentStatus,
      alumniRecord,
      message,
    }
  }

  async getByIdOrStudent(input: {
    organizationId: string
    actorUserId: string
    actorEmail?: string | null
    isStaff: boolean
    idOrStudent: string
  }) {
    const row = await findAlumniRow(input.organizationId, input.idOrStudent)
    if (!row) throw httpError('Alumni profile not found', 404)

    const isOwner =
      Boolean(input.actorEmail) &&
      Boolean(row.email) &&
      String(row.email).toLowerCase() === String(input.actorEmail).toLowerCase()

    if (!input.isStaff && !isOwner) {
      throw httpError('Not authorized to view this alumni profile', 403)
    }

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.alumni.viewed',
      entityType: 'alumni_profile',
      entityId: row.id,
      metadata: { staff: input.isStaff },
    })

    return publicAlumniView(row, input.isStaff || isOwner)
  }

  async getOwn(input: { organizationId: string; actorUserId: string; actorEmail: string }) {
    const row = await db
      .from(t('alumni_profiles'))
      .where({ organization_id: input.organizationId })
      .andWhere('email', 'ilike', input.actorEmail.trim())
      .first()
    if (!row) throw httpError('No alumni profile linked to this account email', 404)
    return publicAlumniView(row, true)
  }

  async update(input: {
    organizationId: string
    actorUserId: string
    actorEmail?: string | null
    isStaff: boolean
    idOrStudent: string
    email?: string | null
    mobile?: string | null
    employmentInfo?: string | null
    location?: string | null
    consentProfileUpdate?: boolean
    consentTracer?: boolean
    visibilityPrefs?: Record<string, unknown> | null
  }) {
    const row = await findAlumniRow(input.organizationId, input.idOrStudent)
    if (!row) throw httpError('Alumni profile not found', 404)

    const isOwner =
      Boolean(input.actorEmail) &&
      Boolean(row.email) &&
      String(row.email).toLowerCase() === String(input.actorEmail).toLowerCase()

    if (!input.isStaff && !isOwner) {
      throw httpError('Not authorized to update this alumni profile', 403)
    }

    if (
      !input.isStaff &&
      !row.consent_profile_update &&
      input.consentProfileUpdate !== true &&
      (input.email !== undefined ||
        input.mobile !== undefined ||
        input.employmentInfo !== undefined ||
        input.location !== undefined)
    ) {
      throw httpError(
        'Alumni self-update requires consent_profile_update (RA 10173 / TOR-013)',
        422
      )
    }

    const patch: Record<string, unknown> = { updated_at: new Date() }
    if (input.email !== undefined) patch.email = input.email
    if (input.mobile !== undefined) patch.mobile = input.mobile
    if (input.employmentInfo !== undefined) patch.employment_info = input.employmentInfo
    if (input.location !== undefined) patch.location = input.location
    if (input.consentProfileUpdate !== undefined) {
      patch.consent_profile_update = input.consentProfileUpdate
    }
    if (input.consentTracer !== undefined) patch.consent_tracer = input.consentTracer
    if (input.visibilityPrefs !== undefined) patch.visibility_prefs = input.visibilityPrefs

    const [updated] = await db
      .from(t('alumni_profiles'))
      .where('id', row.id)
      .update(patch)
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.alumni.updated',
      entityType: 'alumni_profile',
      entityId: row.id,
      metadata: {
        fields: Object.keys(patch).filter((k) => k !== 'updated_at'),
        staff: input.isStaff,
      },
    })

    return publicAlumniView(updated, true)
  }
}

export const alumniProfileService = new AlumniProfileService()
