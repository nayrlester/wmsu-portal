import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ReportService, {
  REPORT_TYPE_META,
  type ReportType,
} from '#modules/library/services/reports/report_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import AuditService from '#modules/library/services/audit/audit_service'

const REPORT_TYPES = REPORT_TYPE_META.map((m) => m.type)

const reportValidator = vine.compile(
  vine.object({
    from: vine.string().optional(),
    to: vine.string().optional(),
    format: vine.enum(['json', 'csv', 'pdf', 'xlsx']).optional(),
    status: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(200).optional(),
  })
)

export default class ReportsController {
  private service = new ReportService()
  private rbac = new RbacService()
  private audit = new AuditService()

  private ensure(ctx: HttpContext) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, 'reports:export')) {
      throw new ForbiddenException('Missing permission: reports:export')
    }
  }

  async types(ctx: HttpContext) {
    this.ensure(ctx)
    return ctx.response.ok({
      success: true,
      data: REPORT_TYPE_META,
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx)
    const type = ctx.params.type as ReportType
    if (!REPORT_TYPES.includes(type)) {
      return ctx.response.badRequest({ success: false, message: 'Unknown report type' })
    }

    const filters = await ctx.request.validateUsing(reportValidator)
    const rows = await this.service.generate(type, filters)
    const format = filters.format ?? 'json'
    const metaInfo = REPORT_TYPE_META.find((m) => m.type === type)

    if (format !== 'json') {
      await this.audit.log(
        'export',
        'report',
        null,
        null,
        {
          reportType: type,
          format,
          rowCount: rows.length,
          from: filters.from ?? null,
          to: filters.to ?? null,
          tor: metaInfo?.tor ?? [],
        },
        {
          userId: ctx.authUser?.id,
          userEmail: ctx.authUser?.email,
          ipAddress: ctx.request.ip(),
          requestId: ctx.request.header('x-request-id') ?? undefined,
        }
      )
    }

    if (format === 'csv') {
      const csv = this.service.toCsv(rows)
      ctx.response.header('Content-Type', 'text/csv; charset=utf-8')
      ctx.response.header('Content-Disposition', `attachment; filename="${type}-report.csv"`)
      return ctx.response.send(csv)
    }

    if (format === 'pdf') {
      const pdf = this.service.toPdf(`${metaInfo?.label ?? type} Report`, rows, {
        subtitle: `TOR ${(metaInfo?.tor ?? []).join(', ')} | University Library`,
        from: filters.from,
        to: filters.to,
      })
      ctx.response.header('Content-Type', 'application/pdf')
      ctx.response.header('Content-Disposition', `attachment; filename="${type}-report.pdf"`)
      return ctx.response.send(pdf)
    }

    if (format === 'xlsx') {
      const buffer = await this.service.toXlsx(type, rows)
      ctx.response.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      ctx.response.header('Content-Disposition', `attachment; filename="${type}-report.xlsx"`)
      return ctx.response.send(buffer)
    }

    const paged = this.service.paginateRows(rows, filters.page ?? 1, filters.perPage ?? 50)

    return ctx.response.ok({
      success: true,
      data: {
        type,
        label: metaInfo?.label ?? type,
        tor: metaInfo?.tor ?? [],
        description: metaInfo?.description ?? null,
        generatedAt: new Date().toISOString(),
        rowCount: paged.meta.total,
        rows: paged.rows,
      },
      meta: paged.meta,
    })
  }
}
