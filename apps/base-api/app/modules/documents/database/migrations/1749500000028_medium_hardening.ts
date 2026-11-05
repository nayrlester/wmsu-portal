import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * MEDIUM hardening columns (audit hash-chain + SLA remind/escalate).
 * Idempotent — safe to re-run after pooler lock-release failures on Supabase :6543.
 */
export default class extends BaseSchema {
  async up() {
    const hasPrevHash = await this.schema.hasColumn('audit_logs', 'prev_hash')
    const hasEntryHash = await this.schema.hasColumn('audit_logs', 'entry_hash')
    if (!hasPrevHash || !hasEntryHash) {
      this.schema.alterTable('audit_logs', (table) => {
        if (!hasPrevHash) table.string('prev_hash', 64).nullable()
        if (!hasEntryHash) table.string('entry_hash', 64).nullable().index()
      })
    }

    const hasReminder = await this.schema.hasColumn('document_sla_tracking', 'reminder_sent_at')
    const hasEscalated = await this.schema.hasColumn('document_sla_tracking', 'escalated_at')
    if (!hasReminder || !hasEscalated) {
      this.schema.alterTable('document_sla_tracking', (table) => {
        if (!hasReminder) table.timestamp('reminder_sent_at', { useTz: true }).nullable()
        if (!hasEscalated) table.timestamp('escalated_at', { useTz: true }).nullable()
      })
    }
  }

  async down() {
    if (await this.schema.hasColumn('audit_logs', 'prev_hash')) {
      this.schema.alterTable('audit_logs', (table) => {
        table.dropColumn('prev_hash')
      })
    }
    if (await this.schema.hasColumn('audit_logs', 'entry_hash')) {
      this.schema.alterTable('audit_logs', (table) => {
        table.dropColumn('entry_hash')
      })
    }
    if (await this.schema.hasColumn('document_sla_tracking', 'reminder_sent_at')) {
      this.schema.alterTable('document_sla_tracking', (table) => {
        table.dropColumn('reminder_sent_at')
      })
    }
    if (await this.schema.hasColumn('document_sla_tracking', 'escalated_at')) {
      this.schema.alterTable('document_sla_tracking', (table) => {
        table.dropColumn('escalated_at')
      })
    }
  }
}
