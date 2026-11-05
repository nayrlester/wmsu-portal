import { apiClient } from '@/lib/api-client'

export type AlumniProfile = {
  id: string
  studentNumber: string
  firstName: string | null
  middleName: string | null
  lastName: string | null
  email?: string | null
  mobile?: string | null
  programCode: string | null
  degreeTitle: string | null
  graduationYear: number | null
  collegeCode: string | null
  location: string | null
  employmentInfo?: string | null
  consentProfileUpdate?: boolean
  consentTracer?: boolean
}

export async function listAlumni(params?: {
  q?: string
  studentNumber?: string
  collegeCode?: string
  programCode?: string
  graduationYear?: number
  location?: string
  limit?: number
  offset?: number
}) {
  const { data } = await apiClient.get('/torms/alumni', { params })
  return {
    items: (data.data ?? []) as AlumniProfile[],
    meta: (data.meta ?? { total: 0, limit: 50, offset: 0 }) as {
      total: number
      limit: number
      offset: number
    },
  }
}

export async function getAlumni(idOrStudent: string) {
  const { data } = await apiClient.get(`/torms/alumni/${encodeURIComponent(idOrStudent)}`)
  return data.data as AlumniProfile
}

export async function updateAlumni(
  idOrStudent: string,
  body: {
    email?: string | null
    mobile?: string | null
    employmentInfo?: string | null
    location?: string | null
    consentProfileUpdate?: boolean
    consentTracer?: boolean
  }
) {
  const { data } = await apiClient.put(`/torms/alumni/${encodeURIComponent(idOrStudent)}`, body)
  return data.data as AlumniProfile
}
