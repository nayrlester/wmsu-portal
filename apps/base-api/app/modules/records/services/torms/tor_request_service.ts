import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'
import { academicSyncService } from '#modules/records/services/torms/academic_sync_service'
import { usisAcademicClient } from '#modules/records/services/integrations/usis_academic_client'
import { platformClearanceClient } from '#modules/records/services/integrations/platform_clearance_client'
import { ufmsPaymentClient } from '#modules/records/services/integrations/ufms_payment_client'
import { tormsNotificationService } from '#modules/records/services/torms/torms_notification_service'
import {
  FIRST_REQUEST_TAG,
  canTransitionTorRequest,
  isTorRequestStatus,
  type TorLocality,
  type TorRequestStatus,
} from '#modules/records/domain/torms/tor_request_status'

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

function newRequestNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `TOR-${day}-${suffix}`
}

export class TorRequestService {
  async submit(input: {
    organizationId: string
    requesterUserId: string
    studentNumber: string
    purpose: string
    locality?: TorLocality
    agency?: string | null
    destinationCountry?: string | null
    urgency?: string | null
    copies?: number
    isFirstRequestAfterGraduation?: boolean
  }) {
    const studentNumber = input.studentNumber.trim()
    if (!studentNumber) throw httpError('studentNumber is required', 422)
    if (!input.purpose?.trim()) throw httpError('purpose is required', 422)

    const locality: TorLocality = input.locality === 'foreign' ? 'foreign' : 'local'
    if (locality === 'foreign' && !input.destinationCountry?.trim()) {
      throw httpError('destinationCountry is required for foreign requests (TOR-022)', 422)
    }

    const usis = await usisAcademicClient.exportStudentGrades(studentNumber, input.organizationId)
    if (!usis.ok) {
      throw httpError(
        usis.unavailable
          ? `USiS unavailable; cannot validate student reference (${usis.error})`
          : `Student reference could not be validated in USiS (${usis.error})`,
        usis.unavailable ? 503 : 422
      )
    }

    const usisStudent = usis.data?.data?.student
    const usisNumber = String(
      usisStudent?.studentNumber ?? usisStudent?.student_number ?? studentNumber
    )
    if (usisNumber && usisNumber !== studentNumber) {
      throw httpError('USiS student number does not match requested student reference', 422)
    }

    const gradesRaw = usis.data?.data?.grades ?? []
    await academicSyncService.ingestGrades({
      organizationId: input.organizationId,
      studentNumber,
      actorUserId: input.requesterUserId,
      source: 'usis_pull_on_tor_submit',
      grades: gradesRaw.map((g) => ({
        academicYear: String(g.academicYear ?? g.academic_year ?? ''),
        semester: Number(g.semester ?? 0),
        courseCode: String(g.courseCode ?? g.course_code ?? ''),
        courseTitle: String(g.courseTitle ?? g.course_title ?? ''),
        units: Number(g.units ?? 0),
        grade:
          g.grade === null || g.grade === undefined
            ? g.numericGrade === null || g.numericGrade === undefined
              ? null
              : Number(g.numericGrade)
            : Number(g.grade),
        remarks: (g.remarks as string | null) ?? null,
        sourceEntryId: (g.sourceEntryId as string | null) ?? (g.id as string | null) ?? '',
        originalGrade:
          g.originalGrade === null || g.originalGrade === undefined
            ? null
            : Number(g.originalGrade),
        modifiedGrade:
          g.modifiedGrade === null || g.modifiedGrade === undefined ? null : Number(g.modifiedGrade),
        programCode:
          (g.programCode as string | null) ??
          (usisStudent?.programCode as string | null) ??
          null,
      })),
    })

    const alumni = await db
      .from(t('alumni_profiles'))
      .where({
        organization_id: input.organizationId,
        student_number: studentNumber,
      })
      .first()

    const priorReleased = await db
      .from(t('tor_requests'))
      .where({
        organization_id: input.organizationId,
        student_number: studentNumber,
        status: 'released',
      })
      .first()

    const afterGraduation =
      input.isFirstRequestAfterGraduation === true || Boolean(alumni)
    const firstRequest =
      afterGraduation && !priorReleased ? FIRST_REQUEST_TAG : null

    const pendingDuplicate = await db
      .from(t('tor_requests'))
      .where({
        organization_id: input.organizationId,
        student_number: studentNumber,
        requester_user_id: input.requesterUserId,
        status: 'pending',
        purpose: input.purpose.trim(),
      })
      .first()

    if (pendingDuplicate) {
      throw httpError(
        `A pending TOR request already exists for this student and purpose (${pendingDuplicate.request_number})`,
        409
      )
    }

    const now = new Date()
    const requestNumber = newRequestNumber()
    const [row] = await db
      .table(t('tor_requests'))
      .insert({
        organization_id: input.organizationId,
        request_number: requestNumber,
        student_number: studentNumber,
        purpose: input.purpose.trim(),
        status: 'pending',
        requester_user_id: input.requesterUserId,
        locality,
        agency: input.agency?.trim() || null,
        destination_country: input.destinationCountry?.trim() || null,
        urgency: input.urgency?.trim() || null,
        copies: Math.max(1, Number(input.copies ?? 1)),
        first_request_tag: firstRequest,
        payment_status: 'Unpaid',
        clearance_status: null,
        requested_at: now,
        created_at: now,
      })
      .returning('*')

    await this.appendStatusHistory({
      organizationId: input.organizationId,
      requestId: row.id,
      fromStatus: null,
      toStatus: 'pending',
      actorUserId: input.requesterUserId,
      reason: 'Request submitted',
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.requesterUserId,
      action: 'torms.tor_request.submitted',
      entityType: 'tor_request',
      entityId: row.id,
      metadata: {
        requestNumber,
        studentNumber,
        locality,
        firstRequestTag: firstRequest,
      },
    })

    await tormsNotificationService.enqueueRequestProgress({
      organizationId: input.organizationId,
      requestId: row.id,
      requestNumber,
      studentNumber,
      eventType: 'tor_request.submitted',
      message: `Transcript request ${requestNumber} submitted`,
      actorUserId: input.requesterUserId,
    })

    return {
      request: row,
      usisStudent: usisStudent ?? { studentNumber },
      academicSync: {
        gradesRetrieved: gradesRaw.length,
        source: 'USiS',
        incomplete: false,
      },
    }
  }

