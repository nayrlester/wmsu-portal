import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export type IdentityLibraryStaffResult = {
  id: string
  email: string
  platforms: string[]
  created: boolean
  temporaryPassword?: string
}

function identityBaseUrl(): string | null {
  const url = env.get('PLATFORM_IDENTITY_URL')
  if (!url?.trim()) return null
  return url.replace(/\/$/, '')
}

function serviceApiKey(): string | null {
  const key = env.get('SERVICE_API_KEY') ?? env.get('IDENTITY_SERVICE_API_KEY')
  return key?.trim() || null
}

export function isIdentityLibraryStaffSyncConfigured(): boolean {
  return Boolean(identityBaseUrl() && serviceApiKey())
}

/**
 * Provisions / updates an Identity user from Library staff invite (M2M).
 * Staff receive all enterprise platforms by default.
 */
export async function provisionIdentityLibraryStaff(input: {
  externalId: string
  email: string
  fullName: string
  password?: string
}): Promise<IdentityLibraryStaffResult | null> {
  if (!isIdentityLibraryStaffSyncConfigured()) {
    return null
  }

  const base = identityBaseUrl()!
  const key = serviceApiKey()!

  try {
    const res = await fetch(`${base}/api/v1/integrations/library/staff`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Service-Api-Key': key,
      },
      body: JSON.stringify({
        externalId: input.externalId,
        email: input.email,
        fullName: input.fullName,
        password: input.password,
        status: 'active',
      }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      error?: string
      data?: IdentityLibraryStaffResult
    }

    if (!res.ok || !payload.data) {
      throw new Error(payload.error ?? `Identity library staff provision failed (${res.status})`)
    }

    return payload.data
  } catch (error) {
    logger.error(
      { err: error, email: input.email, externalId: input.externalId },
      'Identity library staff provision failed'
    )
    return null
  }
}
