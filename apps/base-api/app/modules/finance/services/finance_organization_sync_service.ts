import EnrollmentOrganization from '#modules/enrollment/models/organization'
import FinanceOrganization from '#modules/finance/models/organization'

export async function syncFinanceOrganizationFromEnrollment(enrollmentOrgId: string) {
  const source = await EnrollmentOrganization.find(enrollmentOrgId)
  if (!source) return null

  const existingById = await FinanceOrganization.find(source.id)
  if (existingById) return existingById.id

  const conflicting = await FinanceOrganization.query()
    .where('code', source.code)
    .whereNot('id', source.id)
    .first()
  if (conflicting) {
    conflicting.code = `${source.code}-FIN-${conflicting.id.slice(0, 8)}`
    await conflicting.save()
  }

  const row = await FinanceOrganization.updateOrCreate(
    { id: source.id },
    {
      id: source.id,
      code: source.code,
      name: source.name,
      platformOrganizationId: source.platformOrganizationId,
    }
  )
  return row.id
}

export async function syncAllFinanceOrganizationsFromEnrollment() {
  const sources = await EnrollmentOrganization.query().orderBy('code', 'asc')
  const synced: Array<{ enrollmentOrgId: string; code: string; financeOrgId: string | null }> = []
  for (const source of sources) {
    const financeOrgId = await syncFinanceOrganizationFromEnrollment(source.id)
    synced.push({ enrollmentOrgId: source.id, code: source.code, financeOrgId })
  }
  return synced
}
