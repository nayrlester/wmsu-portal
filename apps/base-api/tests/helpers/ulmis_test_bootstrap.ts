import { ensureInstitutionTenant } from '#modules/library/services/tenant/ensure_institution_tenant'
import MembersBooksSeeder from '#modules/library/database/seeders/members_books_seeder'

let bootstrapped = false

export async function bootstrapUlmisTestData() {
  if (bootstrapped) return
  await ensureInstitutionTenant()
  await new MembersBooksSeeder().run()
  bootstrapped = true
}

export function shouldBootstrapUlmisFromArgv(argv: string) {
  return /ulmis_|library_inprocess/i.test(argv)
}
