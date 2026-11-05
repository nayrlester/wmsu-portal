import type { HttpContext } from '@adonisjs/core/http'
import { rbacService } from '#modules/enrollment/services/rbac_service'
import { usisAnalyticsService } from '#modules/enrollment/services/usis_analytics_service'
import type { ReportFilterInput, UsisReportId } from '#modules/enrollment/domain/usis_reports'
import { USIS_REPORT_DEFINITIONS } from '#modules/enrollment/domain/usis_reports'
import { hemisRegulatoryService } from '#modules/enrollment/services/hemis_regulatory_service'

function parseFilters(request: HttpContext['request']): ReportFilterInput {
  const semesterRaw = request.input('semester')
  const yearLevelRaw = request.input('yearLevel')
  return {
    academicYearId: request.input('academicYearId') || undefined,
    semester: semesterRaw !== undefined && semesterRaw !== '' ? Number(semesterRaw) : undefined,
    campusId: request.input('campusId') || undefined,
    collegeCode: request.input('collegeCode') || undefined,
    programId: request.input('programId') || undefined,
    yearLevel: yearLevelRaw !== undefined && yearLevelRaw !== '' ? Number(yearLevelRaw) : undefined,
    dateFrom: request.input('dateFrom') || undefined,
    dateTo: request.input('dateTo') || undefined,
  }
}

export default class ReportsController {
  private async scope(ctx: HttpContext) {
    const user = ctx.auth.user ?? ctx.platformUser
    if (!user) {
      return null
    }
    const permissions = await rbacService.getEffectivePermissions(user, ctx.platformPermissions)
    return {
      organizationId: user.organizationId,
      permissions,
      userId: user.id,
    }
  }

  async catalog(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    return ctx.response.ok({ data: usisAnalyticsService.catalog(scope.permissions) })
  }

  async definitions(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const data = USIS_REPORT_DEFINITIONS.filter((d) =>
      scope.permissions.includes('*') ||
      scope.permissions.includes('admin') ||
      scope.permissions.includes('reports.read') ||
      d.requiredAnyOf.some((p) => scope.permissions.includes(p))
    )
    return ctx.response.ok({ data })
  }

  async show(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const reportId = ctx.params.reportId as UsisReportId
    const filters = parseFilters(ctx.request)
    try {
      const data = await usisAnalyticsService.run(
        { organizationId: scope.organizationId, permissions: scope.permissions },
        reportId,
        filters
      )
      return ctx.response.ok({ data })
    } catch (err: any) {
      if (err?.status === 403) return ctx.response.forbidden({ error: err.message })
      if (err?.status === 404) return ctx.response.notFound({ error: err.message })
      throw err
    }
  }

  async export(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const reportId = ctx.params.reportId as UsisReportId
    const filters = parseFilters(ctx.request)
    const format = String(ctx.request.input('format', 'csv')).toLowerCase() as 'csv' | 'xlsx' | 'pdf' | 'json'
    if (!['csv', 'xlsx', 'pdf', 'json'].includes(format)) {
      return ctx.response.badRequest({ error: 'format must be csv, xlsx, pdf, or json' })
    }
    if (format === 'json' && !reportId.startsWith('hemis-')) {
      return ctx.response.badRequest({ error: 'JSON export is available for HEMIS regulatory reports only' })
    }
    if (
      !scope.permissions.includes('reports.export') &&
      !scope.permissions.includes('reports.read') &&
      !scope.permissions.includes('*') &&
      !scope.permissions.includes('admin')
    ) {
      const def = USIS_REPORT_DEFINITIONS.find((d) => d.id === reportId)
      const allowed = def?.requiredAnyOf.some((p) => scope.permissions.includes(p))
      if (!allowed) return ctx.response.forbidden({ error: 'Export not permitted' })
    }

    try {
      const file = await usisAnalyticsService.export(
        { organizationId: scope.organizationId, permissions: scope.permissions },
        reportId,
        filters,
        format,
        scope.userId
      )
      ctx.response.header('Content-Type', file.contentType)
      ctx.response.header('Content-Disposition', `attachment; filename="${file.filename}"`)
      return ctx.response.send(file.body)
    } catch (err: any) {
      if (err?.status === 403) return ctx.response.forbidden({ error: err.message })
      if (err?.status === 404) return ctx.response.notFound({ error: err.message })
      throw err
    }
  }

  async hemisSchema(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const allowed =
      scope.permissions.includes('*') ||
      scope.permissions.includes('admin') ||
      scope.permissions.includes('reports.export')
    if (!allowed) return ctx.response.forbidden({ error: 'Forbidden' })
    return ctx.response.ok({ data: hemisRegulatoryService.schemaCatalog() })
  }

  async dashboard(ctx: HttpContext) {
    const scope = await this.scope(ctx)
    if (!scope) return ctx.response.unauthorized({ error: 'Unauthorized' })
    const catalog = usisAnalyticsService.catalog(scope.permissions)
    const filters = parseFilters(ctx.request)
    const cards = []
    for (const reportId of catalog.dashboards.slice(0, 8)) {
      try {
        const report = await usisAnalyticsService.run(
          { organizationId: scope.organizationId, permissions: scope.permissions },
          reportId,
          filters
        )
        cards.push({
          reportId,
          title: report.title,
          totals: report.totals,
          validationOk: report.validation.ok,
          confidential: report.confidential,
        })
      } catch {
        // skip unauthorized/unavailable tiles
      }
    }
    return ctx.response.ok({
      data: {
        role: catalog.role,
        filters,
        cards,
        availableReports: catalog.reports.map((r) => r.id),
      },
    })
  }
}
