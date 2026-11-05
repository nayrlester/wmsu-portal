import type { HttpContext } from '@adonisjs/core/http'
import { documentIssuanceService } from '#modules/records/services/torms/document_issuance_service'
import { rbacService } from '#modules/records/services/rbac_service'
import {
  generateTorIssuanceValidator,
  issueDocumentValidator,
  printLogValidator,
  publicVerifyValidator,
} from '#modules/records/validators/document_issuance'

async function isIssuanceStaff(user: { id: string; organizationId: string; isAdmin?: boolean }) {
  if (user.isAdmin) return true
  const perms = await rbacService.getUserPermissions(user as never)
  return (
    perms.includes('torms.issuance.write') ||
    perms.includes('torms.requests.process') ||
    perms.includes('torms.foundation.admin')
  )
}

function mapError(error: unknown, response: HttpContext['response']) {
  const status = (error as Error & { status?: number }).status ?? 500
  const message = error instanceof Error ? error.message : 'Request failed'
  if (status >= 400 && status < 600) {
    return response.status(status).send({ success: false, message })
  }
  throw error
}

export default class DocumentIssuanceController {
  async generateTor({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      const payload = await request.validateUsing(generateTorIssuanceValidator)
      const result = await documentIssuanceService.generateTranscript({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        idOrNumber: params.idOrNumber,
        copyType: payload.copyType,
      })
      return response.created({
        success: true,
        message:
          'Structured transcript payload generated. Official University template not applied (FC #1).',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async listTorIssuances({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      if (!staff) {
        return response.forbidden({ success: false, message: 'Staff permission required' })
      }
      const { torRequestService } = await import('#modules/records/services/torms/tor_request_service')
      const detail = await torRequestService.getByIdOrNumber({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: true,
        idOrNumber: params.idOrNumber,
      })
      const rows = await documentIssuanceService.listTorIssuances(
        user.organizationId,
        detail.request.id
      )
      return response.ok({ success: true, data: rows })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async issueTor({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      const payload = await request.validateUsing(issueDocumentValidator)
      const result = await documentIssuanceService.issueTranscript({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        issuanceId: params.issuanceId,
        releaseRequest: payload.releaseRequest,
      })
      return response.ok({
        success: true,
        message: 'Transcript issuance recorded (structured payload; not digitally signed)',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async generateCert({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      const result = await documentIssuanceService.generateCertification({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        idOrNumber: params.idOrNumber,
      })
      return response.created({
        success: true,
        message:
          'Structured certification payload generated. Official University template not applied (FC #1).',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async listCertIssuances({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      if (!staff) {
        return response.forbidden({ success: false, message: 'Staff permission required' })
      }
      const { certRequestService } = await import('#modules/records/services/torms/cert_request_service')
      const detail = await certRequestService.getByIdOrNumber({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: true,
        idOrNumber: params.idOrNumber,
      })
      const rows = await documentIssuanceService.listCertIssuances(
        user.organizationId,
        detail.request.id
      )
      return response.ok({ success: true, data: rows })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async issueCert({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      const payload = await request.validateUsing(issueDocumentValidator)
      const result = await documentIssuanceService.issueCertification({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        issuanceId: params.issuanceId,
        releaseRequest: payload.releaseRequest,
      })
      return response.ok({
        success: true,
        message: 'Certification issuance recorded (structured payload; not digitally signed)',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async logPrint({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isIssuanceStaff(user)
      const payload = await request.validateUsing(printLogValidator)
      const path = request.url()
      const kind = path.includes('/certifications/') ? 'certification' : 'transcript'
      const log = await documentIssuanceService.logPrint({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        issuanceKind: kind,
        issuanceId: params.issuanceId,
        action: payload.action,
        reason: payload.reason,
      })
      return response.ok({ success: true, data: log })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async verifyPublic({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(publicVerifyValidator)
      const result = await documentIssuanceService.verifyPublic({
        codeOrRef: payload.codeOrRef,
        requesterMeta: {
          ip: request.ip(),
          ua: request.header('user-agent') ?? null,
        },
      })
      return response.ok({ success: true, data: result })
    } catch (error) {
      return mapError(error, response)
    }
  }
}
