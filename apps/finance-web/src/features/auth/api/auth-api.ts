import { apiClient } from '@/lib/api-client'
import type { AuthUser } from '@/types/auth'

function mapUser(raw: Record<string, unknown>, permissions: string[] = []): AuthUser {
  const roles = Array.isArray(raw.roles)
    ? raw.roles.map((r) => {
        if (typeof r === 'string') return r
        const role = r as { slug?: string; code?: string; name?: string }
        return String(role.slug ?? role.code ?? role.name ?? '')
      })
    : []

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    fullName: (raw.fullName as string | null) ?? null,
    permissions,
    roles: roles.filter(Boolean),
  }
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post(
    '/auth/login',
    { email, password },
    { skipHttpErrorToast: true }
  )
  return data
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get('/auth/me')
  const payload = data.data ?? data
  return mapUser(payload.user ?? payload, payload.permissions ?? [])
}

export { mapUser }
