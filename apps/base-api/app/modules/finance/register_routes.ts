import type { ApplicationService } from '@adonisjs/core/types'

export async function registerFinanceRoutes(_app?: ApplicationService) {
  await import('./routes/index.js')
}

export const financeModuleMeta = {
  name: 'finance',
  prefix: '/api/v1/finance',
  schema: 'finance',
  phase: 'phase4-in-process',
}
