import type { HttpContext } from '@adonisjs/core/http'
import { torRequestService } from '#modules/records/services/torms/tor_request_service'
import { rbacService } from '#modules/records/services/rbac_service'
import {
  submitTorRequestValidator,
  listTorRequestsValidator,
  transitionTorRequestValidator,
  torAttachmentRefValidator,
  torPaymentVerifyValidator,
  confirmPhysicalValidator,
} from '#modules/records/validators/tor_requests'

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

export default class TorController {
  async submit({ auth, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const payload = await request.validateUsing(submitTorRequestValidator)
      const result = await torRequestService.submit({
        organizationId: user.organizationId,
        requesterUserId: user.id,
        studentNumber: payload.studentNumber,
        purpose: payload.purpose,
        locality: payload.locality,
        agency: payload.agency,
        destinationCountry: payload.destinationCountry,
        urgency: payload.urgency,
        copies: payload.copies,
        isFirstRequestAfterGraduation: payload.isFirstRequestAfterGraduation,
      })
      return response.created({
        success: true,
        message: 'Transcript request submitted',
        data: result,
      })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const filters = await request.validateUsing(listTorRequestsValidator)
    const staff = await isStaffUser(user)
    const rows = await torRequestService.list({
      organizationId: user.organizationId,
      actorUserId: user.id,
      isStaff: staff,
      status: filters.status,
      studentNumber: filters.studentNumber,
      requestNumber: filters.requestNumber,
      mineOnly: filters.mineOnly,
      limit: filters.limit,
    })
    return response.ok({ success: true, data: rows })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const detail = await torRequestService.getByIdOrNumber({
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
      const data = await torRequestService.retrieveAcademicRecords({
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
      const payload = await request.validateUsing(transitionTorRequestValidator)
      const updated = await torRequestService.transition({
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

  async confirmPhysical({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      if (!staff) {
        return response.forbidden({ success: false, message: 'Staff permission required' })
      }
      const payload = await request.validateUsing(confirmPhysicalValidator)
      const row = await torRequestService.confirmPhysicalDocument({
        organizationId: user.organizationId,
        actorUserId: user.id,
        idOrNumber: params.idOrNumber,
        notes: payload.notes,
      })
      return response.ok({ success: true, data: row })
    } catch (error) {
      return mapError(error, response)
    }
  }

  async addAttachmentRef({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    try {
      const staff = await isStaffUser(user)
      const payload = await request.validateUsing(torAttachmentRefValidator)
      const row = await torRequestService.addSupportingDocumentRef({
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
      const payload = await request.validateUsing(torPaymentVerifyValidator)
      const result = await torRequestService.verifyPayment({
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

  /** @deprecated Prefer academicRecords on a request; kept for ledger preview */
  async preview({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { t } = await import('#modules/records/helpers/db_schema')
    const grades = await db
      .from(t('academic_ledger_lines'))
      .where('organization_id', user.organizationId)
      .where('student_number', params.studentNumber)
      .orderBy('academic_year', 'asc')
      .orderBy('semester', 'asc')

    return response.ok({
      success: true,
      data: {
        studentNumber: params.studentNumber,
        source: 'TORMS_LEDGER_PROJECTION',
        incomplete: grades.length === 0,
        grades,
      },
    })
  }
}
