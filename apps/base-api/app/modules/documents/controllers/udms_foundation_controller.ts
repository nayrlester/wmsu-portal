import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { getAuthMode } from '#modules/documents/services/platform/platform_identity'
import { UDMS_TOR_ROLES } from '#modules/documents/domain/udms/udms_tor_roles'
import UdmsIntegrationContractService from '#modules/documents/services/udms/udms_integration_contracts'
import { udmsSettingsService } from '#modules/documents/services/udms/udms_settings_service'
import { udmsOutboxService } from '#modules/documents/services/udms/udms_outbox_service'
import {
  listUdmsOutboxValidator,
  upsertUdmsSettingValidator,
} from '#modules/documents/validators/udms_foundation'

export default class UdmsFoundationController {
  private contracts = new UdmsIntegrationContractService()

  async status({ response }: HttpContext) {
    return response.ok({
      system: 'UDMS',
      prompt: '02',
      authMode: getAuthMode(),
      appName: env.get('APP_NAME') ?? 'DocsTrack',
      separateLoginSystem: false,
      separateFileStorage: false,
      auditAppendOnly: true,
      documentHubMounted: true,
      torRoles: UDMS_TOR_ROLES.map((r) => ({
        slug: r.slug,
        torName: r.torName,
        description: r.description,
      })),
      modulesDeferred: [
        'document registration workflows',
        'document routing workflows',
        'document approval workflows',
        'complete version management',
        'archival workflows',
      ],
      existingDomainReuse: [
        'documents',
        'document_files',
        'document_versions',
        'workflows',
        'retention_schedules',
        'digitization_batches',
        'audit_logs',
        'platform_documents',
      ],
    })
  }

  async listSettings({ response }: HttpContext) {
    const rows = await udmsSettingsService.list()
    return response.ok(
      rows.map((row) => ({
        id: row.id,
        settingKey: row.settingKey,
        settingValue: row.settingValue,
        description: row.description,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt.toISO(),
      }))
    )
  }

  async upsertSetting({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(upsertUdmsSettingValidator)
    const row = await udmsSettingsService.upsert(
      payload.settingKey,
      payload.settingValue as Record<string, unknown>,
      payload.description,
      user.id,
      {
        ipAddress: request.ip(),
        userAgent: request.header('user-agent') ?? null,
      }
    )
    return response.ok({
      id: row.id,
      settingKey: row.settingKey,
      settingValue: row.settingValue,
      description: row.description,
      updatedAt: row.updatedAt.toISO(),
    })
  }

  async listContracts({ response }: HttpContext) {
    return response.ok(this.contracts.listContracts())
  }

  async listOutbox({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listUdmsOutboxValidator)
    const page = await udmsOutboxService.list(filters)
    return response.ok({
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
