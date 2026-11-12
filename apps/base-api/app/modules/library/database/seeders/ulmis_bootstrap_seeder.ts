import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import { ensureInstitutionTenant } from '#modules/library/services/tenant/ensure_institution_tenant'

export default class extends BaseSeeder {
  async run() {
    const slug = (env.get('DEFAULT_TENANT_SLUG', 'ulmis') ?? 'ulmis').toLowerCase()
    await ensureInstitutionTenant(slug)
    console.log(`[ulmis] Institution tenant ready: ${slug}`)
    console.log('[ulmis] Login with email/password only (university mode). Slug is fixed by env.')
  }
}
