import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('borrowings', (table) => {
      table.integer('renewal_count').notNullable().defaultTo(0)
      table.integer('max_renewals').notNullable().defaultTo(2)
    })

    this.schema.alterTable('members', (table) => {
      table.boolean('is_blacklisted').notNullable().defaultTo(false)
      table.boolean('is_enrolled').notNullable().defaultTo(true)
      table.string('academic_status', 50).nullable()
    })

    // Widen member_type safely without failing if enum/check naming differs by PG/Knex version
    this.defer(async (db) => {
      await db.rawQuery(`
        DO $$
        DECLARE
          enum_name text;
        BEGIN
          SELECT t.typname INTO enum_name
          FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_type t ON t.oid = a.atttypid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'members'
            AND a.attname = 'member_type'
            AND t.typtype = 'e'
          LIMIT 1;

          IF enum_name IS NOT NULL THEN
            EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_name, 'alumni');
          ELSE
            ALTER TABLE members DROP CONSTRAINT IF EXISTS members_member_type_check;
            BEGIN
              ALTER TABLE members
                ADD CONSTRAINT members_member_type_check
                CHECK (member_type IN ('student','faculty','employee','researcher','guest','alumni'));
            EXCEPTION WHEN duplicate_object THEN
              NULL;
            END;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Do not fail the migration for type widening; columns above still apply.
          RAISE NOTICE 'ULMIS alumni member_type widen skipped: %', SQLERRM;
        END $$;
      `)
    })
  }

  async down() {
    this.schema.alterTable('borrowings', (table) => {
      table.dropColumn('renewal_count')
      table.dropColumn('max_renewals')
    })

    this.schema.alterTable('members', (table) => {
      table.dropColumn('is_blacklisted')
      table.dropColumn('is_enrolled')
      table.dropColumn('academic_status')
    })
  }
}
