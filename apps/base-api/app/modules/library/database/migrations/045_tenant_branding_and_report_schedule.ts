import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tenants', (table) => {
      table.string('logo_url', 500).nullable()
      table.string('primary_color', 32).nullable()
      table.string('report_schedule_cron', 64).nullable()
      table.text('report_schedule_emails').nullable()
      table.boolean('report_schedule_enabled').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('tenants', (table) => {
      table.dropColumn('logo_url')
      table.dropColumn('primary_color')
      table.dropColumn('report_schedule_cron')
      table.dropColumn('report_schedule_emails')
      table.dropColumn('report_schedule_enabled')
    })
  }
}
