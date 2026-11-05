import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('notifications', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('type', 100).notNullable()
      table.string('title', 500).notNullable()
      table.text('body').nullable()
      table.jsonb('data').nullable()
      table.string('channel', 30).notNullable().defaultTo('in_app')
      table.boolean('is_read').notNullable().defaultTo(false)
      table.timestamp('read_at', { useTz: true }).nullable()
      table.timestamp('sent_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['user_id', 'is_read'])
      table.index(['tenant_id'])
    })

    this.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL')
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('action', 50).notNullable()
      table.string('entity_type', 100).notNullable()
      table.uuid('entity_id').nullable()
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 500).nullable()
      table.jsonb('old_values').nullable()
      table.jsonb('new_values').nullable()
      table.jsonb('metadata').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id'])
      table.index(['user_id'])
      table.index(['entity_type', 'entity_id'])
      table.index(['created_at'])
    })

    this.schema.createTable('sla_rules', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.uuid('document_type_id').nullable().references('id').inTable('document_types').onDelete('CASCADE')
      table.integer('review_deadline_hours').nullable()
      table.integer('approval_deadline_hours').nullable()
      table.integer('completion_deadline_hours').nullable()
      table.jsonb('escalation_rules').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['tenant_id'])
    })

    this.schema.createTable('document_sla_tracking', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('sla_rule_id').notNullable().references('id').inTable('sla_rules').onDelete('CASCADE')
      table.timestamp('review_due_at', { useTz: true }).nullable()
      table.timestamp('approval_due_at', { useTz: true }).nullable()
      table.timestamp('completion_due_at', { useTz: true }).nullable()
      table.boolean('is_breached').notNullable().defaultTo(false)
      table.timestamp('breached_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['document_id'])
    })

    this.schema.createTable('api_keys', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('created_by_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.string('name', 255).notNullable()
      table.string('key_prefix', 20).notNullable()
      table.string('key_hash', 255).notNullable()
      table.jsonb('scopes').nullable()
      table.timestamp('last_used_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['tenant_id'])
      table.index(['key_prefix'])
    })

    this.schema.createTable('signatures', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE')
      table.uuid('signer_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.string('signature_type', 30).notNullable()
      table.text('signature_data').notNullable()
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 500).nullable()
      table.integer('sign_order').notNullable().defaultTo(1)
      table.timestamp('signed_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['document_id'])
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.dropTable('signatures')
    this.schema.dropTable('api_keys')
    this.schema.dropTable('document_sla_tracking')
    this.schema.dropTable('sla_rules')
    this.schema.dropTable('audit_logs')
    this.schema.dropTable('notifications')
  }
}
