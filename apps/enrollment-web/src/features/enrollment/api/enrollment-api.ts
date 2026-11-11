import { apiClient } from '@/lib/api-client'

type Paginated<T> = {
  meta: Record<string, unknown>
  data: T[]
}

function unwrapList<T>(payload: unknown): T[] {
  const root = payload as { data?: Paginated<T> | T[] }
  if (!root.data) return []
  if (Array.isArray(root.data)) return root.data
  return root.data.data ?? []
}

export type Applicant = {
  id: string
  firstName: string
  lastName: string
  status: string
  appliedAt: string
}

export type Student = {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  email: string
  status: string
}

export type EnrollmentRow = {
  id: string
  status: string
  yearLevel: number
  semester: number
  student?: Student
}

export async function fetchApplicants() {
  const { data } = await apiClient.get('/applicants', { params: { limit: 50 } })
  return unwrapList<Applicant>(data)
}

export async function admitApplicant(id: string, studentNumber: string) {
  const { data } = await apiClient.post(`/applicants/${id}/admit`, { studentNumber })
  return data.data as {
    applicant: Applicant
    student: Student
    accountNotice?: {
      sent: boolean
      to: string | null
      loginEmail: string
      provisioned: boolean
      provisionError: string | null
      reason: string | null
    }
  }
}

export async function fetchStudents() {
  const { data } = await apiClient.get('/students', { params: { limit: 50 } })
  return unwrapList<Student>(data)
}

export async function fetchEnrollments() {
  const { data } = await apiClient.get('/enrollments', { params: { limit: 50 } })
  return unwrapList<EnrollmentRow>(data)
}

export async function fetchPayments() {
  const { data } = await apiClient.get('/payments', { params: { limit: 50 } })
  return unwrapList<{
    id: string
    amount: number
    orNumber: string | null
    paymentType: string
    paidAt: string
    student?: Student
  }>(data)
}

export async function fetchClearance(studentNumber: string) {
  const { data } = await apiClient.get(`/clearance/${encodeURIComponent(studentNumber)}`)
  return data.data as {
    cleared: boolean
    holds: Array<{ source: string; reason: string }>
  }
}

export async function fetchEnrollmentSummary() {
  const [applicants, students, enrollments, payments] = await Promise.all([
    fetchApplicants(),
    fetchStudents(),
    fetchEnrollments(),
    fetchPayments(),
  ])
  return {
    pendingApplicants: applicants.filter((a) => a.status === 'pending').length,
    totalStudents: students.length,
    activeEnrollments: enrollments.filter((e) => e.status !== 'cancelled').length,
    recentPayments: payments.slice(0, 5),
  }
}
