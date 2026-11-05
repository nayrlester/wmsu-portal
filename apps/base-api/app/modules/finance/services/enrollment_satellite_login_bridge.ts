import EnrollmentUser from '#modules/enrollment/models/user'
import FinanceUser from '#modules/finance/models/user'
import Role from '#modules/finance/models/role'
import { syncFinanceOrganizationFromEnrollment } from '#modules/finance/services/finance_organization_sync_service'
import Permission from '#modules/finance/models/permission'
import { rbacService } from '#modules/finance/services/rbac_service'
import { UFMS_PERMISSIONS } from '#modules/finance/domain/ufms_permissions'
import { UIMS_PERMISSIONS } from '#modules/finance/domain/enums/index'

const ENROLLMENT_FINANCE_ROLE_SLUGS = new Set([
  'admin',
  'identity_admin',
  'cashier',
  'registrar',
  'finance',
  'accounting',
])

function enrollmentUserEligibleForFinanceBridge(enrollmentUser: EnrollmentUser, roleSlugs: string[]) {
  if (roleSlugs.some((s) => ENROLLMENT_FINANCE_ROLE_SLUGS.has(s))) return true
  const local = enrollmentUser.email.split('@')[0]?.toLowerCase() ?? ''
  return /(?:^|[._-])(accounting|cashier|finance|bursar|admin)(?:[._-]|$)/.test(local)
}

async function ensureFinanceAdminRole(orgId: string) {
  for (const p of [...UFMS_PERMISSIONS, ...UIMS_PERMISSIONS]) {
    await Permission.updateOrCreate({ code: p.code }, { name: p.name, module: p.module })
  }
  return Role.updateOrCreate(
    { organizationId: orgId, slug: 'admin' },
    { organizationId: orgId, slug: 'admin', name: 'Administrator' }
  )
}

export async function tryFinanceLoginFromEnrollmentSatellite(
  email: string,
  password: string
): Promise<FinanceUser | null> {
  let enrollmentUser: EnrollmentUser
  try {
    enrollmentUser = await EnrollmentUser.verifyCredentials(email.toLowerCase(), password)
  } catch {
    return null
  }

  if (enrollmentUser.status !== 'active') return null

  await enrollmentUser.load('roles', (q) => {
    q.wherePivot('organization_id', enrollmentUser.organizationId)
  })
  const roleSlugs = enrollmentUser.roles.map((r) => r.slug)
  if (!enrollmentUserEligibleForFinanceBridge(enrollmentUser, roleSlugs)) return null

  const financeOrgId = await syncFinanceOrganizationFromEnrollment(enrollmentUser.organizationId)
  if (!financeOrgId) return null

  const financeUser = await FinanceUser.updateOrCreate(
    { email: enrollmentUser.email.toLowerCase() },
    {
      organizationId: financeOrgId,
      email: enrollmentUser.email.toLowerCase(),
      fullName: enrollmentUser.fullName,
      platformUserId: enrollmentUser.platformUserId,
      status: 'active',
    }
  )
  financeUser.password = password
  await financeUser.save()

  const wantsAdmin = roleSlugs.some((s) => s === 'admin' || s === 'identity_admin')
  if (wantsAdmin) {
    const adminRole = await ensureFinanceAdminRole(financeUser.organizationId)
    await financeUser.related('roles').sync({
      [adminRole.id]: { organization_id: financeUser.organizationId },
    })
  } else {
    await rbacService.ensureFinanceAccountingRole(financeUser.organizationId)
    const accountingRole = await Role.query()
      .where('organizationId', financeUser.organizationId)
      .where('slug', 'finance_accounting')
      .firstOrFail()
    await financeUser.related('roles').sync({
      [accountingRole.id]: { organization_id: financeUser.organizationId },
    })
  }

  return financeUser
}
