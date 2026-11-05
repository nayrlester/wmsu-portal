import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
  }

  async down() {
    await this.db.rawQuery('DROP EXTENSION IF EXISTS "pgcrypto"')
  }
}
