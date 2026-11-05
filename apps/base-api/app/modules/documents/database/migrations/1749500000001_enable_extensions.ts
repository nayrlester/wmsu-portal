import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
      await db.rawQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('DROP EXTENSION IF EXISTS "uuid-ossp"')
      await db.rawQuery('DROP EXTENSION IF EXISTS "pgcrypto"')
    })
  }
}
