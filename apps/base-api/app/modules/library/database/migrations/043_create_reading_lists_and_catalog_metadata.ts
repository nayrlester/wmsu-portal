import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('books', (table) => {
      table.string('marc_control_number', 50).nullable()
      table.jsonb('marc_fields').nullable()
      table.jsonb('dublin_core').nullable()
      table.integer('metadata_version').notNullable().defaultTo(1)
    })

    this.schema.createTable('catalog_record_versions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.integer('version').notNullable()
      table.jsonb('snapshot').notNullable()
      table.uuid('changed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['book_id', 'version'])
      table.index(['tenant_id', 'book_id'])
    })

    this.schema.createTable('reading_lists', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.uuid('member_id').notNullable().references('id').inTable('members').onDelete('CASCADE')
      table.string('name', 200).notNullable()
      table.text('description').nullable()
      table.boolean('is_public').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['tenant_id', 'member_id'])
    })

    this.schema.createTable('reading_list_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('reading_list_id')
        .notNullable()
        .references('id')
        .inTable('reading_lists')
        .onDelete('CASCADE')
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE')
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['reading_list_id', 'book_id'])
    })

    this.schema.createTable('digital_repository_items', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('title', 500).notNullable()
      table
        .enum('resource_type', [
          'thesis',
          'dissertation',
          'faculty_publication',
          'research_report',
          'multimedia',
          'conference_paper',
          'institutional_document',
          'ebook',
          'other',
        ])
        .notNullable()
        .defaultTo('other')
      table.string('authors', 500).nullable()
      table.string('subjects', 500).nullable()
      table.integer('publication_year').nullable()
      table.text('abstract').nullable()
      table.string('access_level', 30).notNullable().defaultTo('public')
      table.string('file_url', 1000).nullable()
      table.string('platform_document_id', 100).nullable()
      table.integer('download_count').notNullable().defaultTo(0)
      table.integer('view_count').notNullable().defaultTo(0)
      table.jsonb('metadata').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.index(['tenant_id', 'resource_type'])
      table.index(['tenant_id', 'access_level'])
    })

    this.schema.createTable('electronic_resources', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('title', 500).notNullable()
      table
        .enum('resource_kind', [
          'ebook',
          'ejournal',
          'database',
          'open_access',
          'multimedia',
          'other',
        ])
        .notNullable()
        .defaultTo('database')
      table.string('provider', 200).nullable()
      table.string('access_url', 1000).nullable()
      table.string('auth_method', 50).notNullable().defaultTo('sso')
      table.jsonb('ip_ranges').nullable()
      table.jsonb('metadata').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('view_count').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['tenant_id', 'resource_kind'])
    })

    this.schema.createTable('library_queue_tickets', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('ticket_number', 20).notNullable()
      table.string('service_type', 50).notNullable().defaultTo('circulation')
      table.string('status', 30).notNullable().defaultTo('waiting')
      table.uuid('member_id').nullable().references('id').inTable('members').onDelete('SET NULL')
      table.string('patron_name', 200).nullable()
      table.timestamp('called_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'ticket_number'])
      table.index(['tenant_id', 'status'])
    })

    this.schema.createTable('kiosk_devices', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('name', 200).notNullable()
      table.string('device_code', 100).notNullable()
      table.string('location', 200).nullable()
      table.boolean('is_enabled').notNullable().defaultTo(true)
      table.integer('idle_timeout_seconds').notNullable().defaultTo(60)
      table.jsonb('config').nullable()
      table.timestamp('last_seen_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'device_code'])
    })

    this.schema.createTable('rfid_tags', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('tag_uid', 100).notNullable()
      table.uuid('copy_id').nullable().references('id').inTable('book_copies').onDelete('SET NULL')
      table.string('status', 30).notNullable().defaultTo('active')
      table.timestamp('registered_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'tag_uid'])
      table.index(['tenant_id', 'copy_id'])
    })

    this.schema.createTable('shelf_locations', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('code', 50).notNullable()
      table.string('label', 200).notNullable()
      table.string('floor', 50).nullable()
      table.string('aisle', 50).nullable()
      table.string('shelf', 50).nullable()
      table.jsonb('map_coordinates').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['tenant_id', 'code'])
    })
  }

  async down() {
    this.schema.dropTable('shelf_locations')
    this.schema.dropTable('rfid_tags')
    this.schema.dropTable('kiosk_devices')
    this.schema.dropTable('library_queue_tickets')
    this.schema.dropTable('electronic_resources')
    this.schema.dropTable('digital_repository_items')
    this.schema.dropTable('reading_list_items')
    this.schema.dropTable('reading_lists')
    this.schema.dropTable('catalog_record_versions')

    this.schema.alterTable('books', (table) => {
      table.dropColumn('marc_control_number')
      table.dropColumn('marc_fields')
      table.dropColumn('dublin_core')
      table.dropColumn('metadata_version')
    })
  }
}
