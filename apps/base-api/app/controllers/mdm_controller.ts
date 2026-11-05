import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { writeMdmAudit } from '#services/mdm_audit_service'

function envelope<T>(data: T, message = 'OK') {
  return { success: true, message, data }
}

export default class MdmController {
  async overview({ response }: HttpContext) {
    const [universities, campuses, colleges, departments, offices, years, terms, employees, students, sequences, settings] =
      await Promise.all([
        db.from('mdm_universities').count('* as total').first(),
        db.from('mdm_campuses').count('* as total').first(),
        db.from('mdm_colleges').count('* as total').first(),
        db.from('mdm_departments').count('* as total').first(),
        db.from('mdm_offices').count('* as total').first(),
        db.from('mdm_academic_years').count('* as total').first(),
        db.from('mdm_terms').count('* as total').first(),
        db.from('mdm_employee_refs').count('* as total').first(),
        db.from('mdm_student_identity_refs').count('* as total').first(),
        db.from('mdm_number_sequences').count('* as total').first(),
        db.from('mdm_system_settings').count('* as total').first(),
      ])

    return response.ok(
      envelope({
        ownership: {
          studentAcademicSoR: 'usis',
          studentIdentityProjection: 'platform-mdm',
          organizationSoR: 'platform-mdm',
        },
        counts: {
          universities: Number(universities?.total ?? 0),
          campuses: Number(campuses?.total ?? 0),
          colleges: Number(colleges?.total ?? 0),
          departments: Number(departments?.total ?? 0),
          offices: Number(offices?.total ?? 0),
          academicYears: Number(years?.total ?? 0),
          terms: Number(terms?.total ?? 0),
          employees: Number(employees?.total ?? 0),
          studentIdentityRefs: Number(students?.total ?? 0),
          numberSequences: Number(sequences?.total ?? 0),
          systemSettings: Number(settings?.total ?? 0),
        },
      })
    )
  }

  async listUniversities({ response }: HttpContext) {
    const rows = await db.from('mdm_universities').orderBy('name', 'asc')
    return response.ok(envelope(rows))
  }

