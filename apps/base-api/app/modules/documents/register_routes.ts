import type { ApplicationService } from '@adonisjs/core/types'

export async function registerDocumentsRoutes(_app?: ApplicationService) {
  await import('./routes/routes/index.js')
}

export const documentsModuleMeta = {
  name: 'documents',
  prefix: '/api/v1/documents',
  schema: 'documents',
  phase: 'phase4-in-process',
}
