import { BaseSchema } from '@adonisjs/lucid/schema'

const STATUSES = [
  'available',
  'on_loan',
  'reserved',
  'maintenance',
  'lost',
  'withdrawn',
  'damaged',
  'under_repair',
]

export default class extends BaseSchema {
  async up() {
    this.schema.raw('ALTER TABLE library.book_copies DROP CONSTRAINT IF EXISTS book_copies_status_check')
    this.schema.raw(
      `ALTER TABLE library.book_copies ADD CONSTRAINT book_copies_status_check CHECK (status IN (${STATUSES.map((status) => `'${status}'`).join(', ')}))`
    )
  }

  async down() {
    this.schema.raw('ALTER TABLE library.book_copies DROP CONSTRAINT IF EXISTS book_copies_status_check')
    this.schema.raw(
      `ALTER TABLE library.book_copies ADD CONSTRAINT book_copies_status_check CHECK (status IN ('available', 'on_loan', 'reserved', 'maintenance', 'lost', 'withdrawn'))`
    )
  }
}
