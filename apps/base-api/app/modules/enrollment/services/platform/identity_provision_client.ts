import env from '#start/env'

export interface StudentProvisionPayload {
  studentNumber: string
  email: string
  firstName: string
  middleName?: string | null
  lastName: string
  mobile?: string | null
  programCode?: string | null
}

export class IdentityProvisionClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = (env.get('PLATFORM_IDENTITY_URL') ?? 'http://127.0.0.1:3411').replace(/\/$/, '')
    this.apiKey = env.get('ENROLLMENT_SERVICE_API_KEY') ?? env.get('SERVICE_API_KEY') ?? ''
  }

  async provisionStudent(
    payload: StudentProvisionPayload
  ): Promise<{ userId: string; email: string; temporaryPassword: string | null; created: boolean }> {
    const fullName = [payload.firstName, payload.middleName, payload.lastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const body = {
      externalId: payload.studentNumber,
      email: payload.email,
      fullName,
      studentNumber: payload.studentNumber,
      status: 'active' as const,
    }
    const data = await this.post<{
      id: string
      email: string
      temporaryPassword?: string
      created?: boolean
    }>('/api/v1/integrations/enrollment/students', body)
    return {
      userId: data.id,
      email: data.email,
      temporaryPassword: data.temporaryPassword?.trim() || null,
      created: Boolean(data.created),
    }
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Service-Api-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    })
    const body = (await res.json()) as { data?: T; error?: string }
    if (!res.ok) throw new Error(body.error ?? `Identity provision POST ${path} failed`)
    if (!body.data) throw new Error(`Identity provision POST ${path} missing data`)
    return body.data
  }
}
