import db from '@adonisjs/lucid/services/db'
import DocumentsMainSeeder from '#modules/documents/database/seeders/main_seeder'

async function truncateDocumentsSchema(): Promise<void> {
  await db.rawQuery(`
    DO $$
    DECLARE
      tables text;
    BEGIN
      SELECT string_agg(quote_ident(tablename), ', ')
      INTO tables
      FROM pg_tables
      WHERE schemaname = 'documents';

      IF tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE documents.' || replace(tables, ', ', ', documents.') || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `)
}

export async function prepareUdmsTestDatabase(): Promise<void> {
  await truncateDocumentsSchema()
  await new DocumentsMainSeeder().run()
}

export const prepareTestDatabase = prepareUdmsTestDatabase
