import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { fetchJson } from '#modules/records/services/integrations/http_json_client'
import DocumentType from '#modules/documents/models/document_type'
import Department from '#modules/documents/models/department'
import Document from '#modules/documents/models/document'
import DocumentVersion from '#modules/documents/models/document_version'
import DocumentFile from '#modules/documents/models/document_file'
import RoutingEntry from '#modules/documents/models/routing_entry'
import DocumentsUser from '#modules/documents/models/user'

function optionalEnv(name: string) {
  const value = process.env[name]
  return value === undefined || value.trim() === '' ? undefined : value.trim()
}

/**
 * UDMS document store/retrieve client (INT-TOR-09 / DMS-010).
 * Does not create a parallel document repository. Returns unavailable when payload contract path unset.
 */
export class UdmsDocumentClient {
  private baseUrl() {
    return (optionalEnv('UDMS_API_URL') ?? '').replace(/\/$/, '')
  }

  private serviceKey() {
    return optionalEnv('UDMS_SERVICE_API_KEY') ?? optionalEnv('SERVICE_API_KEY') ?? ''
  }

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceKey())
  }

  async archiveReadiness() {
    const storePath = optionalEnv('UDMS_DOCUMENT_STORE_PATH')
    const httpConfigured = this.isConfigured() && Boolean(storePath)
    const [typeRow] = await DocumentType.query().count('* as total')
    const [officeRow] = await Department.query().count('* as total')
    const documentTypes = Number(typeRow.$extras.total ?? 0)
    const offices = Number(officeRow.$extras.total ?? 0)
    const repositoryRoute = '/api/v1/documents/udms/repository/register'

    let reason =
      'Document archive is not connected. TORMS did not create a document.'
    const localReady = await this.repositoryOwner()
    if (httpConfigured) {
      reason =
        'Document archive uses the configured service store path.'
    } else if (!localReady) {
      reason =
        'Document archive is not connected. A document type, office, or documents user is missing, so TORMS did not create a document.'
    } else {
      reason =
        'Document archive uses the existing documents register. No separate file store is configured.'
    }

    return {
      available: httpConfigured || Boolean(localReady),
      httpConfigured,
      documentTypes,
      offices,
      repositoryRoute,
      reason,
    }
  }

  async resolveDocumentReference(documentId: string) {
    const path = optionalEnv('UDMS_DOCUMENT_RESOLVE_PATH')
    if (!this.isConfigured() || !path) {
      const document = await Document.find(documentId)
      if (!document) {
        return {
          ok: false as const,
          status: null,
          error:
            'UDMS document resolve path is not configured, and this id is not in the documents register.',
          unavailable: true,
          contract: 'INT-TOR-09' as const,
        }
      }
      return {
        ok: true as const,
        status: 200,
        data: {
          id: document.id,
          trackingNumber: document.trackingNumber,
          title: document.title,
        },
        contract: 'INT-TOR-09' as const,
      }
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`.replace(
      ':documentId',
      encodeURIComponent(documentId)
    )
    const result = await fetchJson<Record<string, unknown>>(url, {
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      timeoutMs: Number(optionalEnv('UDMS_HTTP_TIMEOUT_MS') ?? 8_000),
    })

    return { ...result, contract: 'INT-TOR-09' as const }
  }

  async registerDocumentReference(input: {
    organizationId: string
    metadata: Record<string, unknown>
  }) {
    const path = optionalEnv('UDMS_DOCUMENT_STORE_PATH')
    if (!this.isConfigured() || !path) {
      if (input.metadata.probe === true) {
        return {
          ok: false as const,
          status: null,
          error:
            'UDMS document store path is not configured. TORMS will not invent a local blob store (TOR-003 / DMS-010).',
          unavailable: true,
          contract: 'INT-TOR-09' as const,
        }
      }
      return this.registerInExistingRepository(input)
    }

    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
    const result = await fetchJson<Record<string, unknown>>(url, {
      method: 'POST',
      headers: { 'X-Service-Api-Key': this.serviceKey() },
      body: input,
      timeoutMs: Number(optionalEnv('UDMS_HTTP_TIMEOUT_MS') ?? 8_000),
    })

    return { ...result, contract: 'INT-TOR-09' as const }
  }

  async saveAcademicReference(studentNumber: string) {
    return this.registerDocumentReference({
      organizationId: '',
      metadata: {
        kind: 'academic_ledger_reference',
        studentNumber: studentNumber.trim(),
        source: 'torms',
        note: 'Metadata reference only. No file was stored.',
      },
    })
  }

  private async repositoryOwner() {
    const documentType = await DocumentType.query().orderBy('created_at', 'asc').first()
    if (!documentType) return null
    const office = await Department.query().where('tenant_id', documentType.tenantId).orderBy('created_at', 'asc').first()
    if (!office) return null
    const owner = await DocumentsUser.query().where('tenant_id', documentType.tenantId).orderBy('created_at', 'asc').first()
    if (!owner) return null
    return { documentType, office, owner }
  }

  private async registerInExistingRepository(input: {
    organizationId: string
    metadata: Record<string, unknown>
  }) {
    const owner = await this.repositoryOwner()
    if (!owner) {
      return {
        ok: false as const,
        status: null,
        error:
          'Document archive is not connected. A document type, office, or documents user is missing, so TORMS did not create a document.',
        unavailable: true,
        contract: 'INT-TOR-09' as const,
      }
    }

    const kind = String(input.metadata.kind ?? 'records_reference')
    const serialNumber = typeof input.metadata.serialNumber === 'string' ? input.metadata.serialNumber.trim() : ''
    const studentNumber = typeof input.metadata.studentNumber === 'string' ? input.metadata.studentNumber.trim() : ''
    if (!serialNumber && !studentNumber) {
      return {
        ok: false as const,
        status: null,
        error: 'An archive reference needs a serial number or a student number.',
        unavailable: true,
        contract: 'INT-TOR-09' as const,
      }
    }

    const existingQuery = Document.query().where('tenant_id', owner.documentType.tenantId)
    if (serialNumber) existingQuery.whereRaw("metadata->>'serialNumber' = ?", [serialNumber])
    else {
      existingQuery
        .whereRaw("metadata->>'kind' = ?", [kind])
        .whereRaw("metadata->>'studentNumber' = ?", [studentNumber])
    }
    const existing = await existingQuery.first()
    if (existing) {
      return {
        ok: true as const,
        status: 200,
        data: {
          id: existing.id,
          documentId: existing.id,
          trackingNumber: existing.trackingNumber,
          created: false,
        },
        contract: 'INT-TOR-09' as const,
      }
    }

    try {
      const trackingNumber = `TORMS-${DateTime.now().year}-${randomUUID().slice(0, 8).toUpperCase()}`
      const document = await Document.create({
        tenantId: owner.documentType.tenantId,
        trackingNumber,
        title: serialNumber
          ? `Records reference ${serialNumber}`
          : `Academic record reference ${studentNumber}`,
        description: 'Metadata reference only. No file was stored.',
        status: 'draft',
        priority: 'medium',
        documentTypeId: owner.documentType.id,
        departmentId: owner.office.id,
        createdById: owner.owner.id,
        metadata: input.metadata,
        sourceType: 'upload',
        visibility: 'private',
        originatingOfficeId: owner.office.id,
        receivingOfficeId: owner.office.id,
        documentDate: DateTime.now().startOf('day'),
        receivedAt: DateTime.now(),
        subjectKeywords: studentNumber || serialNumber,
        confidentiality: 'internal',
        napCategory: 'academic_instructional',
      })
      await DocumentVersion.create({
        tenantId: document.tenantId,
        documentId: document.id,
        versionNumber: 1,
        versionMinor: 0,
        status: 'draft',
        changeNotes: 'Metadata reference only. No file was stored.',
        sourceType: 'upload',
        createdById: owner.owner.id,
      })
      return {
        ok: true as const,
        status: 201,
        data: {
          id: document.id,
          documentId: document.id,
          trackingNumber: document.trackingNumber,
          created: true,
        },
        contract: 'INT-TOR-09' as const,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Documents register failed'
      return {
        ok: false as const,
        status: null,
        error: message,
        unavailable: false,
        contract: 'INT-TOR-09' as const,
      }
    }
  }

  async routeAcademicReference(studentNumber: string) {
    const owner = await this.repositoryOwner()
    if (!owner) {
      return {
        ok: false as const,
        error: 'Document archive is not connected, so no routing decision was recorded.',
      }
    }
    const document = await Document.query()
      .where('tenant_id', owner.documentType.tenantId)
      .whereRaw("metadata->>'kind' = ?", ['academic_ledger_reference'])
      .whereRaw("metadata->>'studentNumber' = ?", [studentNumber])
      .first()
    if (!document) {
      return { ok: false as const, error: 'No archive reference is stored for this student.' }
    }
    const [fileRow] = await DocumentFile.query().where('document_id', document.id).count('* as total')
    const files = Number(fileRow?.$extras.total ?? 0)
    if (files > 0) {
      return { ok: false as const, error: 'A file is attached. The routing decision was not recorded.' }
    }
    const existing = await RoutingEntry.query()
      .where('document_id', document.id)
      .where('action', 'forward')
      .orderBy('routed_at', 'desc')
      .first()
    if (existing) {
      return {
        ok: true as const,
        data: {
          trackingNumber: document.trackingNumber,
          action: existing.action,
          status: document.status,
          alreadyRouted: true,
          fileStored: false,
        },
      }
    }
    await RoutingEntry.create({
      tenantId: document.tenantId,
      documentId: document.id,
      fromUserId: document.createdById,
      toDepartmentId: document.receivingOfficeId,
      action: 'forward',
      remarks: 'Routed to the receiving office. No file was stored.',
      routedAt: DateTime.now(),
    })
    if (document.status === 'draft') {
      document.status = 'received'
      await document.save()
    }
    return {
      ok: true as const,
      data: {
        trackingNumber: document.trackingNumber,
        action: 'forward',
        status: document.status,
        alreadyRouted: false,
        fileStored: false,
      },
    }
  }
}

export const udmsDocumentClient = new UdmsDocumentClient()
