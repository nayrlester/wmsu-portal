import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import KioskDevice from '#modules/library/models/kiosk_device'
import UnauthorizedException from '#modules/library/exceptions/unauthorized_exception'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export default class KioskDeviceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const deviceCode =
      ctx.request.header('x-kiosk-device-code') ?? ctx.request.input('deviceCode')
    const apiKey = ctx.request.header('x-kiosk-api-key') ?? ctx.request.input('apiKey')

    if (!deviceCode || !apiKey) {
      throw new UnauthorizedException('Kiosk device credentials required')
    }

    const kiosk = await KioskDevice.query()
      .where('tenant_id', borrowingTenantId())
      .where('device_code', String(deviceCode).trim())
      .first()

    if (!kiosk || !kiosk.apiKeyHash) {
      throw new UnauthorizedException('Invalid kiosk credentials')
    }

    const valid = await hash.verify(kiosk.apiKeyHash, String(apiKey))
    if (!valid) {
      throw new UnauthorizedException('Invalid kiosk credentials')
    }

    if (!kiosk.isEnabled) {
      throw new ForbiddenException('This kiosk is disabled by library administration')
    }

    kiosk.lastSeenAt = DateTime.now()
    await kiosk.save()

    ctx.kioskDevice = kiosk
    await next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    kioskDevice?: import('#modules/library/models/kiosk_device').default
  }
}
