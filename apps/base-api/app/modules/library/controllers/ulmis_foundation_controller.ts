import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import UlmisSettingsService from '#modules/library/services/ulmis/ulmis_settings_service'
import UlmisIntegrationContractService from '#modules/library/services/ulmis/ulmis_integration_contracts'
import UlmisOutboxService from '#modules/library/services/ulmis/ulmis_outbox_service'
import { auditFromCtx } from '#modules/library/helpers/audit_context'
import { getAuthMode } from '#modules/library/services/platform/platform_identity'
import { ULMIS_TOR_ROLES } from '#modules/library/domain/ulmis_permissions'
import {
  listOutboxValidator,
  upsertUlmisSettingValidator,
} from '#modules/library/validators/ulmis_foundation'

export default class UlmisFoundationController {
  private rbac = new RbacService()
  private settings = new UlmisSettingsService()
  private contracts = new UlmisIntegrationContractService()
  private outbox = new UlmisOutboxService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async status(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    return ctx.response.ok({
      success: true,
      message: 'ULMIS foundation status',
      data: {
        system: 'ULMIS',
        prompt: '02',
        authMode: getAuthMode(),
        deploymentMode: env.get('DEPLOYMENT_MODE', 'university'),
        defaultTenantSlug: env.get('DEFAULT_TENANT_SLUG', 'ulmis'),
        torRoles: ULMIS_TOR_ROLES,
        separateLoginSystem: false,
        auditAppendOnly: true,
        modulesDeferred: [
          'catalog workflows',
          'circulation workflows',
          'acquisition workflows',
          'device protocol servers',
        ],
      },
    })
  }

  async listSettings(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const rows = await this.settings.list()
    return ctx.response.ok({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        settingKey: row.settingKey,
        settingValue: row.settingValue,
        description: row.description,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt.toISO(),
      })),
    })
  }

  async upsertSetting(ctx: HttpContext) {
    this.ensure(ctx, 'settings:update')
    const payload = await ctx.request.validateUsing(upsertUlmisSettingValidator)
    try {
      const row = await this.settings.upsert(
        payload.settingKey,
        payload.settingValue as Record<string, unknown>,
        payload.description,
        ctx.authUser!.id,
        auditFromCtx(ctx)
      )
      return ctx.response.ok({
        success: true,
        message: 'Setting saved',
        data: {
          id: row.id,
          settingKey: row.settingKey,
          settingValue: row.settingValue,
          description: row.description,
          updatedAt: row.updatedAt.toISO(),
        },
      })
    } catch (error) {
      const err = error as { status?: number; message?: string }
      if (err.status === 422) {
        return ctx.response.unprocessableEntity({
          success: false,
          message: err.message ?? 'Validation failed',
        })
      }
      throw error
    }
  }

  async listContracts(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    return ctx.response.ok({
      success: true,
      message: 'Planned ULMIS integration contracts (not executed in Prompt 02)',
      data: this.contracts.listContracts(),
    })
  }

  async listOutbox(ctx: HttpContext) {
    this.ensure(ctx, 'settings:read')
    const filters = await ctx.request.validateUsing(listOutboxValidator)
    const page = await this.outbox.list(filters)
    return ctx.response.ok({
      success: true,
      data: page.all().map((row) => ({
        id: row.id,
        contractCode: row.contractCode,
        targetSystem: row.targetSystem,
        eventType: row.eventType,
        idempotencyKey: row.idempotencyKey,
        status: row.status,
        attemptCount: row.attemptCount,
        lastError: row.lastError,
        createdAt: row.createdAt.toISO(),
        processedAt: row.processedAt?.toISO() ?? null,
      })),
      meta: page.getMeta(),
    })
  }
}
