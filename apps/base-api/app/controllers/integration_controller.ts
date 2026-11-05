import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { errorEnvelope, IntegrationError, okEnvelope } from '#services/integration_envelope'
import {
  findIdempotentResponse,
  hashPayload,
  storeIdempotentResponse,
} from '#services/idempotency_service'
import {
  logIntegrationTransaction,
  updateIntegrationTransaction,
} from '#services/integration_log_service'
import { publishDomainEvent, listSubscriptions } from '#services/domain_event_service'
import { enqueueNotification } from '#services/notification_service'
import { storeFile, getStoredFile } from '#services/file_storage_service'
import { writePlatformAudit } from '#services/platform_audit_service'
import {
  evaluateClearance,
  listRequirementTypes,
  upsertClearanceRequirement,
} from '#services/clearance_service'
import db from '@adonisjs/lucid/services/db'

export default class IntegrationController {
  async overview({ response }: HttpContext) {
    const [events, txns, notifications, files, clearanceTypes, clearanceReqs] = await Promise.all([
      db.from('cis_domain_events').count('* as total').first(),
      db.from('cis_integration_transactions').count('* as total').first(),
      db.from('cis_notifications').count('* as total').first(),
      db.from('cis_stored_files').count('* as total').first(),
      db.from('cis_clearance_requirement_types').count('* as total').first(),
      db.from('cis_clearance_requirements').count('* as total').first(),
    ])
    return response.ok(
      okEnvelope({
        capabilities: [
          'rest-envelope',
          'openapi',
          'domain-events',
          'bullmq-jobs',
          'integration-logs',
          'idempotency',
          'notifications',
          'file-storage',
          'audit',
          'clearance-foundation',
        ],
        counts: {
          domainEvents: Number(events?.total ?? 0),
          integrationTransactions: Number(txns?.total ?? 0),
          notifications: Number(notifications?.total ?? 0),
          storedFiles: Number(files?.total ?? 0),
          clearanceRequirementTypes: Number(clearanceTypes?.total ?? 0),
          clearanceRequirements: Number(clearanceReqs?.total ?? 0),
        },
        ownershipBoundaries: {
          enrollmentAcademic: 'usis',
          financialTransactions: 'ufms',
          clearanceAggregation: 'platform-cis',
          studentIdentityProjection: 'platform-mdm',
        },
      })
    )
  }

