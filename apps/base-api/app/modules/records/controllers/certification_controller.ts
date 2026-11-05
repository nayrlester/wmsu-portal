import type { HttpContext } from '@adonisjs/core/http'
import { certRequestService } from '#modules/records/services/torms/cert_request_service'
import { certificationTypeService } from '#modules/records/services/torms/certification_type_service'
import { rbacService } from '#modules/records/services/rbac_service'
import {
  submitCertRequestValidator,
  listCertRequestsValidator,
  transitionCertRequestValidator,
  certAttachmentRefValidator,
  certPaymentVerifyValidator,
  updateCertTypeValidator,
} from '#modules/records/validators/cert_requests'

async function isStaffUser(user: { id: string; organizationId: string; isAdmin?: boolean }) {
  if (user.isAdmin) return true
  const perms = await rbacService.getUserPermissions(user as never)
  return perms.includes('torms.requests.process') || perms.includes('torms.foundation.admin')
}

function mapError(error: unknown, response: HttpContext['response']) {
  const status = (error as Error & { status?: number }).status ?? 500
  const message = error instanceof Error ? error.message : 'Request failed'
  if (status >= 400 && status < 600) {
    return response.status(status).send({ success: false, message })
  }
  throw error
}

export default class CertificationController {
  async listTypes({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const activeOnly = request.input('activeOnly')
    const rows = await certificationTypeService.list(
      user.organizationId,
      activeOnly === undefined ? true : Boolean(activeOnly)
    )
    return response.ok({ success: true, data: rows })
  }

  async updateType({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const perms = await rbacService.getUserPermissions(user as never)
      if (!staff && !perms.includes('torms.foundation.admin') && !user.isAdmin) {
        return response.forbidden({ success: false, message: 'Admin permission required' })
      }
      const payload = await request.validateUsing(updateCertTypeValidator)
      const updated = await certificationTypeService.update(user.organizationId, params.code, {
        actorUserId: user.id,
        active: payload.active,
        description: payload.description,
        processingNotes: payload.processingNotes,
      })
      return response.ok({ success: true, data: updated })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async submit({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const payload = await request.validateUsing(submitCertRequestValidator)
      const result = await certRequestService.submit({
        organizationId: user.organizationId,
        requesterUserId: user.id,
        studentNumber: payload.studentNumber,
        certificationType: payload.certificationType,
        purpose: payload.purpose,
        locality: payload.locality,
        agency: payload.agency,
        destinationCountry: payload.destinationCountry,
        urgency: payload.urgency,
        copies: payload.copies,
      })
      return response.created({
        success: true,
        message: 'Certification request submitted',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  /** @deprecated Prefer POST /certifications/requests */
  async store(ctx: HttpContext) {
    return this.submit(ctx)
  }

  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const filters = await request.validateUsing(listCertRequestsValidator)
    const staff = await isStaffUser(user)
    const page = await certRequestService.list({
      organizationId: user.organizationId,
      actorUserId: user.id,
      isStaff: staff,
      status: filters.status,
      studentNumber: filters.studentNumber,
      requestNumber: filters.requestNumber,
      certificationType: filters.certificationType,
      locality: filters.locality,
      mineOnly: filters.mineOnly,
      page: filters.page,
      limit: filters.limit,
    })
    return response.ok({ success: true, data: page.data, meta: page.meta })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const detail = await certRequestService.getByIdOrNumber({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        idOrNumber: params.idOrNumber,
      })
      return response.ok({ success: true, data: detail })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async academicRecords({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const refresh = request.input('refreshFromUsis')
      const data = await certRequestService.retrieveAcademicRecords({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        idOrNumber: params.idOrNumber,
        refreshFromUsis: refresh === undefined ? true : Boolean(refresh),
      })
      return response.ok({ success: true, data })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async transition({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      if (!staff) {
        return response.forbidden({ success: false, message: 'Staff permission required' })
      }
      const payload = await request.validateUsing(transitionCertRequestValidator)
      const updated = await certRequestService.transition({
        organizationId: user.organizationId,
        actorUserId: user.id,
        idOrNumber: params.idOrNumber,
        toStatus: payload.toStatus,
        reason: payload.reason,
        clearanceOverride: payload.clearanceOverride,
        paymentOverride: payload.paymentOverride,
      })
      return response.ok({ success: true, data: updated })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async addAttachmentRef({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const payload = await request.validateUsing(certAttachmentRefValidator)
      const row = await certRequestService.addSupportingDocumentRef({
        organizationId: user.organizationId,
        actorUserId: user.id,
        isStaff: staff,
        idOrNumber: params.idOrNumber,
        udmsDocumentId: payload.udmsDocumentId,
        kind: payload.kind,
      })
      return response.ok({ success: true, data: row })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async verifyPayment({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      if (!staff) {
        return response.forbidden({ success: false, message: 'Staff permission required' })
      }
      const payload = await request.validateUsing(certPaymentVerifyValidator)
      const result = await certRequestService.verifyPayment({
        organizationId: user.organizationId,
        actorUserId: user.id,
        idOrNumber: params.idOrNumber,
        paymentRef: payload.paymentRef,
        orNumber: payload.orNumber,
      })
      return response.ok({ success: true, data: result })
    } catch (error) {
      return mapError(error, response)
    }
  }
}
