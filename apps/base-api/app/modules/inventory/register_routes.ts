import type { ApplicationService } from '@adonisjs/core/types'

export async function registerInventoryRoutes(_app?: ApplicationService) {
  await import('./routes/index.js')
}

export const inventoryModuleMeta = {
  name: 'inventory',
  prefix: '/api/v1/inventory',
  schema: 'inventory',
  phase: 'phase4-in-process',
}
