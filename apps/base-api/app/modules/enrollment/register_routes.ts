import type { ApplicationService } from '@adonisjs/core/types'

export async function registerEnrollmentRoutes(_app?: ApplicationService) {
  await import('./routes/index.js')
}

export const enrollmentModuleMeta = {
  name: 'enrollment',
  prefix: '/api/v1/enrollment',
  schema: 'enrollment',
  phase: 'phase4-in-process',
}
