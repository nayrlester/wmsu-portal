import { BaseSchema } from '@adonisjs/lucid/schema'
import env from '#start/env'

export default class extends BaseSchema {
  async up() {
    const schema = env.get('DB_SCHEMA') ?? 'uims'
    await this.db.rawQuery(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    await this.db.rawQuery('CREATE SCHEMA IF NOT EXISTS extensions')
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }

  async down() {}
}
