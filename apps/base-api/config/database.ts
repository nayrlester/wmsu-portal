import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import env from '#start/env'

const searchPath = 'common,enrollment,finance,records,library,documents,inventory,audit,public,extensions'

const useSsl = env.get('DB_SSL') === true

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      },
      searchPath: searchPath.split(','),
      pool: {
        afterCreate: (
          conn: { query: (sql: string, cb: (err: Error | null) => void) => void },
          done: (err: Error | null, conn: unknown) => void
        ) => {
          conn.query(`SET search_path TO ${searchPath}`, (err) => done(err, conn))
        },
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
        tableName: 'adonis_schema',
      },
      seeders: {
        paths: ['database/seeders'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
