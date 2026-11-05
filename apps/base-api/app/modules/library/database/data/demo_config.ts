/**
 * Demo tenant credentials — safe for local/staging only.
 * Run: node ace db:seed --files=database/seeders/demo_seeder.ts
 */
export const DEMO_TENANT = {
  slug: 'demo',
  name: 'Demo Library',
  type: 'public_library' as const,
}

export const DEMO_PASSWORD = 'Demo1234!'

export const DEMO_USERS = {
  admin: {
    email: 'admin@demo.library',
    fullName: 'Demo Admin',
    role: 'admin',
  },
  librarian: {
    email: 'librarian@demo.library',
    fullName: 'Demo Librarian',
    role: 'librarian',
  },
  staff: {
    email: 'staff@demo.library',
    fullName: 'Demo Staff',
    role: 'staff',
  },
  student: {
    email: 'jane.student@demo.library',
    fullName: 'Jane Student',
    role: 'member',
  },
} as const

export function demoLoginSummary() {
  return {
    tenantSlug: DEMO_TENANT.slug,
    password: DEMO_PASSWORD,
    accounts: Object.values(DEMO_USERS).map((u) => ({
      email: u.email,
      role: u.role,
    })),
  }
}
