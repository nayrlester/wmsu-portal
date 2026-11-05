import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  private get s() {
    return this.schema.withSchema('enrollment')
  }

  async up() {
    this.s.alterTable('usis_admission_events', (t) => {
      t.string('delivery_mode', 16).notNullable().defaultTo('onsite')
      t.decimal('pass_score', 8, 2).nullable()
      t.integer('duration_minutes').nullable()
      t.timestamp('window_opens_at', { useTz: true }).nullable()
      t.timestamp('window_closes_at', { useTz: true }).nullable()
      t.jsonb('questions_json').notNullable().defaultTo(this.raw("'[]'::jsonb"))
    })

    this.s.alterTable('usis_admission_event_results', (t) => {
      t.jsonb('answers_json').nullable()
      t.timestamp('started_at', { useTz: true }).nullable()
      t.timestamp('submitted_at', { useTz: true }).nullable()
      t.integer('attempt_count').notNullable().defaultTo(0)
      t.decimal('max_score', 8, 2).nullable()
      t.decimal('percent_score', 8, 2).nullable()
    })
  }

  async down() {
    this.s.alterTable('usis_admission_event_results', (t) => {
      t.dropColumn('answers_json')
      t.dropColumn('started_at')
      t.dropColumn('submitted_at')
      t.dropColumn('attempt_count')
      t.dropColumn('max_score')
      t.dropColumn('percent_score')
    })

    this.s.alterTable('usis_admission_events', (t) => {
      t.dropColumn('delivery_mode')
      t.dropColumn('pass_score')
      t.dropColumn('duration_minutes')
      t.dropColumn('window_opens_at')
      t.dropColumn('window_closes_at')
      t.dropColumn('questions_json')
    })
  }
}
