import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import HardwareService from '#modules/library/services/hardware/hardware_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

function auditUser(ctx: HttpContext) {
  return ctx.authUser!.id
}

export default class HardwareController {
  private service = new HardwareService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async listRfid(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const tags = await this.service.listRfidTags()
    return ctx.response.ok({ success: true, data: tags })
  }

  async registerRfid(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          tagUid: vine.string().trim().minLength(4).maxLength(100),
          copyId: vine.string().uuid().optional(),
          copyBarcode: vine.string().trim().minLength(1).maxLength(100).optional(),
        })
      )
    )
    const tag = await this.service.registerRfidTag(payload.tagUid, payload.copyId, payload.copyBarcode)
    const tags = await this.service.listRfidTags()
    const listed = tags.find((row) => row.id === tag.id)
    return ctx.response.created({
      success: true,
      data: listed ?? {
        id: tag.id,
        tagUid: tag.tagUid,
        copyId: tag.copyId,
        status: tag.status,
        registeredAt: tag.registeredAt.toISO(),
        barcode: null,
        bookTitle: null,
        copyStatus: null,
      },
    })
  }

  async rfidCheckout(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          tagUid: vine.string().trim().minLength(4).maxLength(100),
          memberId: vine.string().uuid().optional(),
          cardNumber: vine.string().trim().minLength(3).maxLength(100).optional(),
        })
      )
    )
    if (!payload.memberId && !payload.cardNumber) {
      return ctx.response.badRequest({ success: false, message: 'Library card is required' })
    }
    const data = await this.service.rfidCheckout(
      payload.tagUid,
      payload.memberId ?? '',
      auditUser(ctx),
      payload.cardNumber
    )
    return ctx.response.ok({ success: true, data })
  }

  async rfidCheckin(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          tagUid: vine.string().trim().minLength(4).maxLength(100),
        })
      )
    )
    const data = await this.service.rfidCheckin(payload.tagUid, auditUser(ctx))
    return ctx.response.ok({ success: true, data })
  }

  async readGate(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          tagUid: vine.string().trim().minLength(4).maxLength(100),
          gateCode: vine.string().trim().minLength(2).maxLength(50),
        })
      )
    )
    const data = await this.service.readGate(payload.tagUid, payload.gateCode)
    return ctx.response.ok({ success: true, data })
  }

  async listGateEvents(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const data = await this.service.listGateEvents()
    return ctx.response.ok({ success: true, data })
  }

  async listShelfCounts(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const data = await this.service.listShelfCounts()
    return ctx.response.ok({ success: true, data })
  }

  async showShelfCount(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const data = await this.service.shelfCountReport(ctx.params.id)
    return ctx.response.ok({ success: true, data })
  }

  async startShelfCount(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          shelfCode: vine.string().trim().minLength(2).maxLength(100),
        })
      )
    )
    const data = await this.service.startShelfCount(payload.shelfCode)
    return ctx.response.created({ success: true, data })
  }

  async addShelfScan(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          value: vine.string().trim().minLength(2).maxLength(100),
        })
      )
    )
    const data = await this.service.addShelfScan(ctx.params.id, payload.value)
    return ctx.response.ok({ success: true, data })
  }

  async listKiosks(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const kiosks = await this.service.listKiosks()
    return ctx.response.ok({ success: true, data: kiosks })
  }

  async upsertKiosk(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          name: vine.string(),
          deviceCode: vine.string(),
          location: vine.string().optional(),
          isEnabled: vine.boolean().optional(),
          idleTimeoutSeconds: vine.number().optional(),
          rotateApiKey: vine.boolean().optional(),
        })
      )
    )
    const kiosk = await this.service.upsertKiosk(payload)
    return ctx.response.ok({ success: true, data: kiosk })
  }

  async setKioskEnabled(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(vine.object({ isEnabled: vine.boolean() }))
    )
    const kiosk = await this.service.setKioskEnabled(ctx.params.id, payload.isEnabled)
    return ctx.response.ok({ success: true, data: kiosk })
  }

  async rotateKioskKey(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const kiosk = await this.service.rotateKioskApiKey(ctx.params.id)
    return ctx.response.ok({ success: true, data: kiosk })
  }

  async listKioskTransactions(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const kioskId = ctx.request.input('kioskId')
    const limit = Number(ctx.request.input('limit', 50))
    const rows = await this.service.listKioskTransactions(
      kioskId ? String(kioskId) : undefined,
      Number.isFinite(limit) ? limit : 50
    )
    return ctx.response.ok({ success: true, data: rows })
  }

  async issueTicket(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          serviceType: vine.string(),
          patronName: vine.string().optional(),
          memberId: vine.string().uuid().optional(),
        })
      )
    )
    const ticket = await this.service.issueQueueTicket(
      payload.serviceType,
      payload.patronName,
      payload.memberId
    )
    return ctx.response.created({ success: true, data: ticket })
  }

  async callNext(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    const serviceType = ctx.request.input('serviceType')
    const ticket = await this.service.callNextTicket(serviceType)
    return ctx.response.ok({ success: true, data: ticket })
  }

  async completeTicket(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:checkout')
    const ticket = await this.service.completeTicket(ctx.params.id)
    return ctx.response.ok({ success: true, data: ticket })
  }

  async queueAnalytics(ctx: HttpContext) {
    this.ensure(ctx, 'borrowings:read')
    const data = await this.service.queueAnalytics()
    return ctx.response.ok({ success: true, data })
  }

  async queueBoard(ctx: HttpContext) {
    const isStaff = Boolean(ctx.authUser)
    if (isStaff) {
      this.ensure(ctx, 'borrowings:read')
    }
    const board = await this.service.queueBoard({
      includePatronDetails: isStaff,
    })
    return ctx.response.ok({ success: true, data: board })
  }

  async listLocations(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const locations = await this.service.listShelfLocations()
    return ctx.response.ok({ success: true, data: locations })
  }

  async upsertLocation(ctx: HttpContext) {
    this.ensure(ctx, 'books:update')
    const payload = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          code: vine.string(),
          label: vine.string(),
          floor: vine.string().optional(),
          aisle: vine.string().optional(),
          shelf: vine.string().optional(),
          mapCoordinates: vine.any().optional(),
        })
      )
    )
    const location = await this.service.upsertShelfLocation(payload)
    return ctx.response.ok({ success: true, data: location })
  }

  async locate(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const q = String(ctx.request.input('q', '')).trim()
    if (!q) return ctx.response.badRequest({ success: false, message: 'q is required' })
    const results = await this.service.locateByCallNumberOrBarcode(q)
    return ctx.response.ok({ success: true, data: results })
  }

  async publicLocate(ctx: HttpContext) {
    const q = String(ctx.request.input('q', '')).trim()
    if (q.length < 2) {
      return ctx.response.badRequest({ success: false, message: 'Enter at least 2 characters' })
    }
    const data = await this.service.locator(q)
    return ctx.response.ok({ success: true, data })
  }
}
