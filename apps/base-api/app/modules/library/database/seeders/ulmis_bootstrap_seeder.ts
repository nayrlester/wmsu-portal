import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#modules/library/models/tenant'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import RbacService from '#modules/library/services/auth/rbac_service'

import env from '#start/env'
import { provisionIdentityLibraryStaff } from '#modules/library/services/platform/identity_library_staff_client'

export default class extends BaseSeeder {
  private rbac = new RbacService()

  async run() {
    const slug = (env.get('DEFAULT_TENANT_SLUG', 'ulmis') ?? 'ulmis').toLowerCase()
    const name = env.get('INSTITUTION_NAME', 'University Library') ?? 'University Library'
    const adminEmail = 'admin@university.library'
    const adminPassword = 'ChangeMe123!'

    await this.rbac.ensureGlobalPermissions()

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
        await this.rbac.seedTenantRoles(created.id, trx)
        return created
      })
      console.log(`[ulmis] Created institution tenant: ${slug}`)
    } else {
      console.log(`[ulmis] Institution tenant already exists: ${slug}`)
      await this.rbac.seedTenantRoles(tenant.id)
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
      console.log(`[ulmis] Created admin ${adminEmail}`)
      console.log(`[ulmis] Temporary password: ${adminPassword} (change immediately)`)
    } else {
      // Dev convenience: keep bootstrap password in sync so university login docs stay valid.
      // Set ULMIS_RESET_ADMIN_PASSWORD=false to skip.
      const shouldReset =
        env.get('NODE_ENV') !== 'production' &&
        process.env.ULMIS_RESET_ADMIN_PASSWORD !== 'false'

      if (shouldReset) {
        admin.password = await hash.make(adminPassword)
        admin.status = 'active'
        admin.deletedAt = null
        await admin.save()
        console.log(`[ulmis] Reset admin password for ${adminEmail} → ${adminPassword}`)
      } else {
        console.log(`[ulmis] Admin already exists: ${adminEmail}`)
      }
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
      console.log('[ulmis] Attached admin role')
    }

    const identity = await provisionIdentityLibraryStaff({
      externalId: `library-user:${admin.id}`,
      email: adminEmail,
      fullName: admin.fullName,
      password: adminPassword,
    })
    if (identity?.id && admin.platformUserId !== identity.id) {
      admin.platformUserId = identity.id
      await admin.save()
      console.log(`[ulmis] Linked admin to Identity user ${identity.id}`)
    } else if (!identity) {
      console.warn(
        '[ulmis] Identity staff sync skipped (set PLATFORM_IDENTITY_URL + SERVICE_API_KEY)'
      )
    }

    console.log('[ulmis] Login with email/password only (university mode). Slug is fixed by env.')
  }
}
