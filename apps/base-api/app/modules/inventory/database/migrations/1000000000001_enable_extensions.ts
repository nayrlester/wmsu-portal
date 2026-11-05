import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE SCHEMA IF NOT EXISTS uims')
    // Supabase installs extensions under the `extensions` schema.
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions')
  }

  async down() {
    // Leave shared extensions in place on shared Supabase databases.
  }
}
