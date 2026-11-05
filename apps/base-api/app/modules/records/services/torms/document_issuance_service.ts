import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/records/helpers/db_schema'
import { auditLogService } from '#modules/records/services/audit_log_service'
import { udmsDocumentClient } from '#modules/records/services/integrations/udms_document_client'
import { tormsNotificationService } from '#modules/records/services/torms/torms_notification_service'
import { torRequestService } from '#modules/records/services/torms/tor_request_service'
import { certRequestService } from '#modules/records/services/torms/cert_request_service'
import { getCertificationTypeDef } from '#modules/records/domain/torms/certification_types'
import {
  DOCUMENT_COMPLIANCE,
  DOCUMENT_SIGNATURE,
  STRUCTURED_DOCUMENT_DISCLAIMER,
  isTorCopyType,
  newIssuanceSerial,
  newVerificationCode,
  type TorCopyType,
} from '#modules/records/domain/torms/document_issuance'

function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

function maskStudentNumber(studentNumber: string) {
  const s = studentNumber.trim()
  if (s.length <= 4) return '****'
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}

export class DocumentIssuanceService {
  async listTorIssuances(organizationId: string, requestId: string) {
    return db
      .from(t('transcript_issuances'))
      .where({ organization_id: organizationId, request_id: requestId })
      .orderBy('created_at', 'desc')
  }

  async listCertIssuances(organizationId: string, requestId: string) {
    return db
      .from(t('certification_issuances'))
      .where({ organization_id: organizationId, request_id: requestId })
      .orderBy('created_at', 'desc')
  }

  async getIssuedTorForRequest(organizationId: string, requestId: string) {
    return db
      .from(t('transcript_issuances'))
      .where({
        organization_id: organizationId,
        request_id: requestId,
        issuance_status: 'issued',
      })
      .orderBy('issued_at', 'desc')
      .first()
  }

  async getIssuedCertForRequest(organizationId: string, requestId: string) {
    return db
      .from(t('certification_issuances'))
      .where({
        organization_id: organizationId,
        request_id: requestId,
        issuance_status: 'issued',
      })
      .orderBy('issued_at', 'desc')
      .first()
  }

