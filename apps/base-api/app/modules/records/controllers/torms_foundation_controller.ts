import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { getAuthMode } from '#modules/records/services/platform/platform_identity'
import { TORMS_ROLE_DEFS } from '#modules/records/domain/torms/torms_permissions'
import { TormsIntegrationContractService } from '#modules/records/domain/torms/torms_integration_contracts'
import { tormsSettingsService } from '#modules/records/services/torms/torms_settings_service'
import { tormsOutboxService } from '#modules/records/services/torms/torms_outbox_service'
import { documentRequestLookupService } from '#modules/records/services/torms/document_request_lookup_service'
import { academicSyncService } from '#modules/records/services/torms/academic_sync_service'
import { usisAcademicClient } from '#modules/records/services/integrations/usis_academic_client'
import { ufmsPaymentClient } from '#modules/records/services/integrations/ufms_payment_client'
import { udmsDocumentClient } from '#modules/records/services/integrations/udms_document_client'
import { platformClearanceClient } from '#modules/records/services/integrations/platform_clearance_client'
import {
  listTormsOutboxValidator,
  upsertTormsSettingValidator,
  syncPullValidator,
  integrationProbeValidator,
} from '#modules/records/validators/torms_foundation'

export default class TormsFoundationController {
  private contracts = new TormsIntegrationContractService()

  async status({ response }: HttpContext) {
    return response.ok({
      success: true,
      data: {
        system: 'TORMS',
        prompt: '07',
        authMode: getAuthMode(),
        appName: env.get('APP_NAME') ?? 'TORMS',
        separateLoginSystem: false,
        separateFileStorage: false,
        academicSoR: 'USiS',
        financialSoR: 'UFMS',
        documentBlobSoR: 'UDMS',
        clearanceSoR: 'Platform CIS',
        auditAppendOnly: true,
        torRoles: TORMS_ROLE_DEFS.map((r) => ({
          slug: r.slug,
          torName: r.torName,
          description: r.description,
        })),
        integrationsConfigured: {
          usis: usisAcademicClient.isConfigured(),
          ufms: ufmsPaymentClient.isConfigured(),
          udms: udmsDocumentClient.isConfigured(),
          clearance: platformClearanceClient.isConfigured(),
        },
        modulesDelivered: [
          'transcript and certification request workflows',
          'structured generation and issuance (structured_only)',
          'public verification UI',
          'alumni profile search and TORMS-owned updates',
          'operational reports and management dashboard',
        ],
        modulesDeferred: [
          'official University print templates and digital signatures',
          'UFMS live fee assessment and payment posting',
          'UDMS blob store when DMS-010 paths unset',
          'alumni tracer, events, and donations',
          'GWA/honors engine and anomaly monitoring',
          'archiving lifecycle and HEMIS-style regulatory packs',
        ],
        acceptanceVerdict: 'Ready with documented limitations — not full TOR compliance',
      },
    })
  }

  async listContracts({ response }: HttpContext) {
    return response.ok({ success: true, data: this.contracts.listContracts() })
  }

