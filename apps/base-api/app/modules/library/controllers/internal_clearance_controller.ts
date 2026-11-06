import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class InternalClearanceController {
  async checkClearance({ params, response }: HttpContext) {
    const studentNumber = String(params.studentNumber ?? '').trim()
    const empty = { cleared: true, openItems: 0, openLoans: 0, unpaidFines: 0 }
    if (studentNumber.length < 3) return response.ok({ data: empty })

    const tenant = await db.from('library.tenants').where('slug', 'ulmis').first()
    const tenantId = tenant?.id as string | undefined
    if (!tenantId) return response.ok({ data: empty })

    const member = await db
      .from('library.members as m')
      .whereNull('m.deleted_at')
      .where('m.tenant_id', tenantId)
      .where((query) => {
        query
          .where('m.library_card_number', studentNumber)
          .orWhereRaw('lower(m.email) = lower(?)', [studentNumber])
          .orWhereExists((sub) => {
            sub
              .from('enrollment.students as s')
              .where('s.student_number', studentNumber)
              .whereRaw('m.email is not null and lower(s.email) = lower(m.email)')
          })
      })
      .select('m.id')
      .first()

    if (!member) return response.ok({ data: empty })

    const loans = await db
      .from('library.borrowings')
      .where('member_id', member.id)
      .where('tenant_id', tenantId)
      .whereIn('status', ['borrowed', 'overdue'])
      .count('* as total')
      .first()

    const fines = await db
      .from('library.fines')
      .where('member_id', member.id)
      .where('tenant_id', tenantId)
      .whereIn('status', ['pending', 'partial'])
      .whereRaw('amount_cents > paid_cents + waived_cents')
      .count('* as total')
      .first()

    const openLoans = Number(loans?.total ?? 0)
    const unpaidFines = Number(fines?.total ?? 0)
    const openItems = openLoans + unpaidFines

    return response.ok({
      data: {
        cleared: openItems === 0,
        openItems,
        openLoans,
        unpaidFines,
      },
    })
  }
}
