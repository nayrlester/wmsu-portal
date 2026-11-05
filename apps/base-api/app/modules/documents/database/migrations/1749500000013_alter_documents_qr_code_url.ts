import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('documents', (table) => {
      table.text('qr_code_url').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('documents', (table) => {
      table.string('qr_code_url', 500).nullable().alter()
    })
  }
}
