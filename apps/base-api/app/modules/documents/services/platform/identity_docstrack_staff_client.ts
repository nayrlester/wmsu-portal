import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export type IdentityDocstrackStaffResult = {
  id: string
  email: string
  platforms: string[]
  created: boolean
}

function identityBaseUrl(): string | null {
  const url = env.get('PLATFORM_IDENTITY_URL')
  if (!url?.trim()) return null
  return url.replace(/\/$/, '')
}

function serviceApiKey(): string | null {
  return (env.get('SERVICE_API_KEY') ?? '').trim() || null
}

export function isIdentityDocstrackStaffSyncConfigured(): boolean {
  return Boolean(identityBaseUrl() && serviceApiKey())
}

/**
 * Provisions Identity users from UDMS demo/bootstrap (reuses Library staff M2M contract).
 */
export async function provisionIdentityDocstrackStaff(input: {
  externalId: string
  email: string
  fullName: string
  password?: string
}): Promise<IdentityDocstrackStaffResult | null> {
  if (!isIdentityDocstrackStaffSyncConfigured()) return null

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
      data?: IdentityDocstrackStaffResult
    }
    if (!res.ok || !payload.data) {
      throw new Error(payload.error ?? `Identity provision failed (${res.status})`)
    }
    return payload.data
  } catch (error) {
    logger.error({ err: error, email: input.email }, 'Identity UDMS staff provision failed')
    return null
  }
}
