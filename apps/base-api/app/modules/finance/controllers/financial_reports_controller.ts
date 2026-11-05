import type { HttpContext } from '@adonisjs/core/http'
import { ok } from '#modules/finance/helpers/api_envelope'
import { financialReportingService } from '#modules/finance/services/ufms/financial_reporting_service'
import { uimsIntegrationService } from '#modules/finance/services/ufms/uims_integration_service'
import { approvalRuntimeService } from '#modules/finance/services/ufms/approval_runtime_service'

function actorOf(auth: HttpContext['auth']) {
  const user = auth.user!
  return { id: user.id, organizationId: user.organizationId }
}

export default class FinancialReportsController {
  async trialBalance({ request, response, auth }: HttpContext) {
    const data = await financialReportingService.trialBalance(
      auth.user!.organizationId,
      request.input('fiscalYear')
    )
    return response.ok(ok(data, 'Trial balance'))
  }

  async financialPosition({ response, auth }: HttpContext) {
    const data = await financialReportingService.statementOfFinancialPosition(auth.user!.organizationId)
    return response.ok(ok(data, 'Statement of financial position'))
  }

  async budgetVsActual({ request, response, auth }: HttpContext) {
    const fiscalYear = String(request.input('fiscalYear') ?? new Date().getFullYear())
    const data = await financialReportingService.budgetVsActual(auth.user!.organizationId, fiscalYear)
    return response.ok(ok(data, 'Budget vs actual'))
  }

  async receivablesAging({ response, auth }: HttpContext) {
    const data = await financialReportingService.receivablesAging(auth.user!.organizationId)
    return response.ok(ok(data, 'Receivables aging'))
  }

  async saob({ request, response, auth }: HttpContext) {
    const fiscalYear = String(request.input('fiscalYear') ?? new Date().getFullYear())
    const data = await financialReportingService.saobSummary(auth.user!.organizationId, fiscalYear)
    return response.ok(ok(data, 'SAOB summary'))
  }

  async dashboardMetrics({ response, auth }: HttpContext) {
    const data = await financialReportingService.dashboardMetrics(auth.user!.organizationId)
    return response.ok(ok(data, 'Financial dashboard metrics'))
  }

  async auditExport({ request, response, auth }: HttpContext) {
    const data = await financialReportingService.auditExport(
      auth.user!.organizationId,
      request.input('from'),
      request.input('to')
    )
    return response.ok(ok(data, 'Audit export'))
  }

  async exportAgency({ params, response, auth }: HttpContext) {
    const orgId = auth.user!.organizationId
    let job
    if (params.agency === 'ebudget') job = await uimsIntegrationService.exportEbudget(orgId)
    else if (params.agency === 'btms') job = await uimsIntegrationService.exportBtms(orgId)
    else if (params.agency === 'engas') job = await uimsIntegrationService.exportEngas(orgId)
    else return response.notFound({ success: false, message: 'Unknown agency export' })
    return response.ok(ok(job, 'Agency export generated'))
  }

  async pushUims({ response, auth }: HttpContext) {
    const result = await uimsIntegrationService.pushPendingEvents(auth.user!.organizationId)
    return response.ok(ok(result, 'UIMS push result'))
  }

  async decideApproval({ params, request, response, auth }: HttpContext) {
    const decision = String(request.input('decision') ?? 'approved') as 'approved' | 'rejected'
    const result = await approvalRuntimeService.decideStep(actorOf(auth), params.id, decision)
    return response.ok(ok(result, 'Approval updated'))
  }
}
