import env from '#start/env'

type GradeLine = {
  academicYear: string
  semester: number
  courseCode: string
  courseTitle: string
  units: number
  grade: number | null
  remarks: string | null
}

export class RecordsGradesClient {
  async syncGrades(input: {
    organizationId: string
    studentNumber: string
    grades: GradeLine[]
  }) {
    const base = (env.get('RECORDS_API_URL') ?? 'http://127.0.0.1:3345').replace(/\/$/, '')
    const key = env.get('SERVICE_API_KEY') ?? ''
    const res = await fetch(`${base}/api/v1/internal/grades/sync`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Service-Api-Key': key,
      },
      body: JSON.stringify({
        organizationId: input.organizationId,
        studentNumber: input.studentNumber,
        grades: input.grades,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      throw new Error(body.message ?? body.error ?? `Records grade sync failed (${res.status})`)
    }
    return (await res.json()) as { data: { synced: number } }
  }
}
