import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)

    await this.db.rawQuery(`
      ALTER TABLE books ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    `)
    await this.db.rawQuery(`
      ALTER TABLE members ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    `)
    await this.db.rawQuery(`
      ALTER TABLE borrowings ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_books_search_vector ON books USING GIN(search_vector)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_members_search_vector ON members USING GIN(search_vector)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_borrowings_search_vector ON borrowings USING GIN(search_vector)
    `)

    await this.db.rawQuery(`
      CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.subtitle, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.author_names, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.genre, '')), 'C') ||
          setweight(to_tsvector('simple', coalesce(NEW.isbn13, '') || ' ' || coalesce(NEW.isbn10, '') || ' ' || coalesce(NEW.catalog_barcode, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.search_text, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await this.db.rawQuery(`
      DROP TRIGGER IF EXISTS trg_books_search_vector ON books
    `)
    await this.db.rawQuery(`
      CREATE TRIGGER trg_books_search_vector
        BEFORE INSERT OR UPDATE OF title, subtitle, author_names, genre, isbn13, isbn10, catalog_barcode, search_text, description
        ON books FOR EACH ROW EXECUTE FUNCTION books_search_vector_update()
    `)

    await this.db.rawQuery(`
      CREATE OR REPLACE FUNCTION members_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW.library_card_number, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.department, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(NEW.search_text, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await this.db.rawQuery(`
      DROP TRIGGER IF EXISTS trg_members_search_vector ON members
    `)
    await this.db.rawQuery(`
      CREATE TRIGGER trg_members_search_vector
        BEFORE INSERT OR UPDATE OF full_name, email, library_card_number, department, search_text
        ON members FOR EACH ROW EXECUTE FUNCTION members_search_vector_update()
    `)

    await this.db.rawQuery(`
      CREATE OR REPLACE FUNCTION borrowings_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.transaction_number, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await this.db.rawQuery(`
      DROP TRIGGER IF EXISTS trg_borrowings_search_vector ON borrowings
    `)
    await this.db.rawQuery(`
      CREATE TRIGGER trg_borrowings_search_vector
        BEFORE INSERT OR UPDATE OF transaction_number, notes
        ON borrowings FOR EACH ROW EXECUTE FUNCTION borrowings_search_vector_update()
    `)

    await this.db.rawQuery(`
      UPDATE books SET title = title WHERE search_vector IS NULL
    `)
    await this.db.rawQuery(`
      UPDATE members SET full_name = full_name WHERE search_vector IS NULL
    `)
    await this.db.rawQuery(`
      UPDATE borrowings SET transaction_number = transaction_number WHERE search_vector IS NULL
    `)
  }

  async down() {
    await this.db.rawQuery(`DROP TRIGGER IF EXISTS trg_borrowings_search_vector ON borrowings`)
    await this.db.rawQuery(`DROP TRIGGER IF EXISTS trg_members_search_vector ON members`)
    await this.db.rawQuery(`DROP TRIGGER IF EXISTS trg_books_search_vector ON books`)
    await this.db.rawQuery(`DROP FUNCTION IF EXISTS borrowings_search_vector_update()`)
    await this.db.rawQuery(`DROP FUNCTION IF EXISTS members_search_vector_update()`)
    await this.db.rawQuery(`DROP FUNCTION IF EXISTS books_search_vector_update()`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_borrowings_search_vector`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_members_search_vector`)
    await this.db.rawQuery(`DROP INDEX IF EXISTS idx_books_search_vector`)
    await this.db.rawQuery(`ALTER TABLE borrowings DROP COLUMN IF EXISTS search_vector`)
    await this.db.rawQuery(`ALTER TABLE members DROP COLUMN IF EXISTS search_vector`)
    await this.db.rawQuery(`ALTER TABLE books DROP COLUMN IF EXISTS search_vector`)
  }
}
