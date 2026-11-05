import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, HeartHandshake, Ticket } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardCard,
  EmptyState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage } from '@/components/query-page'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  admitApplicant,
  createCounselingRequest,
  createHealthClearance,
  createScholarshipProgram,
  applyScholarship,
  fetchApplicants,
  fetchOfficeReport,
  fetchStudents,
  fileDisciplineComplaint,
  issueQueueTicket,
  resolveStudentForUser,
} from '@/lib/usis-api'
import { useAuthStore } from '@/stores/auth-store'

export function AdmissionsOfficePage() {
  return (
    <RequirePermission anyOf={['applicants.read', 'applicants.write']}>
      <AdmissionsInner />
    </RequirePermission>
  )
}

function AdmissionsInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['office', 'applicants'], queryFn: () => fetchApplicants({ limit: 50 }) })
  const admit = useMutation({
    mutationFn: (id: string) => admitApplicant(id, `ADM-${Date.now().toString().slice(-8)}`),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Applicant admitted' })
      qc.invalidateQueries({ queryKey: ['office', 'applicants'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Admit failed', description: getApiErrorMessage(err) }),
  })
  return (
    <QueryPage title="Admissions Office" description="Applicant intake and admission" query={query} isEmpty={(d) => d.data.length === 0}>
      {(page) => (
        <div className="space-y-3">
          <DashboardCard title="Pending / listed applicants" value={page.data.length} />
          <ul className="space-y-2">
            {page.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
                <span>
                  {a.lastName}, {a.firstName} · <span className="text-xs uppercase">{a.status}</span>
                </span>
                {a.status === 'pending' ? (
                  <Button type="button" size="sm" onClick={() => admit.mutate(a.id)}>
                    Admit
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </QueryPage>
  )
}

export function GuidanceOfficePage() {
  return (
    <RequirePermission anyOf={['guidance.read', 'guidance.write']}>
      <GuidanceInner />
    </RequirePermission>
  )
}

const guidanceRequestSchema = z.object({
  studentRef: z.string().min(2, 'Enter student number or UUID'),
  channel: z.enum(['online', 'walk_in']),
})

function GuidanceInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const canWrite = useAuthStore((s) => (s.user?.permissions ?? []).includes('guidance.write') || (s.user?.permissions ?? []).includes('*'))
  const report = useQuery({ queryKey: ['office', 'guidance-report'], queryFn: () => fetchOfficeReport('guidance') })
  const form = useForm<z.infer<typeof guidanceRequestSchema>>({
    resolver: zodResolver(guidanceRequestSchema),
    defaultValues: { channel: 'walk_in', studentRef: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof guidanceRequestSchema>) => {
      const ref = values.studentRef.trim()
      let studentId = ref
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)
      if (!uuidLike) {
        const matches = await fetchStudents({ search: ref, limit: 5 })
        const hit =
          matches.data.find((s) => s.studentNumber?.toLowerCase() === ref.toLowerCase()) ??
          matches.data.find((s) => s.id === ref) ??
          matches.data[0]
        if (!hit?.id) throw new Error('Student not found. Use student number or student UUID.')
        studentId = hit.id
      }
      return createCounselingRequest({ studentId, channel: values.channel })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Counseling request opened' })
      form.reset({ channel: 'walk_in', studentRef: '' })
      qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Failed', description: getApiErrorMessage(err) }),
  })

  const queueMutation = useMutation({
    mutationFn: async () => {
      const ref = form.getValues('studentRef').trim()
      let studentId: string | undefined
      if (ref) {
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)
        if (uuidLike) studentId = ref
        else {
          const matches = await fetchStudents({ search: ref, limit: 5 })
          studentId = matches.data[0]?.id
        }
      }
      return issueQueueTicket({ office: 'guidance', serviceCode: 'counseling', studentId })
    },
    onSuccess: (data) => {
      notify({ tone: 'success', title: 'Queue ticket issued', description: data.ticketNo })
      qc.invalidateQueries({ queryKey: ['office', 'guidance-report'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Queue failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guidance & Counseling"
        description="Operational intake for counseling requests and walk-in queue. Case notes stay on restricted screens."
      />

      {report.isLoading ? <LoadingState label="Loading guidance desk" /> : null}
      {report.isError ? (
        <Alert variant="danger" title="Unable to load guidance desk">
          {getApiErrorMessage(report.error)}
        </Alert>
      ) : null}

      {report.isSuccess ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DashboardCard
            title="Open service requests"
            value={report.data.openServiceRequests}
            hint="Active counseling and guidance intakes"
            tone="primary"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <DashboardCard
            title="Queue waiting"
            value={report.data.queueWaiting}
            hint="Walk-in tickets waiting to be called"
            tone="warning"
            icon={<Ticket className="h-5 w-5" />}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="h-4 w-4 text-[var(--color-primary)]" />
              Open counseling request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
              <FormField
                id="studentRef"
                label="Student number"
                required
                error={form.formState.errors.studentRef?.message}
              >
                <Input
                  id="studentRef"
                  placeholder="e.g. 2024-12345"
                  autoComplete="off"
                  {...form.register('studentRef')}
                />
              </FormField>
              <FormField id="channel" label="Channel">
                <Select id="channel" {...form.register('channel')}>
                  <option value="walk_in">Walk-in</option>
                  <option value="online">Online</option>
                </Select>
              </FormField>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={!canWrite || mutation.isPending} className="flex-1">
                  {mutation.isPending ? 'Creating…' : 'Create request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canWrite || queueMutation.isPending}
                  onClick={() => queueMutation.mutate()}
                >
                  Issue queue ticket
                </Button>
              </div>
            </form>
            <Alert variant="info" title="Privacy" className="mt-4">
              Case notes require guidance.case_notes permissions and are never shown on this operational screen.
            </Alert>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open requests</CardTitle>
            </CardHeader>
            <CardContent>
              {!report.isSuccess ? (
                <LoadingState label="Loading requests" />
              ) : (report.data.recentRequests?.length ?? 0) === 0 ? (
                <EmptyState
                  title="No open requests"
                  description="New counseling intakes will appear here."
                  icon={<ClipboardList className="h-6 w-6" />}
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {report.data.recentRequests!.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {row.studentName || row.studentNumber || row.studentId}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {row.requestType} · {row.channel.replace('_', '-')}
                          {row.studentNumber ? ` · ${row.studentNumber}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                        {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waiting queue</CardTitle>
            </CardHeader>
            <CardContent>
              {!report.isSuccess ? (
                <LoadingState label="Loading queue" />
              ) : (report.data.waitingTickets?.length ?? 0) === 0 ? (
                <EmptyState
                  title="Queue is clear"
                  description="No walk-in tickets are waiting."
                  icon={<Ticket className="h-6 w-6" />}
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {report.data.waitingTickets!.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">{row.ticketNo}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {row.studentName || row.studentNumber || 'Walk-in guest'} · {row.serviceCode}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
                        waiting
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function HealthOfficePage() {
  return (
    <RequirePermission anyOf={['health.read', 'health.write']}>
      <HealthInner />
    </RequirePermission>
  )
}

function HealthInner() {
  const { notify } = useNotification()
  const report = useQuery({ queryKey: ['office', 'health-report'], queryFn: () => fetchOfficeReport('health') })
  const form = useForm<{ studentId: string; status: 'pending' | 'cleared' | 'denied' }>({
    defaultValues: { status: 'cleared', studentId: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: { studentId: string; status: 'pending' | 'cleared' | 'denied' }) =>
      createHealthClearance(values),
    onSuccess: () => notify({ tone: 'success', title: 'Health clearance updated' }),
    onError: (err) => notify({ tone: 'danger', title: 'Failed', description: getApiErrorMessage(err) }),
  })
  return (
    <div className="space-y-4">
      <QueryPage title="University Health Services" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
          </div>
        )}
      </QueryPage>
      <Card>
        <CardHeader><CardTitle>Enrollment health clearance</CardTitle></CardHeader>
        <CardContent>
          <form className="grid max-w-md gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <FormField id="studentId" label="Student ID" required>
              <Input id="studentId" {...form.register('studentId', { required: true })} />
            </FormField>
            <FormField id="status" label="Status">
              <Select id="status" {...form.register('status')}>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="denied">Denied</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>Save clearance</Button>
          </form>
          <Alert variant="warning" title="Restricted clinical data" className="mt-4">
            Clinical notes are not editable here; use health.clinical.* endpoints with authorized clinicians only.
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export function OsaOfficePage() {
  return (
    <RequirePermission anyOf={['osa.read', 'osa.write']}>
      <OsaInner />
    </RequirePermission>
  )
}

function OsaInner() {
  const { notify } = useNotification()
  const report = useQuery({ queryKey: ['office', 'osa-report'], queryFn: () => fetchOfficeReport('osa') })
  const form = useForm<{ respondentStudentId: string; summary: string }>({
    defaultValues: { respondentStudentId: '', summary: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: { respondentStudentId: string; summary: string }) =>
      fileDisciplineComplaint({ ...values, complainantRole: 'staff' }),
    onSuccess: () => notify({ tone: 'success', title: 'Complaint filed' }),
    onError: (err) => notify({ tone: 'danger', title: 'Failed', description: getApiErrorMessage(err) }),
  })
  return (
    <div className="space-y-4">
      <QueryPage title="Office of Student Affairs" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
          </div>
        )}
      </QueryPage>
      <Card>
        <CardHeader><CardTitle>File discipline complaint</CardTitle></CardHeader>
        <CardContent>
          <form className="grid max-w-md gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <FormField id="respondentStudentId" label="Respondent student ID" required>
              <Input id="respondentStudentId" {...form.register('respondentStudentId', { required: true })} />
            </FormField>
            <FormField id="summary" label="Summary">
              <Input id="summary" {...form.register('summary')} />
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>File complaint</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

const scholarshipProgramSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  sourceType: z.enum(['internal', 'external']),
})

export function ScholarshipOfficePage() {
  return (
    <RequirePermission anyOf={['scholarships.read', 'scholarships.write']}>
      <ScholarshipInner />
    </RequirePermission>
  )
}

function ScholarshipInner() {
  const { notify } = useNotification()
  const email = useAuthStore((s) => s.user?.email)
  const report = useQuery({
    queryKey: ['office', 'scholarship-report'],
    queryFn: () => fetchOfficeReport('scholarship'),
  })
  const programForm = useForm<z.infer<typeof scholarshipProgramSchema>>({
    resolver: zodResolver(scholarshipProgramSchema),
    defaultValues: { sourceType: 'internal', code: '', name: '' },
  })
  const [programId, setProgramId] = useState('')
  const createProgram = useMutation({
    mutationFn: (values: z.infer<typeof scholarshipProgramSchema>) =>
      createScholarshipProgram({
        ...values,
        eligibilityConfig: { note: 'Office-configured; no hard-coded cutoffs' },
        coverageConfig: { calculationMethod: 'fixed', fixedAmount: 1000 },
      }),
    onSuccess: (data) => {
      const id = (data as { id?: string }).id
      if (id) setProgramId(id)
      notify({ tone: 'success', title: 'Program saved' })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Failed', description: getApiErrorMessage(err) }),
  })
  const apply = useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error('Create/select a program first')
      const student = await resolveStudentForUser(email)
      if (!student) throw new Error('No student selected — provide a linked student account for demo apply')
      return applyScholarship({
        programId,
        studentId: student.id,
        incomeClassification: 'office_band',
        requirementsJson: { docs: ['doc://income'] },
      })
    },
    onSuccess: () => notify({ tone: 'success', title: 'Application submitted' }),
    onError: (err) => notify({ tone: 'danger', title: 'Apply failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <QueryPage title="Scholarship Office" query={report}>
        {(data) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardCard title="Open service requests" value={data.openServiceRequests} />
            <DashboardCard title="Queue waiting" value={data.queueWaiting} />
          </div>
        )}
      </QueryPage>
      <Card>
        <CardHeader><CardTitle>Scholarship program</CardTitle></CardHeader>
        <CardContent>
          <form className="grid max-w-md gap-3" onSubmit={programForm.handleSubmit((v) => createProgram.mutate(v))}>
            <FormField id="code" label="Code" error={programForm.formState.errors.code?.message} required>
              <Input id="code" {...programForm.register('code')} />
            </FormField>
            <FormField id="name" label="Name" error={programForm.formState.errors.name?.message} required>
              <Input id="name" {...programForm.register('name')} />
            </FormField>
            <FormField id="sourceType" label="Source">
              <Select id="sourceType" {...programForm.register('sourceType')}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </Select>
            </FormField>
            <Button type="submit" disabled={createProgram.isPending}>Save program</Button>
          </form>
          {programId ? (
            <div className="mt-4 space-y-2">
              <Alert variant="success" title="Program ready">{programId}</Alert>
              <Button type="button" variant="outline" onClick={() => apply.mutate()} disabled={apply.isPending}>
                Submit sample application for linked student
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
