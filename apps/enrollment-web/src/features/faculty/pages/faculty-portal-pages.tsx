import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DashboardCard,
  FormField,
  Input,
  Select,
  useNotification,
} from '@wmsu/ui'
import { QueryPage } from '@/components/query-page'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  encodeClassGrades,
  fetchAdvisingDashboard,
  fetchAdvisingSessions,
  fetchGradeCorrections,
  fetchMyFacultyAssignments,
  openClassRecord,
  requestGradeCorrection,
  submitClassGrades,
} from '@/lib/usis-api'

export function FacultyDashboardPage() {
  return (
    <RequirePermission anyOf={['grades.read', 'grades.write', 'advising.read']}>
      <FacultyDashboardInner />
    </RequirePermission>
  )
}

function FacultyDashboardInner() {
  const assignments = useQuery({ queryKey: ['faculty', 'assignments'], queryFn: fetchMyFacultyAssignments })
  const advising = useQuery({ queryKey: ['faculty', 'advising-dash'], queryFn: fetchAdvisingDashboard })
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardCard title="Assigned classes" value={assignments.data?.length ?? 0} />
        <DashboardCard title="Advising metrics" value={Object.keys(advising.data ?? {}).length} />
        <DashboardCard title="Portal" value="Faculty" />
      </div>
      <QueryPage title="Assigned classes" query={assignments} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Faculty assignments"
            columns={[
              { key: 'section', header: 'Section', render: (r) => r.section?.code ?? r.sectionId },
              { key: 'name', header: 'Name', render: (r) => r.section?.name ?? '—' },
              { key: 'semester', header: 'Semester' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function FacultyClassesPage() {
  return <FacultyDashboardPage />
}

export function FacultyMasterListsPage() {
  return (
    <RequirePermission anyOf={['grades.write', 'grades.read']}>
      <FacultyMasterInner />
    </RequirePermission>
  )
}

function FacultyMasterInner() {
  const assignments = useQuery({ queryKey: ['faculty', 'assignments'], queryFn: fetchMyFacultyAssignments })
  const [selected, setSelected] = useState<string>('')
  const assignment = useMemo(
    () => assignments.data?.find((a) => a.id === selected) ?? assignments.data?.[0],
    [assignments.data, selected]
  )
  const master = useQuery({
    queryKey: ['faculty', 'master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
  })

  return (
    <div className="space-y-4">
      <FormField id="assignment" label="Class">
        <Select
          id="assignment"
          value={assignment?.id ?? ''}
          onChange={(e) => setSelected(e.target.value)}
        >
          {(assignments.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.section?.code ?? a.sectionId} · sem {a.semester}
            </option>
          ))}
        </Select>
      </FormField>
      <QueryPage title="Class master list" query={master} isEmpty={(d) => d.roster.length === 0}>
        {(data) => (
          <DataTable
            label="Master list"
            columns={[
              { key: 'studentNumber', header: 'Student #', render: (r) => r.studentNumber ?? '—' },
              { key: 'name', header: 'Name', render: (r) => `${r.lastName ?? ''}, ${r.firstName ?? ''}` },
              {
                key: 'mark',
                header: 'Current mark',
                render: (r) => data.entries.find((e) => e.studentId === r.studentId)?.markCode ?? '—',
              },
            ]}
            data={data.roster}
            keyExtractor={(r) => r.studentId}
          />
        )}
      </QueryPage>
    </div>
  )
}

const encodeSchema = z.object({
  markCode: z.string().min(1, 'Mark is required'),
})

export function FacultyEncodePage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultyEncodeInner />
    </RequirePermission>
  )
}

function FacultyEncodeInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const assignments = useQuery({ queryKey: ['faculty', 'assignments'], queryFn: fetchMyFacultyAssignments })
  const assignment = assignments.data?.[0]
  const master = useQuery({
    queryKey: ['faculty', 'encode-master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
  })
  const [studentId, setStudentId] = useState('')
  const form = useForm<z.infer<typeof encodeSchema>>({
    resolver: zodResolver(encodeSchema),
    defaultValues: { markCode: '2.00' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof encodeSchema>) => {
      if (!master.data?.classRecord.id || !studentId) throw new Error('Select a student')
      return encodeClassGrades({
        classRecordId: master.data.classRecord.id,
        grades: [{ studentId, markCode: values.markCode }],
      })
    },
    onSuccess: () => {
      notify({ tone: 'success', title: 'Grade encoded' })
      qc.invalidateQueries({ queryKey: ['faculty', 'encode-master'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Encode failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade encoding</CardTitle>
      </CardHeader>
      <CardContent className="grid max-w-lg gap-3">
        {!assignment ? <Alert variant="warning" title="No faculty assignment">Ask the Registrar to assign your classes.</Alert> : null}
        <FormField id="student" label="Student">
          <Select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select…</option>
            {(master.data?.roster ?? []).map((r) => (
              <option key={r.studentId} value={r.studentId}>
                {r.studentNumber} · {r.lastName}, {r.firstName}
              </option>
            ))}
          </Select>
        </FormField>
        <form className="grid gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <FormField id="markCode" label="Mark code" error={form.formState.errors.markCode?.message} required>
            <Input id="markCode" {...form.register('markCode')} placeholder="1.00 / INC / DRP / NG" />
          </FormField>
          <Button type="submit" disabled={mutation.isPending}>Encode grade</Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function FacultySubmitPage() {
  return (
    <RequirePermission anyOf={['grades.write']}>
      <FacultySubmitInner />
    </RequirePermission>
  )
}

function FacultySubmitInner() {
  const { notify } = useNotification()
  const assignments = useQuery({ queryKey: ['faculty', 'assignments'], queryFn: fetchMyFacultyAssignments })
  const assignment = assignments.data?.[0]
  const master = useQuery({
    queryKey: ['faculty', 'submit-master', assignment?.id],
    queryFn: () =>
      openClassRecord({
        sectionId: assignment!.sectionId,
        academicYearId: assignment!.academicYearId,
        semester: assignment!.semester,
      }),
    enabled: !!assignment,
  })
  const mutation = useMutation({
    mutationFn: () => {
      if (!master.data?.classRecord.id) throw new Error('Open a class record first')
      return submitClassGrades({
        classRecordId: master.data.classRecord.id,
        signatories: [{ role: 'Faculty', name: 'Faculty of record' }],
      })
    },
    onSuccess: () => notify({ tone: 'success', title: 'Grades submitted and locked' }),
    onError: (err) => notify({ tone: 'danger', title: 'Submit failed', description: getApiErrorMessage(err) }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade submission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Submitting locks the class record. Corrections require the ENR-022 workflow.
        </p>
        <p className="text-sm">
          Class: <Badge>{master.data?.classRecord.subjectCode ?? '—'}</Badge> · status{' '}
          <Badge>{master.data?.classRecord.status ?? '—'}</Badge>
        </p>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !master.data}>
          Submit & lock grades
        </Button>
      </CardContent>
    </Card>
  )
}

const correctionSchema = z.object({
  gradeEntryId: z.string().uuid('Select a locked grade entry id'),
  reasonCode: z.enum(['encoding_error', 'computation_error', 'identity_mismatch', 'late_completion_of_inc', 'registrar_directive', 'other']),
  proposedMarkCode: z.string().min(1),
  supportingDocumentRefs: z.string().min(1, 'Supporting document ref required'),
  reasonNotes: z.string().optional(),
})

export function FacultyCorrectionsPage() {
  return (
    <RequirePermission anyOf={['grades.write', 'grades.approve']}>
      <FacultyCorrectionsInner />
    </RequirePermission>
  )
}

function FacultyCorrectionsInner() {
  const { notify } = useNotification()
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['faculty', 'corrections'], queryFn: () => fetchGradeCorrections() })
  const form = useForm<z.infer<typeof correctionSchema>>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      reasonCode: 'encoding_error',
      proposedMarkCode: '2.00',
      supportingDocumentRefs: 'doc://',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof correctionSchema>) =>
      requestGradeCorrection({
        ...values,
        supportingDocumentRefs: values.supportingDocumentRefs.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      notify({ tone: 'success', title: 'Correction requested' })
      qc.invalidateQueries({ queryKey: ['faculty', 'corrections'] })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Request failed', description: getApiErrorMessage(err) }),
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Request grade correction</CardTitle></CardHeader>
        <CardContent>
          <form className="grid max-w-xl gap-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
            <FormField id="gradeEntryId" label="Grade entry ID" error={form.formState.errors.gradeEntryId?.message} required>
              <Input id="gradeEntryId" {...form.register('gradeEntryId')} />
            </FormField>
            <FormField id="reasonCode" label="Reason code" required>
              <Select id="reasonCode" {...form.register('reasonCode')}>
                <option value="encoding_error">Encoding error</option>
                <option value="computation_error">Computation error</option>
                <option value="identity_mismatch">Identity mismatch</option>
                <option value="late_completion_of_inc">Late INC completion</option>
                <option value="registrar_directive">Registrar directive</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField id="proposedMarkCode" label="Proposed mark" required>
              <Input id="proposedMarkCode" {...form.register('proposedMarkCode')} />
            </FormField>
            <FormField id="docs" label="Supporting document refs" error={form.formState.errors.supportingDocumentRefs?.message} required>
              <Input id="docs" {...form.register('supportingDocumentRefs')} placeholder="doc://a,doc://b" />
            </FormField>
            <Button type="submit" disabled={mutation.isPending}>Submit correction request</Button>
          </form>
        </CardContent>
      </Card>
      <QueryPage title="Correction requests" query={list} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <DataTable
            label="Corrections"
            columns={[
              { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              { key: 'reasonCode', header: 'Reason' },
              { key: 'priorMarkCode', header: 'Prior' },
              { key: 'proposedMarkCode', header: 'Proposed' },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
          />
        )}
      </QueryPage>
    </div>
  )
}

export function FacultyAdvisingPage() {
  return (
    <RequirePermission anyOf={['advising.read', 'advising.write']}>
      <FacultyAdvisingInner />
    </RequirePermission>
  )
}

function FacultyAdvisingInner() {
  const query = useQuery({ queryKey: ['faculty', 'sessions'], queryFn: () => fetchAdvisingSessions() })
  return (
    <QueryPage title="Academic advising" query={query} isEmpty={(d) => d.length === 0}>
      {(rows) => (
        <DataTable
          label="Advising sessions"
          columns={[
            { key: 'id', header: 'Session', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'mode', header: 'Mode' },
          ]}
          data={rows}
          keyExtractor={(r) => r.id}
        />
      )}
    </QueryPage>
  )
}

export function FacultyAdvisingHistoryPage() {
  return <FacultyAdvisingPage />
}
