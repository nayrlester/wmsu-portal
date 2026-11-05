import { notifyFetchResponseError, notifyFetchJsonSuccess } from '@wmsu/ui'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3500'
const MDM_ADMIN_KEY = import.meta.env.VITE_MDM_ADMIN_KEY ?? ''

export type MdmOverview = {
  ownership: {
    studentAcademicSoR: string
    studentIdentityProjection: string
    organizationSoR: string
  }
  counts: Record<string, number>
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    await notifyFetchResponseError(res)
    throw new Error(`GET ${path} failed (${res.status})`)
  }
  const body = await res.json()
  return body.data as T
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(MDM_ADMIN_KEY ? { 'X-MDM-Admin-Key': MDM_ADMIN_KEY } : {}),
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    await notifyFetchResponseError(res, body?.message ?? `POST ${path} failed (${res.status})`)
    throw new Error(body?.message ?? `POST ${path} failed (${res.status})`)
  }
  await notifyFetchJsonSuccess(res, 'POST')
  return body.data as T
}

export const mdmApi = {
  overview: () => getJson<MdmOverview>('/api/v1/mdm/overview'),
  universities: () => getJson<Record<string, unknown>[]>('/api/v1/mdm/universities'),
  campuses: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/campuses${universityId ? `?universityId=${universityId}` : ''}`
    ),
  colleges: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/colleges${universityId ? `?universityId=${universityId}` : ''}`
    ),
  departments: (collegeId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/departments${collegeId ? `?collegeId=${collegeId}` : ''}`
    ),
  offices: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/offices${universityId ? `?universityId=${universityId}` : ''}`
    ),
  academicYears: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/academic-years${universityId ? `?universityId=${universityId}` : ''}`
    ),
  terms: (academicYearId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/terms${academicYearId ? `?academicYearId=${academicYearId}` : ''}`
    ),
  employees: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/employees${universityId ? `?universityId=${universityId}` : ''}`
    ),
  studentIdentityRefs: async (universityId?: string) => {
    const data = await getJson<{ note: string; rows: Record<string, unknown>[] }>(
      `/api/v1/mdm/student-identity-refs${universityId ? `?universityId=${universityId}` : ''}`
    )
    return data
  },
  countries: () => getJson<Record<string, unknown>[]>('/api/v1/mdm/countries'),
  regions: (countryId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/regions${countryId ? `?countryId=${countryId}` : ''}`
    ),
  sequences: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/number-sequences${universityId ? `?universityId=${universityId}` : ''}`
    ),
  settings: (universityId?: string) =>
    getJson<Record<string, unknown>[]>(
      `/api/v1/mdm/settings${universityId ? `?universityId=${universityId}` : ''}`
    ),
  createCampus: (payload: { universityId: string; code: string; name: string }) =>
    postJson('/api/v1/mdm/campuses', payload),
  nextSequence: (id: string) => postJson<{ formatted: string; value: number }>(`/api/v1/mdm/number-sequences/${id}/next`, {}),
}
