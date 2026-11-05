import type { HttpContext } from '@adonisjs/core/http'
import {
  domainGatewayService,
  type DomainSystem,
} from '#services/domain_gateway_service'

const SYSTEMS = new Set<DomainSystem>([
  'enrollment',
  'records',
  'finance',
  'library',
  'inventory',
  'documents',
  'identity',
])

export default class GatewayController {
  async catalog({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'WMSU domain gateway catalog',
      data: domainGatewayService.catalog(),
    })
  }

  async proxy(ctx: HttpContext) {
    const system = String(ctx.params.system || '') as DomainSystem
    if (!SYSTEMS.has(system)) {
      return ctx.response.badRequest({
        success: false,
        message: `Unknown system '${system}'`,
      })
    }

    const pathSuffix = String(ctx.params['*'] || '')
    const qs = ctx.request.request.url?.split('?')[1]

    let body: ArrayBuffer | null = null
    if (!['GET', 'HEAD'].includes(ctx.request.method().toUpperCase())) {
      const json = ctx.request.body()
      if (json && Object.keys(json as object).length > 0) {
        body = Buffer.from(JSON.stringify(json))
      }
    }

    try {
      const result = await domainGatewayService.proxy({
        system,
        method: ctx.request.method(),
        pathSuffix,
        queryString: qs,
        headers: {
          authorization: ctx.request.header('authorization') ?? undefined,
          'content-type': ctx.request.header('content-type') ?? 'application/json',
          'x-service-api-key': ctx.request.header('x-service-api-key') ?? undefined,
          'idempotency-key': ctx.request.header('idempotency-key') ?? undefined,
        },
        body,
      })

      ctx.response.header('X-WMSU-Gateway-Upstream', result.upstream)
      ctx.response.header('Content-Type', result.contentType)
      return ctx.response.status(result.status).send(result.body)
    } catch (error) {
      return ctx.response.serviceUnavailable({
        success: false,
        message: `Gateway upstream unavailable for ${system}`,
        data: {
          error: error instanceof Error ? error.message : 'unknown',
        },
      })
    }
  }
}
