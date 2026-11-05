import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import UdmsSystemSetting from '#modules/documents/models/udms_system_setting'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

const RESERVED_KEYS = new Set(['auth.mode', 'deployment.mode'])

export class UdmsSettingsValidationException extends Exception {
  constructor(message: string) {
    super(message, { status: 422, code: 'E_UDMS_SETTINGS_VALIDATION' })
  }
}

export class UdmsSettingsService {
  async list() {
    const tenantId = tenantContext.requireTenantId()
    return UdmsSystemSetting.query()
      .where('tenant_id', tenantId)
      .orderBy('setting_key', 'asc')
  }

  async get(key: string) {
    const tenantId = tenantContext.requireTenantId()
    return UdmsSystemSetting.query()
      .where('tenant_id', tenantId)
      .where('setting_key', key)
      .first()
  }

  async upsert(
    key: string,
    value: Record<string, unknown>,
    description: string | null | undefined,
    actorUserId: string | null,
    requestMeta?: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    if (!key.trim()) {
      throw new UdmsSettingsValidationException('settingKey is required')
    }
    if (RESERVED_KEYS.has(key)) {
      throw new UdmsSettingsValidationException(
        'This setting is owned by environment/platform configuration and cannot be stored here'
      )
    }

    const tenantId = tenantContext.requireTenantId()

    return db.transaction(async (trx) => {
      let row = await UdmsSystemSetting.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('setting_key', key)
        .first()

      const before = row
        ? {
            settingKey: row.settingKey,
            settingValue: row.settingValue,
            description: row.description,
          }
        : null

      if (!row) {
        row = await UdmsSystemSetting.create(
          {
            tenantId,
            settingKey: key,
            settingValue: value,
            description: description ?? null,
            updatedBy: actorUserId,
          },
          { client: trx }
        )
      } else {
        row.settingValue = value
        if (description !== undefined) row.description = description
        row.updatedBy = actorUserId
        await row.useTransaction(trx).save()
      }

      await auditService.log({
        tenantId,
        userId: actorUserId,
        action: before ? AuditAction.UPDATE : AuditAction.CREATE,
        entityType: 'udms_system_settings',
        entityId: row.id,
        oldValues: before,
        newValues: {
          settingKey: row.settingKey,
          settingValue: row.settingValue,
          description: row.description,
        },
        ipAddress: requestMeta?.ipAddress ?? null,
        userAgent: requestMeta?.userAgent ?? null,
        metadata: { module: 'udms', prompt: '02' },
      })

      return row
    })
  }
}

export const udmsSettingsService = new UdmsSettingsService()
