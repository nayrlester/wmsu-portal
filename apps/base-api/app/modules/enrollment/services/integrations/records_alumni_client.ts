import env from '#start/env'

export class RecordsAlumniClient {
  async createFromGraduation(input: {
    organizationId: string
    studentNumber: string
    programCode: string
    graduationDate: string
    email: string
    firstName: string
    middleName?: string | null
    lastName: string
    mobile?: string | null
  }) {
    const base = (
      env.get('RECORDS_API_URL') ??
      env.get('GATEWAY_RECORDS_URL') ??
      'http://127.0.0.1:3500'
    ).replace(/\/$/, '')
    const key = env.get('SERVICE_API_KEY') ?? ''
    const year = input.graduationDate.slice(0, 4)
    const res = await fetch(`${base}/api/v1/internal/alumni/from-graduation`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Service-Api-Key': key,
      },
      body: JSON.stringify({
        organizationId: input.organizationId,
        studentNumber: input.studentNumber,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        email: input.email,
        mobile: input.mobile,
        programCode: input.programCode,
        degreeTitle: input.programCode,
        graduationYear: Number(year),
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      throw new Error(body.message ?? body.error ?? `Records alumni handoff failed (${res.status})`)
    }
    return (await res.json()) as { data: unknown }
  }
}
