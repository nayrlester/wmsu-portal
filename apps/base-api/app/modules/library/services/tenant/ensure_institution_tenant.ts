import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import Tenant from '#modules/library/models/tenant'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import RbacService from '#modules/library/services/auth/rbac_service'
import { provisionIdentityLibraryStaff } from '#modules/library/services/platform/identity_library_staff_client'
import { getDefaultTenantSlug } from '#modules/library/services/deployment/deployment_mode'

export async function ensureInstitutionTenant(slugInput?: string): Promise<Tenant> {
  const slug = (slugInput ?? getDefaultTenantSlug()).trim().toLowerCase()
  const name = env.get('INSTITUTION_NAME', 'University Library') ?? 'University Library'
  const adminEmail = 'admin@university.library'
  const adminPassword = 'ChangeMe123!'
  const rbac = new RbacService()

  await rbac.ensureGlobalPermissions()

  let tenant = await Tenant.findBy('slug', slug)
  if (!tenant) {
    tenant = await db.transaction(async (trx) => {
      const created = await Tenant.create(
        {
          name,
          slug,
          type: 'university',
          status: 'active',
          timezone: 'Asia/Manila',
          locale: 'en-PH',
        },
        { client: trx }
      )
      await rbac.seedTenantRoles(created.id, trx)
      return created
    })
  } else if (tenant.status !== 'active') {
    tenant.status = 'active'
    await tenant.save()
    await rbac.seedTenantRoles(tenant.id)
  } else {
    await rbac.seedTenantRoles(tenant.id)
  }

  const adminRole = await Role.query()
    .where('tenant_id', tenant.id)
    .where('code', 'admin')
    .firstOrFail()

  let admin = await User.query()
    .where('tenant_id', tenant.id)
    .where('email', adminEmail)
    .whereNull('deleted_at')
    .first()

  if (!admin) {
    admin = await User.create({
      tenantId: tenant.id,
      email: adminEmail,
      fullName: 'Library Administrator',
      password: await hash.make(adminPassword),
      status: 'active',
    })
  } else if (env.get('NODE_ENV') !== 'production' && process.env.ULMIS_RESET_ADMIN_PASSWORD !== 'false') {
    admin.password = await hash.make(adminPassword)
    admin.status = 'active'
    admin.deletedAt = null
    await admin.save()
  }

  const hasAdminRole = await admin
    .related('roles')
    .query()
    .where('roles.id', adminRole.id)
    .first()

  if (!hasAdminRole) {
    await admin.related('roles').attach({
      [adminRole.id]: { assigned_at: DateTime.now().toSQL() },
    })
  }

  if (!admin.platformUserId) {
    const identity = await provisionIdentityLibraryStaff({
      externalId: `library-user:${admin.id}`,
      email: adminEmail,
      fullName: admin.fullName,
      password: adminPassword,
    })
    if (identity?.id) {
      admin.platformUserId = identity.id
      await admin.save()
    }
  }

  return tenant
}
