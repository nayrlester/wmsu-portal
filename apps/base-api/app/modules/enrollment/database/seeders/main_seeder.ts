import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { seedUimsDemoData } from '#modules/enrollment/domain/seed_demo_data'
import { seedAcademicSetup } from '#modules/enrollment/domain/seed_academic_setup'
import env from '#start/env'

export default class MainSeeder extends BaseSeeder {
  async run() {
    const orgCode = env.get('PLATFORM_DEFAULT_ORG_CODE') || 'UNI'
    const result = await seedUimsDemoData(orgCode)
    console.log(
      `Seeded UIMS demo: org=${result.orgCode}, roles=${result.roles.length}, items=${result.items}, assets=${result.assets}, users=${result.users.join(',')}`
    )
    const academic = await seedAcademicSetup(orgCode)
    if (academic) {
      console.log(
        `Seeded academic setup: student=${academic.studentNumber}, enrollment=${academic.enrollmentId}, block=${academic.blockGroupCode}, sections=${academic.sectionCodes.join(',')}`
      )
    }
  }
}
