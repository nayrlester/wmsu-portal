import env from '#start/env'

export type DeploymentMode = 'university' | 'saas'

/** ULMIS ships as a single-institution system by default — not a multi-org SaaS. */
export function getDeploymentMode(): DeploymentMode {
  const mode = env.get('DEPLOYMENT_MODE', 'university')
  return mode === 'saas' ? 'saas' : 'university'
}

export function isUniversityMode() {
  return getDeploymentMode() === 'university'
}

export function allowPublicRegister() {
  if (isUniversityMode()) {
    return env.get('ALLOW_PUBLIC_REGISTER', false)
  }
  return env.get('ALLOW_PUBLIC_REGISTER', true)
}

export function getDefaultTenantSlug() {
  return env.get('DEFAULT_TENANT_SLUG', 'ulmis')
}

export function resolveTenantSlug(explicit?: string | null) {
  const slug = explicit?.trim()
  if (slug) return slug.toLowerCase()
  if (isUniversityMode()) return getDefaultTenantSlug()
  return null
}
