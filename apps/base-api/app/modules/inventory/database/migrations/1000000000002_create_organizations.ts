import { UimsSchema, uimsTable } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.createTable('organizations', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.string('name', 255).notNullable()
      t.string('code', 32).notNullable().unique()
      t.string('platform_organization_id', 64).nullable().unique()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.s.createTable('campuses', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.string('name', 255).notNullable()
      t.string('code', 32).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('offices', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('campus_id').notNullable().references('id').inTable(uimsTable('campuses')).onDelete('CASCADE')
      t.string('name', 255).notNullable()
      t.string('code', 32).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('departments', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(uimsTable('organizations')).onDelete('CASCADE')
      t.uuid('campus_id').notNullable().references('id').inTable(uimsTable('campuses')).onDelete('CASCADE')
      t.uuid('office_id').nullable().references('id').inTable(uimsTable('offices')).onDelete('SET NULL')
      t.string('name', 255).notNullable()
      t.string('code', 32).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })
  }

  async down() {
    this.s.dropTableIfExists('departments')
    this.s.dropTableIfExists('offices')
    this.s.dropTableIfExists('campuses')
    this.s.dropTableIfExists('organizations')
  }
}
