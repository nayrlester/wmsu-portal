import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import KioskService from '#modules/library/services/kiosk/kiosk_service'

export default class KioskController {
  private service = new KioskService()

  async session(ctx: HttpContext) {
    const data = await this.service.session(ctx.kioskDevice!)
    return ctx.response.ok({ success: true, data })
  }

  async heartbeat(ctx: HttpContext) {
    const data = await this.service.heartbeat(ctx.kioskDevice!)
    return ctx.response.ok({ success: true, data })
  }

  async patron(ctx: HttpContext) {
    const cardNumber = String(ctx.request.input('cardNumber', '')).trim()
    if (!cardNumber) {
      return ctx.response.badRequest({ success: false, message: 'cardNumber is required' })
    }
    const data = await this.service.patronLookup(ctx.kioskDevice!, cardNumber)
    return ctx.response.ok({ success: true, data })
  }

  async account(ctx: HttpContext) {
    const cardNumber = String(ctx.request.input('cardNumber', '')).trim()
    if (!cardNumber) {
      return ctx.response.badRequest({ success: false, message: 'cardNumber is required' })
    }
    const data = await this.service.account(ctx.kioskDevice!, cardNumber)
    return ctx.response.ok({ success: true, data })
  }

  async history(ctx: HttpContext) {
    const cardNumber = String(ctx.request.input('cardNumber', '')).trim()
    if (!cardNumber) {
      return ctx.response.badRequest({ success: false, message: 'cardNumber is required' })
    }
    const data = await this.service.history(ctx.kioskDevice!, cardNumber)
    return ctx.response.ok({ success: true, data })
  }

  async checkout(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          cardNumber: vine.string().trim().minLength(3).maxLength(100),
          copyBarcode: vine.string().trim().minLength(1).maxLength(100),
        })
      )
    )
    const data = await this.service.checkout(
      ctx.kioskDevice!,
      payload.cardNumber,
      payload.copyBarcode
    )
    return ctx.response.ok({ success: true, data })
  }

  async returnItem(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          copyBarcode: vine.string().trim().minLength(1).maxLength(100),
        })
      )
    )
    const data = await this.service.returnByBarcode(ctx.kioskDevice!, payload.copyBarcode)
    return ctx.response.ok({ success: true, data })
  }
}
