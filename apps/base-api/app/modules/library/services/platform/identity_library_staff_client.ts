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
  const key =
    env.get('ENROLLMENT_SERVICE_API_KEY') ??
    env.get('SERVICE_API_KEY') ??
    env.get('IDENTITY_SERVICE_API_KEY')
  return key?.trim() || null
}

function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message
  return msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isIdentityLibraryStaffSyncConfigured(): boolean {
  return Boolean(identityBaseUrl() && serviceApiKey())
}

async function callIdentityLibraryStaff(
  input: {
    externalId: string
    email: string
    fullName: string
    password?: string
  },
  base: string,
  key: string
): Promise<IdentityLibraryStaffResult> {
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
  return provisionIdentityLibraryStaffWithRetry(input, { attempts: 1 })
}

export async function provisionIdentityLibraryStaffWithRetry(
  input: {
    externalId: string
    email: string
    fullName: string
    password?: string
  },
  options: { attempts?: number; delayMs?: number } = {}
): Promise<IdentityLibraryStaffResult | null> {
  if (!isIdentityLibraryStaffSyncConfigured()) {
    return null
  }

  const base = identityBaseUrl()!
  const key = serviceApiKey()!
  const attempts = Math.max(1, options.attempts ?? 8)
  const delayMs = options.delayMs ?? 750

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await callIdentityLibraryStaff(input, base, key)
    } catch (error) {
      lastError = error
      const refused = isConnectionRefused(error)
      if (attempt < attempts && refused) {
        await delay(delayMs)
        continue
      }
      if (refused) {
        logger.warn(
          {
            email: input.email,
            externalId: input.externalId,
            identityUrl: base,
            attempts,
          },
          'Identity API unreachable during library staff provision — start Identity (port 3411) and re-run db:seed'
        )
      } else {
        logger.error(
          { err: error, email: input.email, externalId: input.externalId },
          'Identity library staff provision failed'
        )
      }
      return null
    }
  }

  if (lastError) {
    logger.warn(
      { err: lastError, email: input.email, externalId: input.externalId },
      'Identity library staff provision gave up after retries'
    )
  }
  return null
}
