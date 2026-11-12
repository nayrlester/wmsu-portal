import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import IntegrationService from '#modules/library/services/integrations/integration_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'

const arisValidator = vine.compile(
  vine.object({
    students: vine
      .array(
        vine.object({
          studentId: vine.string().trim().minLength(1).maxLength(50),
          fullName: vine.string().trim().minLength(1).maxLength(200),
          email: vine.string().email().optional(),
          department: vine.string().trim().maxLength(200).optional(),
          enrolled: vine.boolean(),
          academicStatus: vine.string().trim().maxLength(50).optional(),
        })
      )
      .minLength(1)
      .maxLength(500),
  })
)

const hrisValidator = vine.compile(
  vine.object({
    employees: vine
      .array(
        vine.object({
          employeeId: vine.string().trim().minLength(1).maxLength(50),
          fullName: vine.string().trim().minLength(1).maxLength(200),
          email: vine.string().email().optional(),
          department: vine.string().trim().maxLength(200).optional(),
          active: vine.boolean(),
          roleHint: vine.enum(['faculty', 'employee']).optional(),
        })
      )
      .minLength(1)
      .maxLength(500),
  })
)

export default class IntegrationsController {
  private service = new IntegrationService()
  private rbac = new RbacService()

  private ensureAdmin(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'settings:update')) {
      throw new ForbiddenException('Missing permission: settings:update')
    }
  }

  async status(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    return ctx.response.ok({ success: true, data: this.service.status() })
  }

  async syncEnrollment(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    const result = await this.service.syncFromEnrollment()
    return ctx.response.ok({ success: true, data: result })
  }

  async syncAris(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    const payload = await ctx.request.validateUsing(arisValidator)
    const result = await this.service.syncArisStudents(payload.students)
    return ctx.response.ok({ success: true, data: result })
  }

  async syncHris(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    const payload = await ctx.request.validateUsing(hrisValidator)
    const result = await this.service.syncHrisEmployees(payload.employees)
    return ctx.response.ok({ success: true, data: result })
  }

  /**
   * Intentionally disabled: accepting directory passwords or unverified SSO
   * assertions would create a credential-harvesting / account-takeover surface.
   */
  async ldapAuth(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    return ctx.response.status(501).send({
      success: false,
      message:
        'LDAP/AD authentication is not enabled. Configure a verified directory client before exposing binds.',
    })
  }

  async smartCampusSso(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    return ctx.response.status(501).send({
      success: false,
      message:
        'Smart Campus SSO exchange is not enabled. Signature-verified assertion handling is required first.',
    })
  }

  async catalogProtocolHealth(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    const active = process.env.LIB_PROTOCOL_CATALOG || 'sru'
    return ctx.response.ok({
      success: true,
      data: {
        protocol: active,
        mode: 'software_adapter',
        healthy: true,
        note: 'Configure LIB_PROTOCOL_CATALOG to z39.50 or sru when a campus peer is available.',
      },
    })
  }

  async circulationProtocolHealth(ctx: HttpContext) {
    this.ensureAdmin(ctx)
    const active = process.env.LIB_PROTOCOL_CIRCULATION || 'sip2'
    return ctx.response.ok({
      success: true,
      data: {
        protocol: active,
        mode: 'software_adapter',
        healthy: true,
        note: 'Configure LIB_PROTOCOL_CIRCULATION to sip2 or ncip for self-check hardware.',
      },
    })
  }
}
