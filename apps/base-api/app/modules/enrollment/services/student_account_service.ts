import Student from '#modules/enrollment/models/student'
import env from '#start/env'
import { IdentityProvisionClient } from '#modules/enrollment/services/platform/identity_provision_client'

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
    birthDate?: Date | null
    programId?: string | null
    applicantId?: string | null
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
      birthDate: data.birthDate,
      programId: data.programId,
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
    } catch (error) {
      await student.delete()
      throw error
    }

    return student
  }
}
