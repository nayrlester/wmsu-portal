import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { studentImportService } from '#modules/enrollment/services/student_import_service'

const importValidator = vine.compile(
  vine.object({
    sourceName: vine.string().trim().maxLength(255).optional(),
    rows: vine
      .array(
        vine.object({
          studentNumber: vine.string().trim().maxLength(64).optional(),
          firstName: vine.string().trim().maxLength(128).optional(),
          middleName: vine.string().trim().maxLength(128).optional(),
          lastName: vine.string().trim().maxLength(128).optional(),
          email: vine.string().trim().maxLength(255).optional(),
          mobile: vine.string().trim().maxLength(32).optional(),
          programCode: vine.string().trim().maxLength(32).optional(),
          classification: vine.string().trim().maxLength(64).optional(),
          yearLevel: vine.number().optional(),
          status: vine.string().trim().maxLength(32).optional(),
        })
      )
      .minLength(1)
      .maxLength(500),
  })
)

function serializeBatch(row: {
  id: string
  sourceName: string
  status: string
  totalRows: number
  acceptedCount: number
  rejectedCount: number
  createdAt: { toISO(): string | null }
  completedAt: { toISO(): string | null } | null
}) {
  return {
    id: row.id,
    sourceName: row.sourceName,
    status: row.status,
    totalRows: row.totalRows,
    acceptedCount: row.acceptedCount,
    rejectedCount: row.rejectedCount,
    createdAt: row.createdAt.toISO(),
    completedAt: row.completedAt?.toISO() ?? null,
  }
}

export default class StudentImportController {
  async index(ctx: HttpContext) {
    const rows = await studentImportService.listBatches(ctx.auth.user!.organizationId)
    return ctx.response.ok({ data: rows.map(serializeBatch) })
  }

  async show(ctx: HttpContext) {
    const result = await studentImportService.getBatch(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    return ctx.response.ok({
      data: {
        batch: serializeBatch(result.batch),
        accepted: result.accepted.map((a) => ({
          id: a.id,
          rowNumber: a.rowNumber,
          studentId: a.studentId,
          studentNumber: a.studentNumber,
        })),
        rejections: result.rejections.map((r) => ({
          id: r.id,
          rowNumber: r.rowNumber,
          reason: r.reason,
          payload: r.payload,
        })),
      },
    })
  }

  async import(ctx: HttpContext) {
    const user = ctx.auth.user!
    const body = await ctx.request.validateUsing(importValidator)
    const result = await studentImportService.importRows(user.organizationId, body, user.id)
    return ctx.response.created({
      data: {
        batch: serializeBatch(result.batch),
        accepted: result.accepted.map((a) => ({
          id: a.id,
          rowNumber: a.rowNumber,
          studentId: a.studentId,
          studentNumber: a.studentNumber,
        })),
        rejections: result.rejections.map((r) => ({
          id: r.id,
          rowNumber: r.rowNumber,
          reason: r.reason,
          payload: r.payload,
        })),
      },
    })
  }

  async rejectionReport(ctx: HttpContext) {
    const result = await studentImportService.getBatch(
      ctx.auth.user!.organizationId,
      ctx.params.id
    )
    const lines = [
      'row_number,reason,email,first_name,last_name,student_number',
      ...result.rejections.map((r) => {
        const email = String(r.payload.email ?? '')
        const firstName = String(r.payload.firstName ?? '')
        const lastName = String(r.payload.lastName ?? '')
        const studentNumber = String(r.payload.studentNumber ?? '')
        const esc = (v: string) => `"${v.replaceAll('"', '""')}"`
        return [
          r.rowNumber,
          esc(r.reason),
          esc(email),
          esc(firstName),
          esc(lastName),
          esc(studentNumber),
        ].join(',')
      }),
    ]
    const csv = lines.join('\n')
    ctx.response.header('Content-Type', 'text/csv; charset=utf-8')
    ctx.response.header(
      'Content-Disposition',
      `attachment; filename="student-import-rejections-${result.batch.id}.csv"`
    )
    return ctx.response.send(csv)
  }
}