  async list(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    status?: string
    studentNumber?: string
    requestNumber?: string
    mineOnly?: boolean
    limit?: number
  }) {
    const q = db.from(t('tor_requests')).where('organization_id', input.organizationId)
    if (!input.isStaff || input.mineOnly) {
      q.andWhere('requester_user_id', input.actorUserId)
    }
    if (input.status) q.andWhere('status', input.status)
    if (input.studentNumber) q.andWhere('student_number', input.studentNumber)
    if (input.requestNumber) q.andWhere('request_number', input.requestNumber)
    return q.orderBy('requested_at', 'desc').limit(Math.min(200, input.limit ?? 50))
  }

  async getByIdOrNumber(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    idOrNumber: string
  }) {
    const key = input.idOrNumber.trim()
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    const row = await db
      .from(t('tor_requests'))
      .where('organization_id', input.organizationId)
      .andWhere((builder) => {
        if (looksLikeUuid) {
          builder.where('id', key).orWhere('request_number', key)
        } else {
          builder.where('request_number', key)
        }
      })
      .first()

    if (!row) throw httpError('Transcript request not found', 404)
    if (!input.isStaff && row.requester_user_id !== input.actorUserId) {
      throw httpError('Not authorized to view this request', 403)
    }

    const history = await db
      .from(t('document_request_status_history'))
      .where({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: row.id,
      })
      .orderBy('transitioned_at', 'asc')

    const attachments = await db
      .from(t('document_request_attachments'))
      .where({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: row.id,
      })
      .orderBy('created_at', 'asc')

    const clearanceChecks = await db
      .from(t('document_request_clearance_checks'))
      .where({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: row.id,
      })
      .orderBy('checked_at', 'desc')
      .limit(10)

    const payments = await db
      .from(t('document_request_payments'))
      .where({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: row.id,
      })
      .orderBy('created_at', 'desc')
      .limit(10)

    return { request: row, history, attachments, clearanceChecks, payments }
  }

  async retrieveAcademicRecords(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    idOrNumber: string
    refreshFromUsis?: boolean
  }) {
    const detail = await this.getByIdOrNumber(input)
    const studentNumber = detail.request.student_number as string
    const retrievedAt = new Date().toISOString()

    let usisLive: Record<string, unknown> | null = null
    let incomplete = false
    let source: 'USiS' | 'TORMS_LEDGER_PROJECTION' = 'TORMS_LEDGER_PROJECTION'
    let syncMeta: Record<string, unknown> | null = null

    if (input.refreshFromUsis !== false) {
      const pull = await academicSyncService.pullFromUsis({
        organizationId: input.organizationId,
        studentNumber,
        actorUserId: input.actorUserId,
      })
      if (pull.ok) {
        source = 'USiS'
        syncMeta = {
          syncRunId: pull.syncRunId,
          upserted: pull.upserted,
          discrepancies: pull.discrepancies,
        }
        const live = await usisAcademicClient.exportStudentGrades(studentNumber, input.organizationId)
        if (live.ok) usisLive = (live.data?.data as Record<string, unknown>) ?? null
      } else {
        incomplete = true
        syncMeta = { error: pull.error, unavailable: pull.unavailable, syncRunId: pull.syncRunId }
      }
    }

    const ledger = await db
      .from(t('academic_ledger_lines'))
      .where({
        organization_id: input.organizationId,
        student_number: studentNumber,
      })
      .orderBy('academic_year', 'asc')
      .orderBy('semester', 'asc')

    if (!ledger.length) incomplete = true

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.academic.retrieved',
      entityType: 'tor_request',
      entityId: detail.request.id,
      metadata: {
        studentNumber,
        source,
        incomplete,
        ledgerLines: ledger.length,
      },
    })

    return {
      requestNumber: detail.request.request_number,
      studentNumber,
      source,
      retrievedAt,
      incomplete,
      warning: incomplete
        ? 'Academic history may be incomplete; do not treat as a complete official transcript source'
        : null,
      usisStudent: usisLive?.student ?? null,
      usisGwa: usisLive?.gwa ?? null,
      ledgerProjection: ledger,
      syncMeta,
      ownership: {
        academicSoR: 'USiS',
        torRequestSoR: 'TORMS',
        note: 'Ledger lines are projections; grades are not editable in TORMS',
      },
    }
  }

  async transition(input: {
    organizationId: string
    actorUserId: string
    idOrNumber: string
    toStatus: string
    reason?: string | null
    clearanceOverride?: boolean
    paymentOverride?: boolean
  }) {
    if (!isTorRequestStatus(input.toStatus)) {
      throw httpError(`Invalid status. Allowed: pending, processing, approved, released`, 422)
    }
    const toStatus = input.toStatus

    const detail = await this.getByIdOrNumber({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      isStaff: true,
      idOrNumber: input.idOrNumber,
    })
    const fromStatus = detail.request.status as TorRequestStatus
    if (!isTorRequestStatus(fromStatus)) {
      throw httpError(`Request has invalid stored status: ${fromStatus}`, 500)
    }
    if (!canTransitionTorRequest(fromStatus, toStatus)) {
      throw httpError(`Transition from ${fromStatus} to ${toStatus} is not permitted`, 422)
    }

    if (toStatus === 'processing') {
      await this.runClearanceCheck({
        organizationId: input.organizationId,
        requestId: detail.request.id,
        studentNumber: detail.request.student_number,
        actorUserId: input.actorUserId,
        override: Boolean(input.clearanceOverride),
        reason: input.reason,
      })
      if (detail.request.first_request_tag === FIRST_REQUEST_TAG) {
        const physical = await db
          .from(t('document_request_attachments'))
          .where({
            organization_id: input.organizationId,
            request_kind: 'tor',
            request_id: detail.request.id,
            kind: 'primary_physical_confirm',
            status: 'verified',
          })
          .first()
        if (!physical) {
          throw httpError(
            'First Request - With Physical Document Requirement: Registrar must confirm primary physical documents before processing (TOR-023)',
            422
          )
        }
      }
    }

    if (toStatus === 'approved') {
      await this.assertPaymentGate({
        organizationId: input.organizationId,
        request: detail.request,
        actorUserId: input.actorUserId,
        override: Boolean(input.paymentOverride),
        reason: input.reason,
      })
      const clearance = detail.request.clearance_status as string | null
      if (clearance === 'With Deficiency' && !input.clearanceOverride) {
        throw httpError(
          'Clearance status With Deficiency blocks approval unless authorized (TOR-024)',
          422
        )
      }
      if (
        (!clearance || clearance === 'unavailable') &&
        !(input.clearanceOverride && input.reason?.trim())
      ) {
        throw httpError(
          'Clearance must be Cleared or Conditionally Cleared before approval, or provide authorized clearanceOverride with reason when CIS is unavailable (TOR-024/025)',
          422
        )
      }
    }

    if (toStatus === 'released') {
      const issued = await db
        .from(t('transcript_issuances'))
        .where({
          organization_id: input.organizationId,
          request_id: detail.request.id,
          issuance_status: 'issued',
        })
        .first()
      if (!issued) {
        throw httpError(
          'Release requires an issued transcript document for this request (generate + issue first)',
          422
        )
      }
    }

    const now = new Date()
    const [updated] = await db
      .from(t('tor_requests'))
      .where('id', detail.request.id)
      .update({
        status: toStatus,
        processed_by: input.actorUserId,
        released_at: toStatus === 'released' ? now : detail.request.released_at,
        updated_at: now,
      })
      .returning('*')

    await this.appendStatusHistory({
      organizationId: input.organizationId,
      requestId: detail.request.id,
      fromStatus,
      toStatus,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.tor_request.status_changed',
      entityType: 'tor_request',
      entityId: detail.request.id,
      metadata: { fromStatus, toStatus, reason: input.reason ?? null },
    })

    await tormsNotificationService.enqueueRequestProgress({
      organizationId: input.organizationId,
      requestId: detail.request.id,
      requestNumber: updated.request_number,
      studentNumber: updated.student_number,
      eventType: `tor_request.${toStatus}`,
      message: `Transcript request ${updated.request_number} is now ${toStatus}`,
      actorUserId: input.actorUserId,
    })

    return updated
  }

  async confirmPhysicalDocument(input: {
    organizationId: string
    actorUserId: string
    idOrNumber: string
    notes?: string | null
  }) {
    const detail = await this.getByIdOrNumber({
      ...input,
      isStaff: true,
    })
    const now = new Date()
    const [row] = await db
      .table(t('document_request_attachments'))
      .insert({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: detail.request.id,
        kind: 'primary_physical_confirm',
        udms_document_id: null,
        status: 'verified',
        confirmed_by: input.actorUserId,
        received_at: now,
        created_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.tor_request.physical_confirmed',
      entityType: 'tor_request',
      entityId: detail.request.id,
      metadata: { notes: input.notes ?? null },
    })

    return row
  }

  async addSupportingDocumentRef(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    idOrNumber: string
    udmsDocumentId: string
    kind?: string
  }) {
    if (!input.udmsDocumentId?.trim()) throw httpError('udmsDocumentId is required', 422)
    const detail = await this.getByIdOrNumber(input)
    const now = new Date()
    const [row] = await db
      .table(t('document_request_attachments'))
      .insert({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: detail.request.id,
        kind: input.kind?.trim() || 'secondary_upload',
        udms_document_id: input.udmsDocumentId.trim(),
        status: 'pending',
        confirmed_by: null,
        received_at: now,
        created_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.tor_request.attachment_ref_added',
      entityType: 'tor_request',
      entityId: detail.request.id,
      metadata: { udmsDocumentId: input.udmsDocumentId.trim(), kind: row.kind },
    })

    return row
  }

  async verifyPayment(input: {
    organizationId: string
    actorUserId: string
    idOrNumber: string
    paymentRef: string
    orNumber?: string | null
  }) {
    const detail = await this.getByIdOrNumber({
      ...input,
      isStaff: true,
    })
    const result = await ufmsPaymentClient.verifyPaymentReference({
      organizationId: input.organizationId,
      paymentRef: input.paymentRef,
      orNumber: input.orNumber ?? undefined,
    })

    const now = new Date()
    let paymentStatus = 'Pending Verification'
    if (!result.ok) {
      paymentStatus = result.unavailable ? 'Pending Verification' : 'Unpaid'
    } else {
      const data = result.data as Record<string, unknown>
      const status = String(data.status ?? data.paymentStatus ?? data.payment_status ?? '')
      if (/paid[-_ ]?verified/i.test(status) || status.toLowerCase() === 'paid') {
        paymentStatus = 'Paid-Verified'
      } else if (/pending/i.test(status)) {
        paymentStatus = 'Pending Verification'
      } else {
        paymentStatus = 'Unpaid'
      }
    }

    const [payment] = await db
      .table(t('document_request_payments'))
      .insert({
        organization_id: input.organizationId,
        request_kind: 'tor',
        request_id: detail.request.id,
        payment_status: paymentStatus,
        channel: 'ufms_verify',
        or_number: input.orNumber ?? null,
        ufms_payment_ref: input.paymentRef,
        verified_at: paymentStatus === 'Paid-Verified' ? now : null,
        created_at: now,
        updated_at: now,
      })
      .returning('*')

    await db
      .from(t('tor_requests'))
      .where('id', detail.request.id)
      .update({ payment_status: paymentStatus, updated_at: now })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.tor_request.payment_verified',
      entityType: 'tor_request',
      entityId: detail.request.id,
      metadata: {
        paymentStatus,
        ufmsOk: result.ok,
        unavailable: 'unavailable' in result ? result.unavailable : false,
        contract: result.contract,
      },
    })

    if (!result.ok) {
      return {
        payment,
        verification: {
          ok: false,
          error: result.error,
          unavailable: result.unavailable,
          contract: result.contract,
        },
      }
    }

    return {
      payment,
      verification: { ok: true, contract: result.contract },
    }
  }

  private async runClearanceCheck(input: {
    organizationId: string
    requestId: string
    studentNumber: string
    actorUserId: string
    override: boolean
    reason?: string | null
  }) {
    const result = await platformClearanceClient.getClearance(input.studentNumber)
    const now = new Date()
    let status = 'unavailable'
    let breakdown: Record<string, unknown> | null = null

    if (result.ok) {
      const data = result.data as Record<string, unknown>
      const raw = String(
        data.status ?? data.clearanceStatus ?? data.clearance_status ?? data.overallStatus ?? ''
      )
      if (/conditionally/i.test(raw)) status = 'Conditionally Cleared'
      else if (/deficit|deficien|hold|block/i.test(raw)) status = 'With Deficiency'
      else if (/clear/i.test(raw)) status = 'Cleared'
      else status = raw || 'unavailable'
      breakdown = data
    }

    await db.table(t('document_request_clearance_checks')).insert({
      organization_id: input.organizationId,
      request_kind: 'tor',
      request_id: input.requestId,
      status,
      breakdown_json: breakdown,
      authorized_override: input.override && status === 'With Deficiency',
      checked_by: input.actorUserId,
      external_ref: result.ok ? 'platform_clearance' : null,
      checked_at: now,
      created_at: now,
    })

    await db
      .from(t('tor_requests'))
      .where('id', input.requestId)
      .update({ clearance_status: status, updated_at: now })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.tor_request.clearance_checked',
      entityType: 'tor_request',
      entityId: input.requestId,
      metadata: {
        status,
        unavailable: !result.ok,
        override: input.override,
      },
    })

    if (status === 'With Deficiency' && !input.override) {
      throw httpError(
        'Clearance status With Deficiency blocks processing unless authorized (TOR-024)',
        422
      )
    }
    if (status === 'unavailable' && !input.override) {
      throw httpError(
        `Clearance service unavailable (${'error' in result ? result.error : 'unknown'}). Processing blocked until clearance is retrieved or authorized.`,
        503
      )
    }
  }

  private async assertPaymentGate(input: {
    organizationId: string
    request: Record<string, unknown>
    actorUserId: string
    override: boolean
    reason?: string | null
  }) {
    const paymentStatus = String(input.request.payment_status ?? 'Unpaid')
    if (paymentStatus === 'Paid-Verified') return
    if (input.override) {
      await auditLogService.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'torms.tor_request.payment_override',
        entityType: 'tor_request',
        entityId: String(input.request.id),
        metadata: { reason: input.reason ?? null, priorStatus: paymentStatus },
      })
      return
    }
    throw httpError(
      'Payment must be Paid-Verified before approval, or properly authorized (TOR-026). Verify via UFMS or supply authorized override with reason.',
      422
    )
  }

  private async appendStatusHistory(input: {
    organizationId: string
    requestId: string
    fromStatus: string | null
    toStatus: string
    actorUserId: string
    reason?: string | null
  }) {
    const now = new Date()
    await db.table(t('document_request_status_history')).insert({
      organization_id: input.organizationId,
      request_kind: 'tor',
      request_id: input.requestId,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      actor_user_id: input.actorUserId,
      reason: input.reason ?? null,
      transitioned_at: now,
      created_at: now,
    })
  }
}

export const torRequestService = new TorRequestService()
