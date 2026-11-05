import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { recordHttpRequest } from '#modules/documents/services/metrics_service'

export default class MetricsMiddleware {
  async handle({ request, response, route }: HttpContext, next: NextFn) {
    const start = process.hrtime.bigint()

    await next()

    const elapsedNs = process.hrtime.bigint() - start
    const durationSec = Number(elapsedNs) / 1e9
    const routePattern = route?.pattern ?? request.url()
    recordHttpRequest(request.method(), routePattern, response.getStatus(), durationSec)
  }
}
