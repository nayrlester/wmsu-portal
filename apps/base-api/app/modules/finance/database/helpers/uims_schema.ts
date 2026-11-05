import { BaseSchema } from '@adonisjs/lucid/schema'
import env from '#start/env'

export function uimsSchema() {
  return env.get('DB_SCHEMA') ?? 'finance'
}

export function uimsTable(table: string) {
  return `${uimsSchema()}.${table}`
}

export abstract class UimsSchema extends BaseSchema {
  protected get schemaName() {
    return uimsSchema()
  }

  protected get s() {
    return this.schema.withSchema(this.schemaName)
  }
}
