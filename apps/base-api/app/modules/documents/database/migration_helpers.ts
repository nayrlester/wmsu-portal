/**
 * Shared Knex/Lucid migration helpers for consistent schema conventions.
 */

import type { CreateTableBuilder } from '@adonisjs/lucid/types/schema'

export function auditTimestamps(table: CreateTableBuilder) {
  table.timestamp('created_at', { useTz: true }).notNullable()
  table.timestamp('updated_at', { useTz: true }).nullable()
}

export function softDeleteColumn(table: CreateTableBuilder) {
  table.timestamp('deleted_at', { useTz: true }).nullable()
}

export function actorAuditColumns(table: CreateTableBuilder, usersTable = 'users') {
  table
    .uuid('created_by_id')
    .nullable()
    .references('id')
    .inTable(usersTable)
    .onDelete('SET NULL')
  table
    .uuid('updated_by_id')
    .nullable()
    .references('id')
    .inTable(usersTable)
    .onDelete('SET NULL')
}

export function uuidPrimaryKey(table: CreateTableBuilder, raw: ReturnType<CreateTableBuilder['client']['raw']>) {
  table.uuid('id').primary().defaultTo(raw)
}

export function tenantForeignKey(table: CreateTableBuilder, tenantsTable = 'tenants') {
  table.uuid('tenant_id').notNullable().references('id').inTable(tenantsTable).onDelete('CASCADE')
}

export function tenantScopedIndex(table: CreateTableBuilder, extraColumns: string[] = []) {
  table.index(['tenant_id', ...extraColumns])
}
