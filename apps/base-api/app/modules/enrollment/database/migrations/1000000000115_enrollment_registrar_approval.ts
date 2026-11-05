import { BaseSchema } from '@adonisjs/lucid/schema'
import { t } from '#modules/enrollment/helpers/db_schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable(t('enrollments'), (table) => {
      table.timestamp('registrar_approved_at', { useTz: true }).nullable()
      table.uuid('registrar_approved_by').nullable()
    })
  }

  async down() {
    this.schema.alterTable(t('enrollments'), (table) => {
      table.dropColumn('registrar_approved_at')
      table.dropColumn('registrar_approved_by')
    })
  }
}
