import { DateTime } from 'luxon'
import Member from '#modules/library/models/member'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'

const MAX_SYNC_BATCH = 500
const MAX_ID_LENGTH = 50
const MAX_NAME_LENGTH = 200

export type ArisStudent = {
  studentId: string
  fullName: string
  email?: string
  department?: string
  enrolled: boolean
  academicStatus?: string
}

export type HrisEmployee = {
  employeeId: string
  fullName: string
  email?: string
  department?: string
  active: boolean
  roleHint?: 'faculty' | 'employee'
}

/**
 * University integration adapters (ARIS / HRIS).
 * LDAP/SSO password and assertion exchange are intentionally not implemented here —
 * accepting credentials without a verified IdP bind is unsafe.
 */
export default class IntegrationService {
  async syncArisStudents(students: ArisStudent[]) {
    this.assertBatchSize(students.length)

    const tid = borrowingTenantId()
    let created = 0
    let updated = 0
    let skipped = 0

    for (const student of students) {
      const studentId = this.sanitizeId(student.studentId)
      const fullName = this.sanitizeName(student.fullName)
      if (!studentId || !fullName) {
        skipped++
        continue
      }

      // Match on library card / student ID only — never OR-match email (prevents cross-account overwrite)
      const existing = await Member.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where('library_card_number', studentId)
        .first()

      if (existing) {
        existing.fullName = fullName
        if (student.email) existing.email = student.email
        existing.department = student.department ?? existing.department
        existing.isEnrolled = student.enrolled
        existing.academicStatus =
          student.academicStatus ?? (student.enrolled ? 'enrolled' : 'not_enrolled')
        existing.memberType = 'student'
        if (!student.enrolled && existing.membershipStatus === 'approved') {
          existing.membershipStatus = 'suspended'
        }
        await existing.save()
        updated++
      } else {
        await Member.create({
          tenantId: tid,
          fullName,
          email: student.email ?? null,
          department: student.department ?? null,
          memberType: 'student',
          membershipStatus: student.enrolled ? 'approved' : 'suspended',
          libraryCardNumber: studentId,
          isBlacklisted: false,
          isEnrolled: student.enrolled,
          academicStatus: student.academicStatus ?? (student.enrolled ? 'enrolled' : 'not_enrolled'),
          approvedAt: student.enrolled ? DateTime.now() : null,
        })
        created++
      }
    }

    return { source: 'ARIS', created, updated, skipped, received: students.length }
  }

  async syncHrisEmployees(employees: HrisEmployee[]) {
    this.assertBatchSize(employees.length)

    const tid = borrowingTenantId()
    let created = 0
    let updated = 0
    let skipped = 0

    for (const employee of employees) {
      const employeeId = this.sanitizeId(employee.employeeId)
      const fullName = this.sanitizeName(employee.fullName)
      if (!employeeId || !fullName) {
        skipped++
        continue
      }

      const existing = await Member.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where('library_card_number', employeeId)
        .first()

      const memberType = employee.roleHint === 'faculty' ? 'faculty' : 'employee'

      if (existing) {
        existing.fullName = fullName
        if (employee.email) existing.email = employee.email
        existing.department = employee.department ?? existing.department
        existing.isEnrolled = employee.active
        existing.academicStatus = employee.active ? 'active' : 'inactive'
        existing.memberType = memberType
        if (!employee.active && existing.membershipStatus === 'approved') {
          existing.membershipStatus = 'suspended'
        }
        await existing.save()
        updated++
      } else {
        await Member.create({
          tenantId: tid,
          fullName,
          email: employee.email ?? null,
          department: employee.department ?? null,
          memberType,
          membershipStatus: employee.active ? 'approved' : 'suspended',
          libraryCardNumber: employeeId,
          isBlacklisted: false,
          isEnrolled: employee.active,
          academicStatus: employee.active ? 'active' : 'inactive',
          approvedAt: employee.active ? DateTime.now() : null,
        })
        created++
      }
    }

    return { source: 'HRIS', created, updated, skipped, received: employees.length }
  }

  status() {
    return {
      aris: {
        configured: Boolean(process.env.ARIS_API_URL),
        mode: 'inbound_sync',
        maxBatch: MAX_SYNC_BATCH,
      },
      hris: {
        configured: Boolean(process.env.HRIS_API_URL),
        mode: 'inbound_sync',
        maxBatch: MAX_SYNC_BATCH,
      },
      ldap: {
        configured: Boolean(process.env.LDAP_URL),
        mode: 'not_enabled',
        note: 'Password binds are disabled until a verified LDAP client is configured.',
      },
      smartCampusSso: {
        configured: Boolean(process.env.SMART_CAMPUS_SSO_URL),
        mode: 'not_enabled',
        note: 'Assertion exchange is disabled until signature verification is implemented.',
      },
    }
  }

  private assertBatchSize(count: number) {
    if (count < 1) {
      throw new BusinessRuleException('Sync payload must include at least one record')
    }
    if (count > MAX_SYNC_BATCH) {
      throw new BusinessRuleException(`Sync batch exceeds maximum of ${MAX_SYNC_BATCH} records`)
    }
  }

  private sanitizeId(value: string) {
    const id = value?.trim() ?? ''
    if (!id || id.length > MAX_ID_LENGTH) return ''
    if (!/^[A-Za-z0-9._\-]+$/.test(id)) return ''
    return id
  }

  private sanitizeName(value: string) {
    const name = value?.trim().replace(/\s+/g, ' ') ?? ''
    if (!name || name.length > MAX_NAME_LENGTH) return ''
    return name
  }
}
