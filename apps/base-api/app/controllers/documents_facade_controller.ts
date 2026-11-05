import type { HttpContext } from '@adonisjs/core/http'
import { documentsFacadeService } from '../modules/documents/services/documents_facade_service.js'

function forwardHeaders(ctx: HttpContext): Record<string, string | undefined> {
  return {
    authorization: ctx.request.header('authorization') ?? undefined,
    'content-type': ctx.request.header('content-type') ?? 'application/json',
    'x-service-api-key': ctx.request.header('x-service-api-key') ?? undefined,
    'idempotency-key': ctx.request.header('idempotency-key') ?? undefined,
    accept: ctx.request.header('accept') ?? undefined,
  }
}

function requestBody(ctx: HttpContext): Buffer | null {
  if (['GET', 'HEAD'].includes(ctx.request.method().toUpperCase())) return null
  const json = ctx.request.body()
  if (json && typeof json === 'object' && Object.keys(json as object).length > 0) {
    return Buffer.from(JSON.stringify(json))
  }
  return null
}

export default class DocumentsFacadeController {
  async status({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'Documents module status',
      data: documentsFacadeService.status(),
    })
  }

  async health({ response }: HttpContext) {
    const probe = await documentsFacadeService.probeHealth()
    return response.status(probe.ok ? 200 : 503).send({
      success: probe.ok,
      message: probe.ok ? 'Documents upstream healthy' : 'Documents upstream unavailable',
      data: {
        upstream: documentsFacadeService.upstream(),
        ...probe,
      },
    })
  }

  async proxy(ctx: HttpContext) {
    const rest = String(ctx.params['*'] || '')
    if (rest === '_status' || rest.startsWith('_status/')) {
      return this.status(ctx)
    }
    if (rest === '_health' || rest.startsWith('_health/')) {
      return this.health(ctx)
    }

    try {
      const result = await documentsFacadeService.proxy({
        pathSuffix: rest,
        method: ctx.request.method(),
        queryString: ctx.request.request.url?.split('?')[1],
        headers: forwardHeaders(ctx),
        body: requestBody(ctx),
      })
      ctx.response.header('X-WMSU-Documents-Upstream', result.upstream)
      ctx.response.header('Content-Type', result.contentType)
      return ctx.response.status(result.status).send(result.body)
    } catch (error) {
      return ctx.response.serviceUnavailable({
        success: false,
        message: 'Documents upstream unavailable',
        data: {
          upstream: documentsFacadeService.upstream(),
          error: error instanceof Error ? error.message : 'unknown',
        },
      })
    }
  }
}
