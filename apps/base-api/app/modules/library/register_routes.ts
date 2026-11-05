import type { ApplicationService } from '@adonisjs/core/types'

export async function registerLibraryRoutes(_app?: ApplicationService) {
  await import('./routes/routes/v1/index.js')
}

export const libraryModuleMeta = {
  name: 'library',
  prefix: '/api/v1/library',
  schema: 'library',
  phase: 'phase4-in-process',
}
