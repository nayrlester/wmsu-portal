import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'

const RESERVED_SETTING_KEYS = new Set(['auth.mode', 'auth.provider', 'db.schema'])

export class TormsSettingsService {
  async list(organizationId: string) {
    return db
      .from(t('torms_system_settings'))
      .where('organization_id', organizationId)
      .orderBy('setting_key', 'asc')
  }

  async upsert(
    organizationId: string,
    settingKey: string,
    settingValue: Record<string, unknown>,
    description: string | null | undefined,
    updatedBy: string | null
  ) {
    if (RESERVED_SETTING_KEYS.has(settingKey)) {
      const err = new Error(`Setting key "${settingKey}" is reserved`)
      ;(err as Error & { status: number }).status = 422
      throw err
    }

    const existing = await db
      .from(t('torms_system_settings'))
      .where({ organization_id: organizationId, setting_key: settingKey })
      .first()

    const now = new Date()
    let row
    if (existing) {
      ;[row] = await db
        .from(t('torms_system_settings'))
        .where('id', existing.id)
        .update({
          setting_value: settingValue,
          description: description ?? existing.description,
          updated_by: updatedBy,
          updated_at: now,
        })
        .returning('*')
    } else {
      ;[row] = await db
        .table(t('torms_system_settings'))
        .insert({
          organization_id: organizationId,
          setting_key: settingKey,
          setting_value: settingValue,
          description: description ?? null,
          updated_by: updatedBy,
          created_at: now,
          updated_at: now,
        })
        .returning('*')
    }

    await auditLogService.log({
      organizationId,
      actorUserId: updatedBy,
      action: 'torms.settings.upsert',
      entityType: 'torms_system_setting',
      entityId: row.id,
      metadata: { settingKey },
    })

    return row
  }
}

export const tormsSettingsService = new TormsSettingsService()
