import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { seedUimsDemoData } from '#modules/records/domain/seed_demo_data'
import env from '#start/env'

export default class extends BaseSeeder {
  async run() {
    const orgCode = env.get('PLATFORM_DEFAULT_ORG_CODE') || 'UNI'
    await seedUimsDemoData(orgCode)
  }
}
