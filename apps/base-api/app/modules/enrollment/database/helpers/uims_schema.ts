import { BaseSchema } from '@adonisjs/lucid/schema'

export function uimsSchema() {
  return 'enrollment'
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
