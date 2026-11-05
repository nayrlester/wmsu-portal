import { UimsSchema } from '../helpers/uims_schema.js'

export default class extends UimsSchema {
  async up() {
    this.s.alterTable('transcript_issuances', (t) => {
      t.jsonb('document_payload_json').notNullable().defaultTo(this.raw(`'{}'::jsonb`))
      t.string('template_ref', 255).nullable()
      t.string('compliance_status', 64).notNullable().defaultTo('structured_only')
      t.string('issuance_status', 32).notNullable().defaultTo('draft')
      t.string('signature_status', 64).notNullable().defaultTo('not_applied')
      t.index(['organization_id', 'request_id'])
      t.index(['organization_id', 'issuance_status'])
    })

    this.s.alterTable('certification_issuances', (t) => {
      t.jsonb('document_payload_json').notNullable().defaultTo(this.raw(`'{}'::jsonb`))
      t.string('template_ref', 255).nullable()
      t.string('compliance_status', 64).notNullable().defaultTo('structured_only')
      t.string('issuance_status', 32).notNullable().defaultTo('draft')
      t.string('signature_status', 64).notNullable().defaultTo('not_applied')
      t.index(['organization_id', 'request_id'])
      t.index(['organization_id', 'issuance_status'])
    })
  }

  async down() {
    this.s.alterTable('certification_issuances', (t) => {
      t.dropIndex(['organization_id', 'issuance_status'])
      t.dropIndex(['organization_id', 'request_id'])
      t.dropColumn('signature_status')
      t.dropColumn('issuance_status')
      t.dropColumn('compliance_status')
      t.dropColumn('template_ref')
      t.dropColumn('document_payload_json')
    })

    this.s.alterTable('transcript_issuances', (t) => {
      t.dropIndex(['organization_id', 'issuance_status'])
      t.dropIndex(['organization_id', 'request_id'])
      t.dropColumn('signature_status')
      t.dropColumn('issuance_status')
      t.dropColumn('compliance_status')
      t.dropColumn('template_ref')
      t.dropColumn('document_payload_json')
    })
  }
}