  async generateTranscript(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    idOrNumber: string
    copyType?: string
  }) {
    if (!input.isStaff) throw httpError('Only authorized Registrar staff may generate transcripts', 403)

    const detail = await torRequestService.getByIdOrNumber({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      isStaff: true,
      idOrNumber: input.idOrNumber,
    })
    const request = detail.request
    if (request.status !== 'approved' && request.status !== 'released') {
      throw httpError('Transcript generation requires an approved request (TOR-025)', 422)
    }

    const copyType: TorCopyType = isTorCopyType(input.copyType ?? 'official')
      ? (input.copyType as TorCopyType)
      : 'official'

    const academic = await torRequestService.retrieveAcademicRecords({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      isStaff: true,
      idOrNumber: request.id,
      refreshFromUsis: true,
    })

    const ledger = (academic.ledgerProjection ?? []) as Array<Record<string, unknown>>
    if (ledger.length === 0) {
      throw httpError(
        'No academic ledger lines available from USiS projection; cannot generate transcript payload',
        422
      )
    }

    const signatory = await db
      .from(t('signatory_configs'))
      .where({
        organization_id: input.organizationId,
        document_kind: 'transcript',
        active: true,
      })
      .first()

    const now = new Date()
    const serial = newIssuanceSerial('TOR')
    const verificationCode = newVerificationCode()
    const usisStudent = (academic.usisStudent ?? null) as Record<string, unknown> | null

    const payload = {
      documentKind: 'transcript',
      copyType,
      complianceStatus: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
      signatureStatus: DOCUMENT_SIGNATURE.NOT_APPLIED,
      disclaimer: STRUCTURED_DOCUMENT_DISCLAIMER,
      templateRef: null,
      templateStatus: 'official_university_template_unavailable',
      request: {
        id: request.id,
        requestNumber: request.request_number,
        purpose: request.purpose,
        locality: request.locality,
        copies: request.copies,
      },
      student: {
        studentNumber: request.student_number,
        firstName: usisStudent?.firstName ?? usisStudent?.first_name ?? null,
        lastName: usisStudent?.lastName ?? usisStudent?.last_name ?? null,
        programCode:
          usisStudent?.programCode ??
          usisStudent?.program_code ??
          ledger[0]?.program_code ??
          null,
      },
      academicLines: ledger.map((line) => ({
        academicYear: line.academic_year,
        semester: line.semester,
        courseCode: line.course_code,
        courseTitle: line.course_title,
        units: line.units,
        grade: line.grade,
        remarks: line.remarks ?? null,
        programCode: line.program_code ?? null,
        sourceEntryId: line.source_entry_id ?? null,
      })),
      source: {
        academicSoR: 'USiS',
        retrievedAt: academic.retrievedAt,
        ownership: academic.ownership,
      },
      verificationCode,
      serialNumber: serial,
      generatedAt: now.toISOString(),
    }

    const [row] = await db
      .table(t('transcript_issuances'))
      .insert({
        organization_id: input.organizationId,
        request_id: request.id,
        student_number: request.student_number,
        copy_type: copyType,
        serial_number: serial,
        qr_or_verification_code: verificationCode,
        purpose: request.purpose,
        version: 1,
        signatory_block_json: signatory?.blocks_json ?? null,
        document_payload_json: payload,
        template_ref: null,
        compliance_status: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
        issuance_status: 'draft',
        signature_status: DOCUMENT_SIGNATURE.NOT_APPLIED,
        udms_document_id: null,
        issued_by: null,
        issued_at: null,
        created_at: now,
        updated_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.transcript.generated',
      entityType: 'transcript_issuance',
      entityId: row.id,
      metadata: {
        requestId: request.id,
        serialNumber: serial,
        complianceStatus: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
        lineCount: ledger.length,
      },
    })

    return {
      issuance: row,
      complianceNote: STRUCTURED_DOCUMENT_DISCLAIMER,
      officialTemplateAvailable: false,
      digitallySigned: false,
    }
  }

  async generateCertification(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    idOrNumber: string
  }) {
    if (!input.isStaff) {
      throw httpError('Only authorized Registrar staff may generate certifications', 403)
    }

    const detail = await certRequestService.getByIdOrNumber({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      isStaff: true,
      idOrNumber: input.idOrNumber,
    })
    const request = detail.request
    if (request.status !== 'approved' && request.status !== 'released') {
      throw httpError('Certification generation requires an approved request (TOR-025)', 422)
    }

    const typeDef = getCertificationTypeDef(String(request.certification_type))
    const academic = await certRequestService.retrieveAcademicRecords({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      isStaff: true,
      idOrNumber: request.id,
      refreshFromUsis: true,
    })

    const ledger = (academic.ledgerProjection ?? []) as Array<Record<string, unknown>>
    const now = new Date()
    const serial = newIssuanceSerial('CERT')
    const verificationCode = newVerificationCode()
    const usisStudent = (academic.usisStudent ?? null) as Record<string, unknown> | null

    const payload = {
      documentKind: 'certification',
      certificationType: request.certification_type,
      officialName: typeDef?.officialName ?? request.certification_type,
      complianceStatus: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
      signatureStatus: DOCUMENT_SIGNATURE.NOT_APPLIED,
      disclaimer: STRUCTURED_DOCUMENT_DISCLAIMER,
      templateRef: null,
      templateStatus: 'official_university_template_unavailable',
      request: {
        id: request.id,
        requestNumber: request.request_number,
        purpose: request.purpose,
        locality: request.locality,
        agency: request.agency,
        destinationCountry: request.destination_country,
        copies: request.copies,
      },
      student: {
        studentNumber: request.student_number,
        firstName: usisStudent?.firstName ?? usisStudent?.first_name ?? null,
        lastName: usisStudent?.lastName ?? usisStudent?.last_name ?? null,
        programCode: usisStudent?.programCode ?? usisStudent?.program_code ?? null,
      },
      academicFocus: typeDef?.academicFocus ?? 'full',
      academicLines: ledger.map((line) => ({
        academicYear: line.academic_year,
        semester: line.semester,
        courseCode: line.course_code,
        courseTitle: line.course_title,
        units: line.units,
        grade: line.grade,
        remarks: line.remarks ?? null,
      })),
      source: {
        academicSoR: 'USiS',
        retrievedAt: academic.retrievedAt,
        ownership: academic.ownership,
      },
      verificationCode,
      serialNumber: serial,
      generatedAt: now.toISOString(),
    }

    const [row] = await db
      .table(t('certification_issuances'))
      .insert({
        organization_id: input.organizationId,
        request_id: request.id,
        student_number: request.student_number,
        certification_type: request.certification_type,
        serial_number: serial,
        qr_code: verificationCode,
        document_payload_json: payload,
        template_ref: null,
        compliance_status: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
        issuance_status: 'draft',
        signature_status: DOCUMENT_SIGNATURE.NOT_APPLIED,
        udms_document_id: null,
        issued_by: null,
        issued_at: null,
        created_at: now,
        updated_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.certification.generated',
      entityType: 'certification_issuance',
      entityId: row.id,
      metadata: {
        requestId: request.id,
        serialNumber: serial,
        certificationType: request.certification_type,
        complianceStatus: DOCUMENT_COMPLIANCE.STRUCTURED_ONLY,
      },
    })

    return {
      issuance: row,
      complianceNote: STRUCTURED_DOCUMENT_DISCLAIMER,
      officialTemplateAvailable: false,
      digitallySigned: false,
    }
  }

  async issueTranscript(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    issuanceId: string
    releaseRequest?: boolean
  }) {
    if (!input.isStaff) throw httpError('Only authorized Registrar staff may issue transcripts', 403)

    const row = await db
      .from(t('transcript_issuances'))
      .where({ id: input.issuanceId, organization_id: input.organizationId })
      .first()
    if (!row) throw httpError('Transcript issuance not found', 404)
    if (row.issuance_status === 'issued') {
      throw httpError('Transcript already issued; use reprint authorization for additional prints', 409)
    }

    const now = new Date()
    let udmsDocumentId: string | null = null
    const store = await udmsDocumentClient.registerDocumentReference({
      organizationId: input.organizationId,
      metadata: {
        kind: 'transcript_issuance',
        serialNumber: row.serial_number,
        requestId: row.request_id,
        verificationCode: row.qr_or_verification_code,
        complianceStatus: row.compliance_status,
        note: 'Structured payload metadata only until DMS-010 / official template approved',
      },
    })
    if (store.ok) {
      const data = store.data as Record<string, unknown> | undefined
      udmsDocumentId =
        (data?.documentId as string) ??
        (data?.id as string) ??
        ((data?.data as Record<string, unknown> | undefined)?.documentId as string) ??
        null
    }

    const [updated] = await db
      .from(t('transcript_issuances'))
      .where('id', row.id)
      .update({
        issuance_status: 'issued',
        issued_by: input.actorUserId,
        issued_at: now,
        udms_document_id: udmsDocumentId,
        updated_at: now,
      })
      .returning('*')

    await db.table(t('issuance_print_logs')).insert({
      organization_id: input.organizationId,
      issuance_kind: 'transcript',
      issuance_id: row.id,
      action: 'issue',
      authorized_by: input.actorUserId,
      reason: 'Official issuance record (structured payload; template FC #1)',
      printed_at: now,
      created_at: now,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.transcript.issued',
      entityType: 'transcript_issuance',
      entityId: row.id,
      metadata: {
        serialNumber: row.serial_number,
        udmsDocumentId,
        udmsStoreAvailable: store.ok,
        digitallySigned: false,
      },
    })

    if (row.request_id) {
      const request = await db.from(t('tor_requests')).where('id', row.request_id).first()
      if (request) {
        await tormsNotificationService.enqueueRequestProgress({
          organizationId: input.organizationId,
          requestId: request.id,
          requestNumber: request.request_number,
          studentNumber: request.student_number,
          eventType: 'tor_request.issued',
          message: `Transcript issuance ${row.serial_number} recorded for ${request.request_number}`,
          actorUserId: input.actorUserId,
        })
      }
    }

    let released = null
    if (input.releaseRequest && row.request_id) {
      released = await torRequestService.transition({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        idOrNumber: row.request_id,
        toStatus: 'released',
        reason: `Released after issuance ${row.serial_number}`,
      })
    }

    return {
      issuance: updated,
      udms: { ok: store.ok, unavailable: Boolean((store as { unavailable?: boolean }).unavailable) },
      released,
      digitallySigned: false,
      officialTemplateApplied: false,
    }
  }

  async issueCertification(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    issuanceId: string
    releaseRequest?: boolean
  }) {
    if (!input.isStaff) {
      throw httpError('Only authorized Registrar staff may issue certifications', 403)
    }

    const row = await db
      .from(t('certification_issuances'))
      .where({ id: input.issuanceId, organization_id: input.organizationId })
      .first()
    if (!row) throw httpError('Certification issuance not found', 404)
    if (row.issuance_status === 'issued') {
      throw httpError('Certification already issued; use reprint authorization for additional prints', 409)
    }

    const now = new Date()
    let udmsDocumentId: string | null = null
    const store = await udmsDocumentClient.registerDocumentReference({
      organizationId: input.organizationId,
      metadata: {
        kind: 'certification_issuance',
        serialNumber: row.serial_number,
        requestId: row.request_id,
        verificationCode: row.qr_code,
        certificationType: row.certification_type,
        complianceStatus: row.compliance_status,
        note: 'Structured payload metadata only until DMS-010 / official template approved',
      },
    })
    if (store.ok) {
      const data = store.data as Record<string, unknown> | undefined
      udmsDocumentId =
        (data?.documentId as string) ??
        (data?.id as string) ??
        ((data?.data as Record<string, unknown> | undefined)?.documentId as string) ??
        null
    }

    const [updated] = await db
      .from(t('certification_issuances'))
      .where('id', row.id)
      .update({
        issuance_status: 'issued',
        issued_by: input.actorUserId,
        issued_at: now,
        udms_document_id: udmsDocumentId,
        updated_at: now,
      })
      .returning('*')

    await db.table(t('issuance_print_logs')).insert({
      organization_id: input.organizationId,
      issuance_kind: 'certification',
      issuance_id: row.id,
      action: 'issue',
      authorized_by: input.actorUserId,
      reason: 'Official issuance record (structured payload; template FC #1)',
      printed_at: now,
      created_at: now,
    })

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'torms.certification.issued',
      entityType: 'certification_issuance',
      entityId: row.id,
      metadata: {
        serialNumber: row.serial_number,
        udmsDocumentId,
        udmsStoreAvailable: store.ok,
        digitallySigned: false,
      },
    })

    if (row.request_id) {
      const request = await db.from(t('certification_requests')).where('id', row.request_id).first()
      if (request) {
        await tormsNotificationService.enqueueRequestProgress({
          organizationId: input.organizationId,
          requestId: request.id,
          requestNumber: request.request_number,
          studentNumber: request.student_number,
          eventType: 'cert_request.issued',
          message: `Certification issuance ${row.serial_number} recorded for ${request.request_number}`,
          actorUserId: input.actorUserId,
        })
      }
    }

    let released = null
    if (input.releaseRequest && row.request_id) {
      released = await certRequestService.transition({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        idOrNumber: row.request_id,
        toStatus: 'released',
        reason: `Released after issuance ${row.serial_number}`,
      })
    }

    return {
      issuance: updated,
      udms: { ok: store.ok, unavailable: Boolean((store as { unavailable?: boolean }).unavailable) },
      released,
      digitallySigned: false,
      officialTemplateApplied: false,
    }
  }

  async logPrint(input: {
    organizationId: string
    actorUserId: string
    isStaff: boolean
    issuanceKind: 'transcript' | 'certification'
    issuanceId: string
    action: 'print' | 'reprint'
    reason?: string | null
  }) {
    if (!input.isStaff) throw httpError('Only authorized staff may log print/reprint', 403)
    if (input.action === 'reprint' && !input.reason?.trim()) {
      throw httpError('Reprint requires an authorization reason (TOR-012)', 422)
    }

    const table =
      input.issuanceKind === 'transcript' ? 'transcript_issuances' : 'certification_issuances'
    const row = await db
      .from(t(table))
      .where({ id: input.issuanceId, organization_id: input.organizationId })
      .first()
    if (!row) throw httpError('Issuance not found', 404)
    if (row.issuance_status !== 'issued') {
      throw httpError('Print/reprint allowed only after issuance', 422)
    }

    const now = new Date()
    const [log] = await db
      .table(t('issuance_print_logs'))
      .insert({
        organization_id: input.organizationId,
        issuance_kind: input.issuanceKind,
        issuance_id: input.issuanceId,
        action: input.action,
        authorized_by: input.actorUserId,
        reason: input.reason ?? null,
        printed_at: now,
        created_at: now,
      })
      .returning('*')

    await auditLogService.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: `torms.${input.issuanceKind}.${input.action}`,
      entityType: `${input.issuanceKind}_issuance`,
      entityId: input.issuanceId,
      metadata: { reason: input.reason ?? null },
    })

    return log
  }

  async verifyPublic(input: { codeOrRef: string; requesterMeta?: Record<string, unknown> | null }) {
    const code = input.codeOrRef.trim()
    if (!code) throw httpError('Verification code or serial is required', 422)

    const tor = await db
      .from(t('transcript_issuances'))
      .where('qr_or_verification_code', code)
      .orWhere('serial_number', code)
      .first()

    const cert = tor
      ? null
      : await db
          .from(t('certification_issuances'))
          .where('qr_code', code)
          .orWhere('serial_number', code)
          .first()

    const now = new Date()
    if (!tor && !cert) {
      await db.table(t('public_verification_logs')).insert({
        code_or_ref: code,
        result: 'not_found',
        requester_meta: input.requesterMeta ?? null,
        verified_at: now,
        created_at: now,
      })
      return {
        authentic: false,
        result: 'not_found',
        message: 'No matching issued document reference',
      }
    }

    const row = tor ?? cert!
    const kind = tor ? 'transcript' : 'certification'
    if (row.issuance_status !== 'issued') {
      await db.table(t('public_verification_logs')).insert({
        code_or_ref: code,
        result: 'not_issued',
        requester_meta: input.requesterMeta ?? null,
        verified_at: now,
        created_at: now,
      })
      return {
        authentic: false,
        result: 'not_issued',
        message: 'Document reference exists but has not been issued',
      }
    }

    await db.table(t('public_verification_logs')).insert({
      code_or_ref: code,
      result: 'valid',
      requester_meta: input.requesterMeta ?? null,
      verified_at: now,
      created_at: now,
    })

    await auditLogService.log({
      organizationId: row.organization_id,
      actorUserId: null,
      action: 'torms.public_verification',
      entityType: `${kind}_issuance`,
      entityId: row.id,
      metadata: { result: 'valid', codeOrRef: code },
    })

    return {
      authentic: true,
      result: 'valid',
      documentKind: kind,
      serialNumber: row.serial_number,
      issuedAt: row.issued_at,
      studentNumberMasked: maskStudentNumber(String(row.student_number)),
      certificationType: cert ? cert.certification_type : undefined,
      copyType: tor ? tor.copy_type : undefined,
      complianceStatus: row.compliance_status,
      signatureStatus: row.signature_status,
      officialTemplateApplied: false,
      note: 'Verification confirms issuance reference only. Official print authenticity depends on University-approved template and signing (FC #1, #15).',
    }
  }
}

export const documentIssuanceService = new DocumentIssuanceService()
