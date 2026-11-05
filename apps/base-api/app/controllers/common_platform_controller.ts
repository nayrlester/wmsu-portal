import type { HttpContext } from '@adonisjs/core/http'
import { identityFacadeService } from '../modules/common-platform/services/identity_facade_service.js'
import { launcherCatalogService } from '../modules/common-platform/services/launcher_catalog_service.js'
import { dbConsolidationService } from '../modules/common-platform/services/db_consolidation_service.js'

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

async function sendProxy(
  ctx: HttpContext,
  absolutePath: string
) {
  try {
    const result = await identityFacadeService.proxy({
      absolutePath,
      method: ctx.request.method(),
      queryString: ctx.request.request.url?.split('?')[1],
      headers: forwardHeaders(ctx),
      body: requestBody(ctx),
    })
    ctx.response.header('X-WMSU-Identity-Upstream', result.upstream)
    ctx.response.header('Content-Type', result.contentType)
    return ctx.response.status(result.status).send(result.body)
  } catch (error) {
    return ctx.response.serviceUnavailable({
      success: false,
      message: 'Identity upstream unavailable',
      data: {
        upstream: identityFacadeService.upstream(),
        error: error instanceof Error ? error.message : 'unknown',
      },
    })
  }
}

export default class CommonPlatformController {
  async status({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'Common Platform module status',
      data: identityFacadeService.status(),
    })
  }

  async launcher({ response }: HttpContext) {
    return response.ok(launcherCatalogService.catalog())
  }

  async dbConsolidation({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'Phase 3 database consolidation status',
      data: dbConsolidationService.status(),
    })
  }

  async jwks(ctx: HttpContext) {
    return sendProxy(ctx, '/.well-known/jwks.json')
  }

  async auth(ctx: HttpContext) {
    const rest = String(ctx.params['*'] || '')
    return sendProxy(ctx, `/api/v1/auth/${rest}`)
  }

  async admin(ctx: HttpContext) {
    const rest = String(ctx.params['*'] || '')
    return sendProxy(ctx, `/api/v1/admin/${rest}`)
  }

  async integrations(ctx: HttpContext) {
    const rest = String(ctx.params['*'] || '')
    return sendProxy(ctx, `/api/v1/integrations/${rest}`)
  }
}
