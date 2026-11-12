import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { seedUimsDemoData } from '#modules/enrollment/domain/seed_demo_data'
import { seedAcademicSetup } from '#modules/enrollment/domain/seed_academic_setup'

export default class UsisSeedDemo extends BaseCommand {
  static commandName = 'usis:seed-demo'
  static description = 'Idempotent USiS demo users + academic setup for cross-app UFMS drills'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Organization code' })
  declare org: string | undefined

  async run() {
    const orgCode = this.org?.trim() || env.get('PLATFORM_DEFAULT_ORG_CODE') || 'UNI'
    const result = await seedUimsDemoData(orgCode)
    this.logger.success(`USiS users: ${result.users.join(', ')}`)
    await seedAcademicSetup(orgCode)
    this.logger.success('Academic setup seeded')
  }
}
