import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadJson(candidates: string[]) {
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      // try next
    }
  }
  return null
}

function infraCandidates(file: string) {
  return [
    resolve(process.cwd(), `../../infrastructure/database/${file}`),
    resolve(process.cwd(), `infrastructure/database/${file}`),
    resolve(process.cwd(), `../../../infrastructure/database/${file}`),
  ]
}

export class DbConsolidationService {
  status() {
    const map = loadJson(infraCandidates('source-map.json')) || {
      phase: 'phase3-db-consolidation',
      targetDatabase: 'wmsu_cis',
      sources: [],
    }
    const progress = loadJson(infraCandidates('phase3-progress.json')) || {
      phase: 'phase3a-db-foundation',
      completedModules: [],
      pendingModules: [],
    }
    const completed = progress.completedModules || []
    const pending = progress.pendingModules || []
    const cutover = progress.cutoverModules || []
    const cutoverPending = progress.cutoverPendingModules || []

    return {
      phase: cutover.length
        ? 'phase3c-search-path-cutover'
        : completed.length
          ? 'phase3b-module-restore'
          : 'phase3a-db-foundation',
      targetDatabase: process.env.CIS_DB_DATABASE || map.targetDatabase || 'wmsu_cis',
      schemas: [
        'common',
        'enrollment',
        'records',
        'finance',
        'library',
        'inventory',
        'documents',
        'audit',
      ],
      objectStorage: {
        endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
        documentsBucket: process.env.MINIO_BUCKET_DOCUMENTS || 'wmsu-documents',
        recordsBucket: process.env.MINIO_BUCKET_RECORDS || 'wmsu-records',
        note: 'UDMS/TORMS blobs remain in object storage; Postgres holds metadata/keys only',
      },
      tooling: {
        applyBootstrap: 'pnpm run db:bootstrap',
        consolidateDryRun: 'pnpm run db:consolidate',
        restoreModule: 'pnpm run db:restore-module -- --module=<name>',
        absorbModule: 'pnpm run db:absorb-module -- --module=<name>',
        cutoverModule: 'pnpm run db:cutover-module -- --module=<name>',
        sourceMap: 'infrastructure/database/source-map.json',
        progress: 'infrastructure/database/phase3-progress.json',
      },
      progress: {
        completedModules: completed,
        pendingModules: pending,
        completedCount: completed.length,
        pendingCount: pending.length,
        cutoverModules: cutover,
        cutoverPendingModules: cutoverPending,
        cutoverCount: cutover.length,
        cutoverPendingCount: cutoverPending.length,
      },
      sourceCount: map.sources?.length ?? 0,
      sources: (map.sources || []).map((s: Record<string, unknown>) => ({
        module: s.module,
        targetSchema: s.targetSchema,
        sourceDatabase: s.sourceDatabase,
        sourceSchema: s.sourceSchema,
        engine: s.engine,
      })),
      note: cutover.length
        ? 'Phase 3c in progress — some engines point at wmsu_cis search_path; others still on satellite DBs.'
        : completed.length
          ? 'Phase 3b restore complete — satellites remain engines until search_path cutover.'
          : 'Phase 3a foundation only — satellite DBs remain SoR engines until executed cutover + app search_path absorb.',
      mustNot: [
        'No cross-schema FKs that couple deployables',
        'No module DML outside owned schema',
        'Do not delete satellite DBs until Phase 4',
      ],
    }
  }
}

export const dbConsolidationService = new DbConsolidationService()
