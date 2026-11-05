import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  private ref(table: string) {
    return `${this.schemaName}.${table}`
  }

  async up() {
    this.s.createTable('usis_room_categories', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 128).notNullable()
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_buildings', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.string('code', 32).notNullable()
      t.string('name', 255).notNullable()
      t.string('campus_code', 64).nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })

    this.s.createTable('usis_rooms', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('organization_id').notNullable().references('id').inTable(this.ref('organizations')).onDelete('CASCADE')
      t.uuid('building_id').notNullable().references('id').inTable(this.ref('usis_buildings')).onDelete('CASCADE')
      t.uuid('category_id').nullable().references('id').inTable(this.ref('usis_room_categories')).onDelete('SET NULL')
      t.string('code', 64).notNullable()
      t.string('name', 255).notNullable()
      t.integer('capacity').nullable()
      t.boolean('is_active').notNullable().defaultTo(true)
      t.timestamp('created_at', { useTz: true }).notNullable()
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.unique(['organization_id', 'code'])
    })
  }

  async down() {
    this.s.dropTable('usis_rooms')
    this.s.dropTable('usis_buildings')
    this.s.dropTable('usis_room_categories')
  }
}
