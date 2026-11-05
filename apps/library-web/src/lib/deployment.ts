/** University ULMIS mode by default — not a multi-org SaaS. */

export function getAppName() {
  return import.meta.env.VITE_APP_NAME?.trim() || 'University Library'
}

export function getDefaultTenantSlug() {
  return (import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'ulmis').trim().toLowerCase()
}

export function allowPublicRegister() {
  const value = import.meta.env.VITE_ALLOW_PUBLIC_REGISTER
  if (value === undefined || value === '') {
    // Default off for ULMIS
    return false
  }
  return value === 'true' || value === '1'
}

export function isUniversityMode() {
  const mode = (import.meta.env.VITE_DEPLOYMENT_MODE || 'university').toLowerCase()
  return mode !== 'saas'
}

/** Standalone public OPAC app (dev default :5212). */
export function getOpacAppUrl() {
  return (import.meta.env.VITE_OPAC_URL || 'http://localhost:5212').replace(/\/$/, '')
}

/** Standalone kiosk terminal app (dev default :5213). */
export function getKioskAppUrl() {
  return (import.meta.env.VITE_KIOSK_URL || 'http://localhost:5213').replace(/\/$/, '')
}
