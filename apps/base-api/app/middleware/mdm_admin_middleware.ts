import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

/**
 * Temporary admin gate until platform RBAC permission codes (mdm.write) are bound.
 * Does not hardcode role names — only validates a configured secret.
 */
export default class MdmAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const expected = env.get('MDM_ADMIN_API_KEY')
    const provided = ctx.request.header('x-mdm-admin-key')
    if (!expected || !provided || provided !== expected) {
      return ctx.response.unauthorized({
        success: false,
        message: 'MDM admin authorization required',
        data: { errors: [{ field: 'X-MDM-Admin-Key', message: 'Invalid or missing admin key' }] },
      })
    }
    ctx.mdmActor = {
      type: 'admin_key',
      id: ctx.request.header('x-actor-id') ?? 'mdm-admin',
    }
    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    mdmActor?: { type: string; id: string }
  }
}
