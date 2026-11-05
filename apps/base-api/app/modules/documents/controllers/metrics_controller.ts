import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { getMetricsRegistry } from '#modules/documents/services/metrics_service'

/**
 * Prometheus metrics endpoint.
 * - Development / test: open (local scrapers).
 * - Production: requires METRICS_TOKEN via Authorization: Bearer <token>,
 *   or returns 404 when METRICS_TOKEN is unset (not publicly scrapeable).
 */
export default class MetricsController {
  async index({ request, response }: HttpContext) {
    const token = env.get('METRICS_TOKEN')
    const isProd = env.get('NODE_ENV') === 'production'

    if (isProd) {
      if (!token) {
        return response.notFound({ message: 'Not found' })
      }
      const auth = request.header('authorization')
      if (auth !== `Bearer ${token}`) {
        return response.unauthorized({ message: 'Invalid metrics token' })
      }
    }

    const registry = getMetricsRegistry()
    const metrics = await registry.metrics()
    return response.header('Content-Type', registry.contentType).send(metrics)
  }
}
