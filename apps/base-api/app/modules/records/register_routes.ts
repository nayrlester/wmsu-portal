import type { ApplicationService } from '@adonisjs/core/types'

export async function registerRecordsRoutes(_app?: ApplicationService) {
  await import('./routes/index.js')
}

export const recordsModuleMeta = {
  name: 'records',
  prefix: '/api/v1/records',
  schema: 'records',
  phase: 'phase4-in-process',
}