  async createUniversity({ request, response, mdmActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        code: vine.string().trim().minLength(2).maxLength(40),
        name: vine.string().trim().minLength(2).maxLength(200),
        legalName: vine.string().trim().maxLength(255).optional(),
        shortName: vine.string().trim().maxLength(80).optional(),
        status: vine.enum(['active', 'inactive'] as const).optional(),
      }),
      data: request.body(),
    })

    const existing = await db.from('mdm_universities').where('code', payload.code).first()
    if (existing) {
      return response.conflict({
        success: false,
        message: 'University code already exists',
        data: { errors: [{ field: 'code', message: 'unique' }] },
      })
    }

    const row = {
      id: randomUUID(),
      code: payload.code,
      name: payload.name,
      legal_name: payload.legalName ?? null,
      short_name: payload.shortName ?? null,
      status: payload.status ?? 'active',
      is_development_seed: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.table('mdm_universities').insert(row)
    await writeMdmAudit({
      actorId: mdmActor?.id,
      action: 'create',
      entityType: 'mdm_universities',
      entityId: row.id,
      afterData: row,
    })
    return response.created(envelope(row, 'University created'))
  }

  async listCampuses({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_campuses').orderBy('name', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async createCampus({ request, response, mdmActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        universityId: vine.string().uuid(),
        code: vine.string().trim().minLength(2).maxLength(40),
        name: vine.string().trim().minLength(2).maxLength(200),
        status: vine.enum(['active', 'inactive'] as const).optional(),
      }),
      data: request.body(),
    })

    const uni = await db.from('mdm_universities').where('id', payload.universityId).first()
    if (!uni) {
      return response.badRequest({
        success: false,
        message: 'University not found',
        data: { errors: [{ field: 'universityId', message: 'invalid' }] },
      })
    }

    const dup = await db
      .from('mdm_campuses')
      .where({ university_id: payload.universityId, code: payload.code })
      .first()
    if (dup) {
      return response.conflict({
        success: false,
        message: 'Campus code already exists for university',
        data: { errors: [{ field: 'code', message: 'unique' }] },
      })
    }

    const row = {
      id: randomUUID(),
      university_id: payload.universityId,
      code: payload.code,
      name: payload.name,
      status: payload.status ?? 'active',
      is_development_seed: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.table('mdm_campuses').insert(row)
    await writeMdmAudit({
      actorId: mdmActor?.id,
      action: 'create',
      entityType: 'mdm_campuses',
      entityId: row.id,
      afterData: row,
    })
    return response.created(envelope(row, 'Campus created'))
  }

  async listColleges({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_colleges').orderBy('name', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async listDepartments({ request, response }: HttpContext) {
    const collegeId = request.input('collegeId')
    const q = db.from('mdm_departments').orderBy('name', 'asc')
    if (collegeId) q.where('college_id', collegeId)
    return response.ok(envelope(await q))
  }

  async listOffices({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_offices').orderBy('name', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async listAcademicYears({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_academic_years').orderBy('starts_on', 'desc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async listTerms({ request, response }: HttpContext) {
    const academicYearId = request.input('academicYearId')
    const q = db.from('mdm_terms').orderBy('sequence_no', 'asc')
    if (academicYearId) q.where('academic_year_id', academicYearId)
    return response.ok(envelope(await q))
  }

  async listEmployees({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_employee_refs').orderBy('full_name', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async listStudentIdentityRefs({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_student_identity_refs').orderBy('student_number', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(
      envelope({
        note: 'Projection only. Official academic student records remain owned by USiS.',
        rows: await q,
      })
    )
  }

  async upsertStudentIdentityRef({ request, response, mdmActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        universityId: vine.string().uuid(),
        studentNumber: vine.string().trim().minLength(1).maxLength(60),
        usisStudentId: vine.string().uuid().optional(),
        displayName: vine.string().trim().minLength(1).maxLength(200),
        email: vine.string().email().optional(),
        status: vine.enum(['active', 'inactive', 'alumni'] as const).optional(),
      }),
      data: request.body(),
    })

    const existing = await db
      .from('mdm_student_identity_refs')
      .where({ university_id: payload.universityId, student_number: payload.studentNumber })
      .first()

    if (existing) {
      const before = { ...existing }
      const after = {
        usis_student_id: payload.usisStudentId ?? existing.usis_student_id,
        display_name: payload.displayName,
        email: payload.email ?? existing.email,
        status: payload.status ?? existing.status,
        projected_at: new Date(),
        updated_at: new Date(),
      }
      await db.from('mdm_student_identity_refs').where('id', existing.id).update(after)
      const row = { ...existing, ...after }
      await writeMdmAudit({
        actorId: mdmActor?.id,
        action: 'update',
        entityType: 'mdm_student_identity_refs',
        entityId: existing.id,
        beforeData: before,
        afterData: row,
      })
      return response.ok(envelope(row, 'Student identity reference updated'))
    }

    const row = {
      id: payload.usisStudentId ?? randomUUID(),
      university_id: payload.universityId,
      student_number: payload.studentNumber,
      usis_student_id: payload.usisStudentId ?? null,
      display_name: payload.displayName,
      email: payload.email ?? null,
      status: payload.status ?? 'active',
      source_system: 'usis',
      projected_at: new Date(),
      is_development_seed: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.table('mdm_student_identity_refs').insert(row)
    await writeMdmAudit({
      actorId: mdmActor?.id,
      action: 'create',
      entityType: 'mdm_student_identity_refs',
      entityId: row.id,
      afterData: row,
    })
    return response.created(envelope(row, 'Student identity reference created'))
  }

  async listCountries({ response }: HttpContext) {
    return response.ok(envelope(await db.from('mdm_countries').orderBy('name', 'asc')))
  }

  async listRegions({ request, response }: HttpContext) {
    const countryId = request.input('countryId')
    const q = db.from('mdm_regions').orderBy('name', 'asc')
    if (countryId) q.where('country_id', countryId)
    return response.ok(envelope(await q))
  }

  async listAddresses({ request, response }: HttpContext) {
    const ownerType = request.input('ownerType')
    const ownerId = request.input('ownerId')
    const q = db.from('mdm_contact_addresses').orderBy('created_at', 'desc')
    if (ownerType) q.where('owner_type', ownerType)
    if (ownerId) q.where('owner_id', ownerId)
    return response.ok(envelope(await q))
  }

  async listSequences({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_number_sequences').orderBy('code', 'asc')
    if (universityId) q.where('university_id', universityId)
    return response.ok(envelope(await q))
  }

  async nextSequenceValue({ params, response, mdmActor }: HttpContext) {
    const trx = await db.transaction()
    try {
      const seq = await trx.from('mdm_number_sequences').where('id', params.id).forUpdate().first()
      if (!seq) {
        await trx.rollback()
        return response.notFound({ success: false, message: 'Sequence not found', data: null })
      }
      const value = Number(seq.next_value)
      const formatted = `${seq.prefix ?? ''}${String(value).padStart(Number(seq.padding), '0')}`
      await trx
        .from('mdm_number_sequences')
        .where('id', seq.id)
        .update({ next_value: value + 1, updated_at: new Date() })
      await trx.commit()
      await writeMdmAudit({
        actorId: mdmActor?.id,
        action: 'sequence_next',
        entityType: 'mdm_number_sequences',
        entityId: seq.id,
        afterData: { value, formatted },
      })
      return response.ok(envelope({ sequenceId: seq.id, value, formatted }))
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async listSettings({ request, response }: HttpContext) {
    const universityId = request.input('universityId')
    const q = db.from('mdm_system_settings').orderBy('key', 'asc')
    if (universityId) q.where('university_id', universityId)
    else q.whereNull('university_id')
    return response.ok(envelope(await q))
  }

  async upsertSetting({ request, response, mdmActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        universityId: vine.string().uuid().optional(),
        key: vine.string().trim().minLength(2).maxLength(120),
        value: vine.any(),
        description: vine.string().trim().maxLength(255).optional(),
      }),
      data: request.body(),
    })

    const existing = await db
      .from('mdm_system_settings')
      .where('key', payload.key)
      .where((builder) => {
        if (payload.universityId) builder.where('university_id', payload.universityId)
        else builder.whereNull('university_id')
      })
      .first()

    if (existing) {
      const before = { ...existing }
      const after = {
        value: payload.value,
        description: payload.description ?? existing.description,
        updated_at: new Date(),
      }
      await db.from('mdm_system_settings').where('id', existing.id).update(after)
      const row = { ...existing, ...after }
      await writeMdmAudit({
        actorId: mdmActor?.id,
        action: 'update',
        entityType: 'mdm_system_settings',
        entityId: existing.id,
        beforeData: before,
        afterData: row,
      })
      return response.ok(envelope(row, 'Setting updated'))
    }

    const row = {
      id: randomUUID(),
      university_id: payload.universityId ?? null,
      key: payload.key,
      value: payload.value,
      description: payload.description ?? null,
      is_development_seed: false,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.table('mdm_system_settings').insert(row)
    await writeMdmAudit({
      actorId: mdmActor?.id,
      action: 'create',
      entityType: 'mdm_system_settings',
      entityId: row.id,
      afterData: row,
    })
    return response.created(envelope(row, 'Setting created'))
  }

  async listAuditLogs({ request, response }: HttpContext) {
    const entityType = request.input('entityType')
    const q = db.from('mdm_audit_logs').orderBy('created_at', 'desc').limit(100)
    if (entityType) q.where('entity_type', entityType)
    return response.ok(envelope(await q))
  }
}
