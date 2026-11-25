import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Enrollment from '#modules/enrollment/models/enrollment'
import AdvisingSession from '#modules/enrollment/models/advising_session'
import { t } from '#modules/enrollment/helpers/db_schema'
import { isAcademicAdvisingRequired } from '#modules/enrollment/domain/enrollment_workflow'

const OPEN_FOR_WAIVER = ['draft', 'advising', 'advised'] as const

export function advisingRequiredForEnrollment(enrollment: {
  yearLevel: number
  semester: number
  classification?: string | null
}): boolean {
  return isAcademicAdvisingRequired({
    yearLevel: enrollment.yearLevel,
    semester: enrollment.semester,
    classification: enrollment.classification,
  })
}

export async function applyAcademicAdvisingExemption(
  enrollment: Enrollment,
  options: {
    actorUserId?: string | null
    note?: string
    trx?: TransactionClientContract
  } = {}
): Promise<boolean> {
  if (advisingRequiredForEnrollment(enrollment)) return false
  if (enrollment.advisingWaived && ['advised', 'assessed', 'payment_verified', 'registered'].includes(enrollment.status)) {
    return false
  }
  if (!OPEN_FOR_WAIVER.includes(enrollment.status as (typeof OPEN_FOR_WAIVER)[number])) {
    return false
  }

  const note =
    options.note ??
    'Academic advising skipped — required only for 1st year 1st semester and transferees'

  const run = async (trx: TransactionClientContract) => {
    enrollment.useTransaction(trx)
    await AdvisingSession.query({ client: trx })
      .where('enrollment_id', enrollment.id)
      .where('status', 'in_progress')
      .update({ status: 'cancelled' })

    const fromStatus = enrollment.status
    enrollment.advisingWaived = true
    enrollment.requiresReadvising = false
    enrollment.advisedAt = enrollment.advisedAt ?? DateTime.now()
    if (fromStatus === 'draft' || fromStatus === 'advising') {
      enrollment.status = 'advised'
    }
    await enrollment.save()

    if (fromStatus !== enrollment.status) {
      await db.table(t('enrollment_status_history')).useTransaction(trx).insert({
        id: randomUUID(),
        organization_id: enrollment.organizationId,
        enrollment_id: enrollment.id,
        from_status: fromStatus,
        to_status: enrollment.status,
        actor_user_id: options.actorUserId ?? null,
        notes: note,
        created_at: new Date(),
      })
    }
  }

  if (options.trx) {
    await run(options.trx)
  } else {
    await db.transaction(async (trx) => run(trx))
  }

  return true
}
