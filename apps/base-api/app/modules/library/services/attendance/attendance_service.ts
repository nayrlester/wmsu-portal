import { DateTime } from 'luxon'
import AttendanceEvent from '#modules/library/models/attendance_event'
import Member from '#modules/library/models/member'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'

export interface AttendanceListFilters {
  date?: string
  from?: string
  to?: string
  direction?: 'in' | 'out'
  source?: 'desk' | 'kiosk' | 'import'
  page?: number
  perPage?: number
}

export interface CreateAttendanceInput {
  cardNumber: string
  direction: 'in' | 'out'
  source?: 'desk' | 'kiosk' | 'import'
  occurredAt?: string
  memberId?: string
}

export default class AttendanceService {
  async create(input: CreateAttendanceInput) {
    const tid = borrowingTenantId()
    const cardNumber = input.cardNumber.trim()

    let memberId = input.memberId ?? null
    if (!memberId) {
      const member = await Member.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where('library_card_number', cardNumber)
        .first()
      memberId = member?.id ?? null
    }

    const occurredAt = input.occurredAt
      ? DateTime.fromISO(input.occurredAt)
      : DateTime.now()

    const event = await AttendanceEvent.create({
      tenantId: tid,
      memberId,
      cardNumber,
      direction: input.direction,
      source: input.source ?? 'desk',
      occurredAt: occurredAt.isValid ? occurredAt : DateTime.now(),
    })

    await event.load('member')
    return event
  }

  async list(filters: AttendanceListFilters) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const tid = borrowingTenantId()

    const query = AttendanceEvent.query().where('tenant_id', tid).preload('member')

    if (filters.date) {
      const day = DateTime.fromISO(filters.date)
      if (day.isValid) {
        query
          .where('occurred_at', '>=', day.startOf('day').toSQL()!)
          .where('occurred_at', '<=', day.endOf('day').toSQL()!)
      }
    } else {
      if (filters.from) {
        const from = DateTime.fromISO(filters.from).startOf('day')
        if (from.isValid) query.where('occurred_at', '>=', from.toSQL()!)
      }
      if (filters.to) {
        const to = DateTime.fromISO(filters.to).endOf('day')
        if (to.isValid) query.where('occurred_at', '<=', to.toSQL()!)
      }
    }

    if (filters.direction) query.where('direction', filters.direction)
    if (filters.source) query.where('source', filters.source)

    return query.orderBy('occurred_at', 'desc').paginate(page, perPage)
  }

  async todaySummary() {
    const tid = borrowingTenantId()
    const start = DateTime.now().startOf('day').toSQL()!
    const end = DateTime.now().endOf('day').toSQL()!

    const base = AttendanceEvent.query()
      .where('tenant_id', tid)
      .where('occurred_at', '>=', start)
      .where('occurred_at', '<=', end)

    const [totalResult, inResult, outResult] = await Promise.all([
      base.clone().count('* as total').first(),
      base.clone().where('direction', 'in').count('* as total').first(),
      base.clone().where('direction', 'out').count('* as total').first(),
    ])

    const uniqueRows = await AttendanceEvent.query()
      .where('tenant_id', tid)
      .where('occurred_at', '>=', start)
      .where('occurred_at', '<=', end)
      .distinct('card_number')
      .select('card_number')

    return {
      date: DateTime.now().toISODate(),
      total: Number(totalResult?.$extras.total ?? 0),
      checkIns: Number(inResult?.$extras.total ?? 0),
      checkOuts: Number(outResult?.$extras.total ?? 0),
      uniqueCards: uniqueRows.length,
    }
  }

  serialize(event: AttendanceEvent) {
    return {
      id: event.id,
      memberId: event.memberId,
      memberName: event.member?.fullName ?? null,
      cardNumber: event.cardNumber,
      direction: event.direction,
      source: event.source,
      occurredAt: event.occurredAt.toISO(),
      createdAt: event.createdAt.toISO(),
    }
  }
}