  async listSettings({ auth, response }: HttpContext) {
    const user = auth.user!
    const rows = await tormsSettingsService.list(user.organizationId)
    return response.ok({
      success: true,
      data: rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        settingKey: row.setting_key,
        settingValue: row.setting_value,
        description: row.description,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
      })),
    })
  }

  async upsertSetting({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(upsertTormsSettingValidator)
    try {
      const row = await tormsSettingsService.upsert(
        user.organizationId,
        payload.settingKey,
        payload.settingValue as Record<string, unknown>,
        payload.description,
        user.id
      )
      return response.ok({
        success: true,
        data: {
          id: row.id,
          settingKey: row.setting_key,
          settingValue: row.setting_value,
          description: row.description,
          updatedAt: row.updated_at,
        },
      })
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 500
      if (status === 422) {
        return response.status(422).send({
          success: false,
          message: (error as Error).message,
        })
      }
      throw error
    }
  }

  async listOutbox({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const filters = await request.validateUsing(listTormsOutboxValidator)
    const page = await tormsOutboxService.list(user.organizationId, filters)
    return response.ok({
      success: true,
      data: page.data.map((row: Record<string, unknown>) => ({
        id: row.id,
        contractCode: row.contract_code,
        targetSystem: row.target_system,
        eventType: row.event_type,
        idempotencyKey: row.idempotency_key,
        status: row.status,
        attemptCount: row.attempt_count,
        lastError: row.last_error,
        createdAt: row.created_at,
        processedAt: row.processed_at,
      })),
      meta: page.meta,
    })
  }

  async lookupRequest({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const found = await documentRequestLookupService.findByReference(
      user.organizationId,
      params.requestNumber,
      user.id
    )
    if (!found) {
      return response.notFound({
        success: false,
        message: 'Request reference not found',
      })
    }
    return response.ok({
      success: true,
      data: {
        requestKind: found.requestKind,
        request: found.request,
      },
    })
  }

  async listSyncRuns({ auth, response }: HttpContext) {
    const user = auth.user!
    const rows = await academicSyncService.listSyncRuns(user.organizationId)
    return response.ok({ success: true, data: rows })
  }

  async listDiscrepancies({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const syncRunId = request.input('syncRunId') as string | undefined
    const rows = await academicSyncService.listDiscrepancies(user.organizationId, syncRunId)
    return response.ok({ success: true, data: rows })
  }

  async pullUsisGrades({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(syncPullValidator)
    const result = await academicSyncService.pullFromUsis({
      organizationId: user.organizationId,
      studentNumber: payload.studentNumber,
      actorUserId: user.id,
    })

    if (!result.ok) {
      return response.status(result.unavailable ? 503 : 502).send({
        success: false,
        message: result.error,
        data: {
          syncRunId: result.syncRunId,
          contract: result.contract,
          unavailable: result.unavailable,
        },
      })
    }

    return response.ok({ success: true, data: result })
  }

  async probeIntegrations({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(integrationProbeValidator)
    const studentNumber = payload.studentNumber ?? 'PROBE'
    const organizationId = payload.organizationId ?? user.organizationId

    const [usis, clearance, ufms, udms] = await Promise.all([
      payload.studentNumber
        ? usisAcademicClient.exportStudentGrades(studentNumber, organizationId)
        : Promise.resolve({
            ok: false as const,
            status: null,
            error: 'studentNumber required to probe USiS grades-export',
            unavailable: false,
            contract: 'INT-TOR-01' as const,
          }),
      payload.studentNumber
        ? platformClearanceClient.getClearance(studentNumber)
        : Promise.resolve({
            ok: false as const,
            status: null,
            error: 'studentNumber required to probe clearance',
            unavailable: false,
            contract: 'INT-TOR-05' as const,
          }),
      payload.paymentRef
        ? ufmsPaymentClient.verifyPaymentReference({
            organizationId,
            paymentRef: payload.paymentRef,
          })
        : ufmsPaymentClient.getDocumentFeeBalance({
            organizationId,
            studentNumber,
          }),
      payload.documentId
        ? udmsDocumentClient.resolveDocumentReference(payload.documentId)
        : udmsDocumentClient.registerDocumentReference({
            organizationId,
            metadata: { probe: true },
          }),
    ])

    return response.ok({
      success: true,
      data: {
        note: 'Probe reports live availability; failures are expected when peer contracts are unset. No successful production response is simulated.',
        usis: { ok: usis.ok, unavailable: 'unavailable' in usis ? usis.unavailable : false, error: usis.ok ? null : usis.error, contract: usis.contract },
        clearance: {
          ok: clearance.ok,
          unavailable: 'unavailable' in clearance ? clearance.unavailable : false,
          error: clearance.ok ? null : clearance.error,
          contract: clearance.contract,
        },
        ufms: {
          ok: ufms.ok,
          unavailable: 'unavailable' in ufms ? ufms.unavailable : false,
          error: ufms.ok ? null : ufms.error,
          contract: ufms.contract,
        },
        udms: {
          ok: udms.ok,
          unavailable: 'unavailable' in udms ? udms.unavailable : false,
          error: udms.ok ? null : udms.error,
          contract: udms.contract,
        },
      },
    })
  }
}