  async publishEvent({ request, response, integrationActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        eventType: vine.string().trim().minLength(3).maxLength(120),
        aggregateType: vine.string().trim().minLength(2).maxLength(80),
        aggregateId: vine.string().trim().minLength(1).maxLength(80),
        payload: vine.any(),
        idempotencyKey: vine.string().trim().minLength(8).maxLength(180),
      }),
      data: request.body(),
    })
    if (!payload.payload || typeof payload.payload !== 'object' || Array.isArray(payload.payload)) {
      return response.badRequest(
        errorEnvelope('payload must be an object', [{ field: 'payload', message: 'object required' }])
      )
    }

    const correlationId = request.header('x-request-id') ?? undefined
    const txnId = await logIntegrationTransaction({
      correlationId,
      sourceSystem: integrationActor?.sourceSystem ?? 'unknown',
      targetSystem: 'platform-cis',
      operation: 'domain_event.publish',
      idempotencyKey: payload.idempotencyKey,
      status: 'processing',
      requestPayload: payload,
    })

    try {
      const result = await publishDomainEvent({
        eventType: payload.eventType,
        aggregateType: payload.aggregateType,
        aggregateId: payload.aggregateId,
        payload: payload.payload as Record<string, unknown>,
        idempotencyKey: payload.idempotencyKey,
        actorId: integrationActor?.id,
      })
      const body = okEnvelope(
        {
          eventId: result.event.id,
          status: result.event.status,
          deduplicated: result.deduplicated,
        },
        result.deduplicated ? 'Event already published' : 'Event published'
      )
      await updateIntegrationTransaction(txnId, {
        status: 'succeeded',
        httpStatus: 200,
        responsePayload: body,
      })
      return response.ok(body)
    } catch (error) {
      await updateIntegrationTransaction(txnId, {
        status: 'failed',
        httpStatus: 500,
        errorMessage: error instanceof Error ? error.message : 'publish failed',
      })
      throw error
    }
  }

  async listEvents({ request, response }: HttpContext) {
    const status = request.input('status')
    const q = db.from('cis_domain_events').orderBy('created_at', 'desc').limit(100)
    if (status) q.where('status', status)
    return response.ok(okEnvelope(await q))
  }

  async listSubscriptions({ request, response }: HttpContext) {
    return response.ok(okEnvelope(await listSubscriptions(request.input('eventType'))))
  }

  async listTransactions({ request, response }: HttpContext) {
    const status = request.input('status')
    const q = db.from('cis_integration_transactions').orderBy('created_at', 'desc').limit(100)
    if (status) q.where('status', status)
    return response.ok(okEnvelope(await q))
  }

  async enqueueNotification({ request, response, integrationActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        channel: vine.enum(['in_app', 'email', 'sms'] as const).optional(),
        templateCode: vine.string().trim().optional(),
        recipient: vine.string().trim().minLength(3).maxLength(255),
        subject: vine.string().trim().maxLength(255).optional(),
        body: vine.string().trim().minLength(1),
        metadata: vine.any().optional(),
        idempotencyKey: vine.string().trim().minLength(8).maxLength(180).optional(),
      }),
      data: request.body(),
    })

    const result = await enqueueNotification({
      channel: payload.channel,
      templateCode: payload.templateCode,
      recipient: payload.recipient,
      subject: payload.subject,
      body: payload.body,
      metadata:
        payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
          ? (payload.metadata as Record<string, unknown>)
          : undefined,
      idempotencyKey: payload.idempotencyKey,
      actorId: integrationActor?.id,
    })
    return response.ok(
      okEnvelope(
        { notificationId: result.notification.id, status: result.notification.status, deduplicated: result.deduplicated },
        result.deduplicated ? 'Notification already queued' : 'Notification queued'
      )
    )
  }

  async listNotifications({ response }: HttpContext) {
    const rows = await db.from('cis_notifications').orderBy('created_at', 'desc').limit(100)
    return response.ok(okEnvelope(rows))
  }

  async uploadFile({ request, response, integrationActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        fileName: vine.string().trim().minLength(1).maxLength(255),
        contentBase64: vine.string().trim().minLength(1),
        contentType: vine.string().trim().optional(),
        bucket: vine.string().trim().optional(),
        ownerType: vine.string().trim().optional(),
        ownerId: vine.string().trim().optional(),
      }),
      data: request.body(),
    })
    const buffer = Buffer.from(payload.contentBase64, 'base64')
    if (!buffer.byteLength) {
      return response.badRequest(
        errorEnvelope('contentBase64 decoded to empty buffer', [
          { field: 'contentBase64', message: 'invalid' },
        ])
      )
    }
    const stored = await storeFile({
      buffer,
      originalName: payload.fileName,
      contentType: payload.contentType ?? null,
      bucket: payload.bucket,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      actorId: integrationActor?.id,
    })
    return response.created(okEnvelope(stored, 'File stored'))
  }

  async getFileMeta({ params, response }: HttpContext) {
    const file = await getStoredFile(params.id)
    if (!file) return response.notFound(errorEnvelope('File not found'))
    return response.ok(okEnvelope(file))
  }

  async listAuditLogs({ request, response }: HttpContext) {
    const entityType = request.input('entityType')
    const q = db.from('cis_audit_logs').orderBy('created_at', 'desc').limit(100)
    if (entityType) q.where('entity_type', entityType)
    return response.ok(okEnvelope(await q))
  }

  async listClearanceTypes({ response }: HttpContext) {
    return response.ok(okEnvelope(await listRequirementTypes()))
  }

  async upsertClearanceRequirement({ request, response, integrationActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        requirementTypeCode: vine.string().trim().minLength(2).maxLength(60),
        subjectType: vine.string().trim().optional(),
        subjectKey: vine.string().trim().minLength(1).maxLength(80),
        status: vine.string().trim(),
        severityLevel: vine.string().trim().optional(),
        notes: vine.string().trim().optional(),
        sourceSystem: vine.string().trim().minLength(2).maxLength(60),
        idempotencyKey: vine.string().trim().minLength(8).maxLength(180),
      }),
      data: request.body(),
    })

    const idempotencyHeader = request.header('idempotency-key') ?? payload.idempotencyKey
    const scope = 'clearance.requirement.upsert'
    const cached = await findIdempotentResponse(scope, idempotencyHeader)
    if (cached) {
      return response.status(cached.response_status).send(cached.response_body)
    }

    const txnId = await logIntegrationTransaction({
      correlationId: request.header('x-request-id'),
      sourceSystem: payload.sourceSystem,
      targetSystem: 'platform-cis',
      operation: 'clearance.requirement.upsert',
      idempotencyKey: idempotencyHeader,
      status: 'processing',
      requestPayload: payload,
    })

    try {
      const result = await upsertClearanceRequirement({
        ...payload,
        idempotencyKey: idempotencyHeader,
        actorId: integrationActor?.id,
      })
      const body = okEnvelope(
        {
          requirement: result.requirement,
          evaluation: 'evaluation' in result ? result.evaluation : null,
          deduplicated: result.deduplicated,
        },
        result.deduplicated ? 'Idempotent replay' : 'Clearance requirement recorded'
      )
      await storeIdempotentResponse({
        scope,
        key: idempotencyHeader,
        requestHash: hashPayload(payload),
        responseStatus: 200,
        responseBody: body,
      })
      await updateIntegrationTransaction(txnId, {
        status: 'succeeded',
        httpStatus: 200,
        responsePayload: body,
      })
      return response.ok(body)
    } catch (error) {
      if (error instanceof IntegrationError) {
        const body = errorEnvelope(error.message, error.errors)
        await updateIntegrationTransaction(txnId, {
          status: 'failed',
          httpStatus: error.status,
          errorMessage: error.message,
          responsePayload: body,
        })
        return response.status(error.status).send(body)
      }
      await updateIntegrationTransaction(txnId, {
        status: 'failed',
        httpStatus: 500,
        errorMessage: error instanceof Error ? error.message : 'unknown',
      })
      throw error
    }
  }

  async getClearance({ params, request, response }: HttpContext) {
    const subjectType = request.input('subjectType', 'student')
    const evaluation = await evaluateClearance(subjectType, params.subjectKey)
    return response.ok(okEnvelope(evaluation))
  }

  async criticalEcho({ request, response, integrationActor }: HttpContext) {
    const payload = await vine.validate({
      schema: vine.object({
        operation: vine.string().trim().minLength(3).maxLength(80),
        reference: vine.string().trim().minLength(1).maxLength(120),
        amount: vine.number().optional(),
      }),
      data: request.body(),
    })
    const key = request.header('idempotency-key')
    if (!key) {
      return response.badRequest(
        errorEnvelope('Idempotency-Key header required for critical transactions', [
          { field: 'Idempotency-Key', message: 'required' },
        ])
      )
    }
    const scope = `critical.${payload.operation}`
    const cached = await findIdempotentResponse(scope, key)
    if (cached) {
      return response.status(cached.response_status).send(cached.response_body)
    }

    const body = okEnvelope(
      {
        accepted: true,
        operation: payload.operation,
        reference: payload.reference,
        amount: payload.amount ?? null,
        sourceSystem: integrationActor?.sourceSystem,
        note: 'Foundation echo only — no enrollment/finance posting is performed here.',
      },
      'Critical transaction accepted (idempotent foundation)'
    )
    await storeIdempotentResponse({
      scope,
      key,
      requestHash: hashPayload(payload),
      responseStatus: 200,
      responseBody: body,
    })
    await logIntegrationTransaction({
      sourceSystem: integrationActor?.sourceSystem ?? 'unknown',
      targetSystem: 'platform-cis',
      operation: scope,
      idempotencyKey: key,
      status: 'succeeded',
      httpStatus: 200,
      requestPayload: payload,
      responsePayload: body,
    })
    await writePlatformAudit({
      actorId: integrationActor?.id,
      action: 'critical.echo',
      entityType: 'critical_transaction',
      entityId: payload.reference,
      afterData: payload,
    })
    return response.ok(body)
  }
}
