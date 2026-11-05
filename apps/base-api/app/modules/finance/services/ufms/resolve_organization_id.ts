import db from '@adonisjs/lucid/services/db'
import { t } from '#modules/finance/helpers/db_schema'

function isAliasFinanceCode(code: string) {
  return /(?:^|-)FIN(?:-|$)/i.test(code)
}

async function financeOrgMatchingEnrollment(enrollmentOrg: { id: string; code: string }) {
  const sameId = await db.from(t('organizations')).where('id', enrollmentOrg.id).first()
  if (sameId) return String(sameId.id)

  const byCode = await db.from(t('organizations')).where('code', enrollmentOrg.code).first()
  if (byCode) return String(byCode.id)

  return null
}

export async function resolveFinanceOrganizationId(organizationId: string): Promise<string> {
  if (!organizationId) return organizationId

  const enrollmentOrg = await db.from('enrollment.organizations').where('id', organizationId).first()
  if (enrollmentOrg?.code) {
    const matched = await financeOrgMatchingEnrollment({
      id: String(enrollmentOrg.id),
      code: String(enrollmentOrg.code),
    })
    if (matched) return matched
  }

  const direct = await db.from(t('organizations')).where('id', organizationId).first()
  if (!direct) return organizationId

  const code = String(direct.code ?? '')
  if (isAliasFinanceCode(code)) {
    const enrollmentByCampus = await db
      .from('enrollment.organizations')
      .where('code', code.replace(/-FIN-[a-f0-9]+$/i, '').replace(/-FIN$/i, ''))
      .first()
    const enrollmentFallback =
      enrollmentByCampus ??
      (await db.from('enrollment.organizations').where('code', 'UNI').first()) ??
      (await db.from('enrollment.organizations').orderBy('created_at', 'asc').first())
    if (enrollmentFallback?.code) {
      const matched = await financeOrgMatchingEnrollment({
        id: String(enrollmentFallback.id),
        code: String(enrollmentFallback.code),
      })
      if (matched) return matched
    }
  }

  return String(direct.id)
}

export async function resolveEnrollmentOrganizationId(organizationId: string): Promise<string> {
  const enrollmentDirect = await db.from('enrollment.organizations').where('id', organizationId).first()
  if (enrollmentDirect) return String(enrollmentDirect.id)

  const financeOrg = await db.from(t('organizations')).where('id', organizationId).first()
  if (!financeOrg?.code) return organizationId

  const code = String(financeOrg.code)
  const normalized = isAliasFinanceCode(code)
    ? code.replace(/-FIN-[a-f0-9]+$/i, '').replace(/-FIN$/i, '')
    : code

  const byCode =
    (await db.from('enrollment.organizations').where('code', normalized).first()) ??
    (await db.from('enrollment.organizations').where('code', code).first())
  return byCode ? String(byCode.id) : organizationId
}
