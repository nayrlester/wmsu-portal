import db from '@adonisjs/lucid/services/db'
import UlmisSystemSetting from '#modules/library/models/ulmis_system_setting'
import AuditService from '#modules/library/services/audit/audit_service'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import type { AuditContext } from '#modules/library/services/audit/audit_service'

const RESERVED_KEYS = new Set(['auth.mode', 'deployment.mode'])

export default class UlmisSettingsService {
  private audit = new AuditService()

  async list() {
    const tenantId = tenantContext.get().id
    return UlmisSystemSetting.query()
      .where('tenant_id', tenantId)
      .orderBy('setting_key', 'asc')
  }

  async get(key: string) {
    const tenantId = tenantContext.get().id
    return UlmisSystemSetting.query()
      .where('tenant_id', tenantId)
      .where('setting_key', key)
      .first()
  }

  async upsert(
    key: string,
    value: Record<string, unknown>,
    description: string | null | undefined,
    actorUserId: string | null,
    auditCtx?: AuditContext
  ) {
    if (!key.trim()) {
      throw Object.assign(new Error('settingKey is required'), { status: 422 })
    }
    if (RESERVED_KEYS.has(key)) {
      throw Object.assign(
        new Error('This setting is owned by environment/platform configuration and cannot be stored here'),
        { status: 422 }
      )
    }

    const tenantId = tenantContext.get().id

    return db.transaction(async (trx) => {
      let row = await UlmisSystemSetting.query({ client: trx })
        .where('tenant_id', tenantId)
        .where('setting_key', key)
        .first()

      const before = row
        ? { settingKey: row.settingKey, settingValue: row.settingValue, description: row.description }
        : null

      if (!row) {
        row = await UlmisSystemSetting.create(
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

      await this.audit.log(
        before ? 'update' : 'create',
        'ulmis_system_settings',
        row.id,
        before,
        {
          settingKey: row.settingKey,
          settingValue: row.settingValue,
          description: row.description,
        },
        auditCtx
      )

      return row
    })
  }
}
