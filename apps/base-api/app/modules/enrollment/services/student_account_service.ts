import { DateTime } from 'luxon'
import Student from '#modules/enrollment/models/student'
import env from '#start/env'
import { IdentityProvisionClient } from '#modules/enrollment/services/platform/identity_provision_client'

function toBirthDateTime(
  value: DateTime | Date | string | null | undefined
): DateTime | null {
  if (value == null || value === '') return null
  if (DateTime.isDateTime(value)) return value.isValid ? value : null
  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value)
    return dt.isValid ? dt : null
  }
  const fromIso = DateTime.fromISO(String(value))
  if (fromIso.isValid) return fromIso
  const fromSql = DateTime.fromSQL(String(value))
  return fromSql.isValid ? fromSql : null
}

export class StudentAccountService {
  private provisionClient: IdentityProvisionClient

  constructor() {
    this.provisionClient = new IdentityProvisionClient()
  }

  async createStudent(data: {
    organizationId: string
    studentNumber: string
    firstName: string
    middleName?: string | null
    lastName: string
    mobile?: string | null
    birthDate?: DateTime | Date | string | null
    programId?: string | null
    applicantId?: string | null
    classification?: string | null
    mdmCampusId?: string | null
  }): Promise<Student> {
    const emailDomain = env.get('STUDENT_EMAIL_DOMAIN') ?? 'demo.edu.ph'
    const email = `${data.studentNumber}@${emailDomain}`

    const student = await Student.create({
      organizationId: data.organizationId,
      studentNumber: data.studentNumber,
      applicantId: data.applicantId,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      email,
      mobile: data.mobile,
      birthDate: toBirthDateTime(data.birthDate),
      programId: data.programId,
      classification: data.classification ?? null,
      mdmCampusId: data.mdmCampusId ?? null,
      status: 'active',
    })

    try {
      const result = await this.provisionClient.provisionStudent({
        studentNumber: data.studentNumber,
        email,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        mobile: data.mobile,
      })
      student.platformUserId = result.userId
      await student.save()
    } catch {
      // Local/dev CIS can proceed without Identity when the provision key is mismatched or Identity is down.
    }

    return student
  }
}
