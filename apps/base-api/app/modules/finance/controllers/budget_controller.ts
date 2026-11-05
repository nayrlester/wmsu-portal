import type { HttpContext } from '@adonisjs/core/http'
import { ok, fail } from '#modules/finance/helpers/api_envelope'
import { budgetService } from '#modules/finance/services/ufms/budget_service'
import {
  createFinancialPlanValidator,
  updateFinancialPlanValidator,
  createBudgetDocumentValidator,
  createObligationValidator,
  validateAvailabilityValidator,
  rejectValidator,
} from '#modules/finance/validators/budget'

function actorOf(auth: HttpContext['auth']) {
  const user = auth.user!
  return { id: user.id, organizationId: user.organizationId }
}

function handleError(response: HttpContext['response'], error: unknown) {
  const err = error as { status?: number; message?: string; messages?: unknown; code?: string }
  if (err.status === 404) return response.notFound(fail(err.message ?? 'Not found'))
  if (err.status === 422) return response.unprocessableEntity(fail(err.message ?? 'Validation failed'))
  if (err.messages) {
    return response.unprocessableEntity(fail('Validation failed', { errors: err.messages }))
  }
  if (err.code === '23505') return response.conflict(fail(err.message ?? 'Duplicate record'))
  throw error
}

export default class BudgetController {
  async listPlans({ request, response, auth }: HttpContext) {
    const result = await budgetService.listPlans(auth.user!.organizationId, {
      planType: request.input('planType'),
      fiscalYear: request.input('fiscalYear'),
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Financial plans', { ...result.getMeta() }))
  }

  async showPlan({ params, response, auth }: HttpContext) {
    try {
      const plan = await budgetService.getPlan(auth.user!.organizationId, params.id)
      return response.ok(ok(plan, 'Financial plan'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storePlan({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createFinancialPlanValidator)
      const plan = await budgetService.createPlan(actorOf(auth), payload)
      return response.created(ok(plan, 'Financial plan created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async updatePlan({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(updateFinancialPlanValidator)
      const plan = await budgetService.updatePlan(actorOf(auth), params.id, payload)
      return response.ok(ok(plan, 'Financial plan updated'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async submitPlan({ params, response, auth }: HttpContext) {
    try {
      const plan = await budgetService.transitionPlan(actorOf(auth), params.id, 'submitted')
      return response.ok(ok(plan, 'Financial plan submitted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async approvePlan({ params, response, auth }: HttpContext) {
    try {
      const plan = await budgetService.transitionPlan(actorOf(auth), params.id, 'approved')
      return response.ok(ok(plan, 'Financial plan approved'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async rejectPlan({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(rejectValidator)
      const plan = await budgetService.transitionPlan(
        actorOf(auth),
        params.id,
        'rejected',
        payload.rejectionReason
      )
      return response.ok(ok(plan, 'Financial plan rejected'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async revisePlan({ params, response, auth }: HttpContext) {
    try {
      const plan = await budgetService.transitionPlan(actorOf(auth), params.id, 'draft')
      return response.ok(ok(plan, 'Financial plan reopened as draft'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listDocuments({ request, response, auth }: HttpContext) {
    const result = await budgetService.listDocuments(auth.user!.organizationId, {
      documentType: request.input('documentType'),
      fiscalYear: request.input('fiscalYear'),
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Budget documents', { ...result.getMeta() }))
  }

  async showDocument({ params, response, auth }: HttpContext) {
    try {
      const doc = await budgetService.getDocument(auth.user!.organizationId, params.id)
      return response.ok(ok(doc, 'Budget document'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeDocument({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createBudgetDocumentValidator)
      const doc = await budgetService.createDocument(actorOf(auth), payload)
      return response.created(ok(doc, 'Budget document created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async submitDocument({ params, response, auth }: HttpContext) {
    try {
      const doc = await budgetService.transitionDocument(actorOf(auth), params.id, 'submitted')
      return response.ok(ok(doc, 'Budget document submitted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async approveDocument({ params, response, auth }: HttpContext) {
    try {
      const doc = await budgetService.transitionDocument(actorOf(auth), params.id, 'approved')
      return response.ok(ok(doc, 'Budget document approved'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async rejectDocument({ params, request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(rejectValidator)
      const doc = await budgetService.transitionDocument(
        actorOf(auth),
        params.id,
        'rejected',
        payload.rejectionReason
      )
      return response.ok(ok(doc, 'Budget document rejected'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async reviseDocument({ params, response, auth }: HttpContext) {
    try {
      const doc = await budgetService.transitionDocument(actorOf(auth), params.id, 'draft')
      return response.ok(ok(doc, 'Budget document reopened as draft'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async listObligations({ request, response, auth }: HttpContext) {
    const result = await budgetService.listObligations(auth.user!.organizationId, {
      fiscalYear: request.input('fiscalYear'),
      status: request.input('status'),
      page: Number(request.input('page', 1)) || 1,
      limit: Number(request.input('limit', 50)) || 50,
    })
    return response.ok(ok(result.all(), 'Budget obligations', { ...result.getMeta() }))
  }

  async showObligation({ params, response, auth }: HttpContext) {
    try {
      const row = await budgetService.getObligation(auth.user!.organizationId, params.id)
      return response.ok(ok(row, 'Budget obligation'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async storeObligation({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(createObligationValidator)
      const row = await budgetService.createObligation(actorOf(auth), payload)
      return response.created(ok(row, 'Obligation created'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async postObligation({ params, response, auth }: HttpContext) {
    try {
      const row = await budgetService.postObligation(actorOf(auth), params.id)
      return response.ok(ok(row, 'Obligation posted'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async cancelObligation({ params, response, auth }: HttpContext) {
    try {
      const row = await budgetService.cancelObligation(actorOf(auth), params.id)
      return response.ok(ok(row, 'Obligation cancelled'))
    } catch (error) {
      return handleError(response, error)
    }
  }

  async monitor({ request, response, auth }: HttpContext) {
    const fiscalYear = String(request.input('fiscalYear') || new Date().getFullYear())
    const data = await budgetService.monitor(auth.user!.organizationId, fiscalYear)
    return response.ok(ok(data, 'Budget monitoring'))
  }

  async validateAvailability({ request, response, auth }: HttpContext) {
    try {
      const payload = await request.validateUsing(validateAvailabilityValidator)
      const data = await budgetService.validateAvailability(auth.user!.organizationId, payload)
      return response.ok(ok(data, 'Budget availability check'))
    } catch (error) {
      return handleError(response, error)
    }
  }
}
