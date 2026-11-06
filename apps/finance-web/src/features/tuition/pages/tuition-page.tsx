import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pagination, ConfirmDialog } from '@wmsu/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-chrome'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  DEFAULT_FEE_LINES,
  FeeScheduleLineEditor,
  type FeeLineDraft,
} from '../components/fee-schedule-line-editor'
import {
  deactivateTuitionFeeSchedule,
  deactivatePaymentPlanTemplate,
  fetchEnrollmentPaymentPolicy,
  fetchPaymentPlanTemplates,
  fetchTuitionFeeScheduleScope,
  fetchTuitionFeeSchedules,
  upsertEnrollmentPaymentPolicy,
  upsertPaymentPlanTemplate,
  upsertTuitionFeeSchedule,
  updateTuitionFeeSchedule,
  updatePaymentPlanTemplate,
} from '../api/tuition-api'

const DEFAULT_EXAM_INSTALLMENTS = [
  { label: 'Downpayment', percent: 25 },
  { label: 'Prelim', percent: 25 },
  { label: 'Midterm', percent: 25 },
  { label: 'Finals', percent: 25 },
]

const TUITION_LIST_PAGE_SIZE = 5

function paginateList<T>(items: T[], page: number, pageSize = TUITION_LIST_PAGE_SIZE) {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize
  return {
    slice: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}

function listPageLabel(from: number, to: number, total: number, page: number, pageCount: number) {
  if (total === 0) return 'No records'
  return `Showing ${from}–${to} of ${total} · Page ${page} of ${pageCount}`
}

function parsePlanInstallments(row: Record<string, unknown>) {
  const raw = row.installments_json ?? row.installmentsJson
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {
      return DEFAULT_EXAM_INSTALLMENTS
    }
  }
  if (Array.isArray(raw) && raw.length) return raw
  return DEFAULT_EXAM_INSTALLMENTS
}

function linesFromScheduleRow(row: Record<string, unknown>): FeeLineDraft[] {
  const raw = row.lines
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FEE_LINES
  return raw.map((line, index) => {
    const l = line as Record<string, unknown>
    return {
      key: String(l.id ?? `line-${index}`),
      feeCode: String(l.feeCode ?? l.fee_code ?? ''),
      description: String(l.description ?? ''),
      feeType: (l.feeType ?? l.fee_type ?? 'miscellaneous') as FeeLineDraft['feeType'],
      calculationMethod: (l.calculationMethod ??
        l.calculation_method ??
        'fixed') as FeeLineDraft['calculationMethod'],
      amount: Number(l.amount ?? 0),
      subjectCode:
        (l.subjectCode ?? l.subject_code) ? String(l.subjectCode ?? l.subject_code) : undefined,
    }
  })
}

export function TuitionPage() {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [scheduleCode, setScheduleCode] = useState('PH-TUITION-STD')
  const [scheduleName, setScheduleName] = useState('Standard per-unit tuition')
  const [academicYearId, setAcademicYearId] = useState('')
  const [semester, setSemester] = useState('')
  const [classification, setClassification] = useState('')
  const [programId, setProgramId] = useState('')
  const [feeLines, setFeeLines] = useState<FeeLineDraft[]>(DEFAULT_FEE_LINES)
  const [planCode, setPlanCode] = useState('PH-EXAM')
  const [planName, setPlanName] = useState('Exam period (downpayment + prelim/midterm/finals)')
  const [planType, setPlanType] = useState<'exam_period' | 'monthly'>('exam_period')
  const [monthlyCount, setMonthlyCount] = useState('4')
  const [planInstallments, setPlanInstallments] =
    useState<Array<{ label: string; percent: number }>>(DEFAULT_EXAM_INSTALLMENTS)
  const [minimumDueMode, setMinimumDueMode] = useState<
    'full_net' | 'first_installment' | 'downpayment_percent'
  >('first_installment')
  const [downpaymentPercent, setDownpaymentPercent] = useState('25')
  const [defaultPlanTemplateId, setDefaultPlanTemplateId] = useState('')
  const [scheduleListPage, setScheduleListPage] = useState(1)
  const [planListPage, setPlanListPage] = useState(1)
  const [schedulePageSize, setSchedulePageSize] = useState(TUITION_LIST_PAGE_SIZE)
  const [planPageSize, setPlanPageSize] = useState(TUITION_LIST_PAGE_SIZE)
  const [removeTarget, setRemoveTarget] = useState<{
    kind: 'schedule' | 'plan'
    id: string
    code: string
  } | null>(null)

  const scopeQuery = useQuery({
    queryKey: ['tuition-fee-schedule-scope'],
    queryFn: fetchTuitionFeeScheduleScope,
  })
  const schedulesQuery = useQuery({
    queryKey: ['tuition-fee-schedules'],
    queryFn: fetchTuitionFeeSchedules,
  })
  const plansQuery = useQuery({
    queryKey: ['tuition-payment-plans'],
    queryFn: fetchPaymentPlanTemplates,
  })
  const policyQuery = useQuery({
    queryKey: ['tuition-payment-policy'],
    queryFn: fetchEnrollmentPaymentPolicy,
  })

  useEffect(() => {
    const policy = policyQuery.data
    if (!policy) return
    const mode = policy.minimumDueMode ?? policy.minimum_due_mode
    if (mode === 'full_net' || mode === 'first_installment' || mode === 'downpayment_percent') {
      setMinimumDueMode(mode)
    }
    const dp = policy.downpaymentPercent ?? policy.downpayment_percent
    if (dp != null && dp !== '') setDownpaymentPercent(String(dp))
    const planId = policy.defaultPaymentPlanTemplateId ?? policy.default_payment_plan_template_id
    if (planId) setDefaultPlanTemplateId(String(planId))
  }, [policyQuery.data])

  const resetScheduleForm = () => {
    setEditingScheduleId(null)
    setScheduleCode('PH-TUITION-STD')
    setScheduleName('Standard per-unit tuition')
    setAcademicYearId('')
    setSemester('')
    setClassification('')
    setProgramId('')
    setFeeLines(DEFAULT_FEE_LINES)
  }

  const loadScheduleForEdit = (row: Record<string, unknown>) => {
    setEditingScheduleId(String(row.id))
    setScheduleCode(String(row.code ?? ''))
    setScheduleName(String(row.name ?? ''))
    setAcademicYearId(
      row.academicYearId
        ? String(row.academicYearId)
        : row.academic_year_id
          ? String(row.academic_year_id)
          : ''
    )
    setSemester(row.semester != null && row.semester !== '' ? String(row.semester) : '')
    setClassification(row.classification ? String(row.classification) : '')
    setProgramId(
      row.programId ? String(row.programId) : row.program_id ? String(row.program_id) : ''
    )
    setFeeLines(linesFromScheduleRow(row))
    setError(null)
  }

  const saveSchedule = useMutation({
    mutationFn: () => {
      const lines = feeLines
        .filter((l) => l.feeCode.trim() && l.description.trim())
        .map(({ key: _key, ...line }) => ({ ...line, amount: Number(line.amount) }))
      if (!lines.length) throw new Error('Add at least one fee line')
      const body = {
        code: scheduleCode.trim(),
        name: scheduleName.trim(),
        academicYearId: academicYearId || undefined,
        semester: semester ? Number(semester) : undefined,
        classification: classification || undefined,
        programId: programId || undefined,
        lines,
      }
      if (editingScheduleId) {
        return updateTuitionFeeSchedule(editingScheduleId, body)
      }
      return upsertTuitionFeeSchedule(body)
    },
    onSuccess: () => {
      setError(null)
      resetScheduleForm()
      void qc.invalidateQueries({ queryKey: ['tuition-fee-schedules'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const removeSchedule = useMutation({
    mutationFn: (scheduleId: string) => deactivateTuitionFeeSchedule(scheduleId),
    onSuccess: () => {
      setError(null)
      if (editingScheduleId) resetScheduleForm()
      void qc.invalidateQueries({ queryKey: ['tuition-fee-schedules'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const resetPlanForm = () => {
    setEditingPlanId(null)
    setPlanCode('PH-EXAM')
    setPlanName('Exam period (downpayment + prelim/midterm/finals)')
    setPlanType('exam_period')
    setMonthlyCount('4')
    setPlanInstallments(DEFAULT_EXAM_INSTALLMENTS)
  }

  const loadPlanForEdit = (row: Record<string, unknown>) => {
    setEditingPlanId(String(row.id))
    setPlanCode(String(row.code ?? ''))
    setPlanName(String(row.name ?? ''))
    const type = String(row.plan_type ?? row.planType ?? 'exam_period')
    setPlanType(type === 'monthly' ? 'monthly' : 'exam_period')
    if (type === 'monthly') {
      setMonthlyCount(String(row.monthly_count ?? row.monthlyCount ?? 4))
    } else {
      setPlanInstallments(parsePlanInstallments(row) as Array<{ label: string; percent: number }>)
    }
    setError(null)
  }

  const savePlan = useMutation({
    mutationFn: () => {
      const body = {
        code: planCode.trim(),
        name: planName.trim(),
        planType,
        downpaymentPercent: planType === 'exam_period' ? 25 : undefined,
        monthlyCount: planType === 'monthly' ? Number(monthlyCount) : undefined,
        installments: planType === 'exam_period' ? planInstallments : [],
      }
      if (editingPlanId) {
        return updatePaymentPlanTemplate(editingPlanId, body)
      }
      return upsertPaymentPlanTemplate(body)
    },
    onSuccess: () => {
      setError(null)
      resetPlanForm()
      void qc.invalidateQueries({ queryKey: ['tuition-payment-plans'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const removePlan = useMutation({
    mutationFn: (templateId: string) => deactivatePaymentPlanTemplate(templateId),
    onSuccess: (_data, templateId) => {
      setError(null)
      if (editingPlanId === templateId) resetPlanForm()
      if (defaultPlanTemplateId === templateId) setDefaultPlanTemplateId('')
      void qc.invalidateQueries({ queryKey: ['tuition-payment-plans'] })
      void qc.invalidateQueries({ queryKey: ['tuition-payment-policy'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const savePolicy = useMutation({
    mutationFn: () =>
      upsertEnrollmentPaymentPolicy({
        minimumDueMode,
        downpaymentPercent:
          minimumDueMode === 'downpayment_percent' ? Number(downpaymentPercent) : undefined,
        defaultPaymentPlanTemplateId: defaultPlanTemplateId || null,
      }),
    onSuccess: () => {
      setError(null)
      void qc.invalidateQueries({ queryKey: ['tuition-payment-policy'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const planOptions = (plansQuery.data ?? []).map((row) => ({
    value: String(row.id),
    label: `${String(row.code)} — ${String(row.name)}`,
  }))

  const scheduleList = schedulesQuery.data ?? []
  const planList = plansQuery.data ?? []

  const schedulePaged = useMemo(
    () => paginateList(scheduleList, scheduleListPage, schedulePageSize),
    [scheduleList, scheduleListPage, schedulePageSize]
  )
  const planPaged = useMemo(
    () => paginateList(planList, planListPage, planPageSize),
    [planList, planListPage, planPageSize]
  )

  useEffect(() => {
    if (scheduleListPage > schedulePaged.pageCount) setScheduleListPage(schedulePaged.pageCount)
  }, [scheduleListPage, schedulePaged.pageCount])

  useEffect(() => {
    if (planListPage > planPaged.pageCount) setPlanListPage(planPaged.pageCount)
  }, [planListPage, planPaged.pageCount])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tuition & payment plans"
        description="Configure curriculum fee schedules (tuition, books, uniforms, misc), installment templates, and registration minimum due for USiS assessment and UFMS collection."
      />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Fee schedule</h2>
            {editingScheduleId ? (
              <Badge>Editing existing schedule</Badge>
            ) : (
              <Badge>New schedule</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            USiS prepare assessment picks the best matching active schedule by org, academic year,
            semester, program, and student classification. Leave scope blank to apply broadly.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Input
              label="Schedule code"
              value={scheduleCode}
              onChange={(e) => setScheduleCode(e.target.value)}
              placeholder="e.g. PH-TUITION-STD"
            />
            <Input
              label="Schedule name"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Display name for registrars"
            />
            <Select
              label="Academic year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              placeholder="Any academic year"
              options={(scopeQuery.data?.academicYears ?? []).map((y) => ({
                value: y.id,
                label: `${y.code} — ${y.name}`,
              }))}
            />
            <Select
              label="Semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Any semester"
              options={[
                { value: '1', label: '1st semester' },
                { value: '2', label: '2nd semester' },
                { value: '3', label: 'Summer' },
              ]}
            />
            <Select
              label="Student classification"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              placeholder="Any classification"
              options={(scopeQuery.data?.classifications ?? []).map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
            <Select
              label="Program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              placeholder="Any program"
              options={(scopeQuery.data?.programs ?? []).map((p) => ({
                value: p.id,
                label: `${p.code} — ${p.name}`,
              }))}
            />
          </div>
          <div className="mt-4">
            <FeeScheduleLineEditor lines={feeLines} onChange={setFeeLines} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={saveSchedule.isPending} onClick={() => saveSchedule.mutate()}>
              {saveSchedule.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : editingScheduleId ? (
                'Update fee schedule'
              ) : (
                'Save fee schedule'
              )}
            </Button>
            {editingScheduleId ? (
              <Button type="button" variant="outline" onClick={() => resetScheduleForm()}>
                Cancel edit
              </Button>
            ) : null}
          </div>
          {schedulesQuery.isLoading ? (
            <Spinner className="mt-4 h-5 w-5" />
          ) : (
            <>
              <ul className="mt-4 space-y-2 text-sm">
                {schedulePaged.slice.map((row) => (
                  <li
                    key={String(row.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge>{String(row.code)}</Badge>
                      <span className="truncate">{String(row.name)}</span>
                      {row.classification ? (
                        <span className="text-[var(--color-muted-foreground)]">
                          {String(row.classification)}
                        </span>
                      ) : null}
                      {Array.isArray(row.lines) ? (
                        <span className="text-[var(--color-muted-foreground)]">
                          {row.lines.length} line(s)
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadScheduleForEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={removeSchedule.isPending}
                        onClick={() =>
                          setRemoveTarget({
                            kind: 'schedule',
                            id: String(row.id),
                            code: String(row.code),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {schedulePaged.total > 0 ? (
                <Pagination
                  className="mt-3"
                  page={schedulePaged.page}
                  pageCount={schedulePaged.pageCount}
                  pageSize={schedulePageSize}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                  onPageSizeChange={(size) => {
                    setSchedulePageSize(size)
                    setScheduleListPage(1)
                  }}
                  onPageChange={setScheduleListPage}
                  totalLabel={listPageLabel(
                    schedulePaged.from,
                    schedulePaged.to,
                    schedulePaged.total,
                    schedulePaged.page,
                    schedulePaged.pageCount
                  )}
                />
              ) : null}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Installment template</h2>
            {editingPlanId ? <Badge>Editing existing template</Badge> : <Badge>New template</Badge>}
          </div>
          <div className="mt-4 grid gap-3">
            <Input
              label="Template code"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              placeholder="e.g. PH-EXAM"
            />
            <Input
              label="Template name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Short description for staff"
            />
            <Select
              label="Plan type"
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'exam_period' | 'monthly')}
              options={[
                {
                  value: 'exam_period',
                  label: 'Exam period (downpayment + prelim/midterm/finals)',
                },
                { value: 'monthly', label: 'Monthly equal splits' },
              ]}
            />
            {planType === 'monthly' ? (
              <Input
                label="Number of monthly installments"
                type="number"
                value={monthlyCount}
                onChange={(e) => setMonthlyCount(e.target.value)}
                placeholder="4"
              />
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={savePlan.isPending} onClick={() => savePlan.mutate()}>
              {savePlan.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : editingPlanId ? (
                'Update payment plan'
              ) : (
                'Save payment plan'
              )}
            </Button>
            {editingPlanId ? (
              <Button type="button" variant="outline" onClick={() => resetPlanForm()}>
                Cancel edit
              </Button>
            ) : null}
          </div>
          {plansQuery.isLoading ? (
            <Spinner className="mt-4 h-5 w-5" />
          ) : (
            <>
              <ul className="mt-4 space-y-2 text-sm">
                {planPaged.slice.map((row) => (
                  <li
                    key={String(row.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge>{String(row.code)}</Badge>
                      <span className="truncate">{String(row.name)}</span>
                      <span className="text-[var(--color-muted-foreground)]">
                        {String(row.plan_type ?? row.planType)}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadPlanForEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={removePlan.isPending}
                        onClick={() =>
                          setRemoveTarget({
                            kind: 'plan',
                            id: String(row.id),
                            code: String(row.code),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {planPaged.total > 0 ? (
                <Pagination
                  className="mt-3"
                  page={planPaged.page}
                  pageCount={planPaged.pageCount}
                  pageSize={planPageSize}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                  onPageSizeChange={(size) => {
                    setPlanPageSize(size)
                    setPlanListPage(1)
                  }}
                  onPageChange={setPlanListPage}
                  totalLabel={listPageLabel(
                    planPaged.from,
                    planPaged.to,
                    planPaged.total,
                    planPaged.page,
                    planPaged.pageCount
                  )}
                />
              ) : null}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold">Registration minimum due</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            USiS verify-payment unlocks registrar registration when paid amount meets this policy.
            Link the installment template used when assessments open AR in UFMS.
          </p>
          <div className="mt-4 grid gap-3">
            <Select
              label="Minimum due for registration"
              value={minimumDueMode}
              onChange={(e) =>
                setMinimumDueMode(
                  e.target.value as 'full_net' | 'first_installment' | 'downpayment_percent'
                )
              }
              options={[
                { value: 'first_installment', label: 'First installment' },
                { value: 'downpayment_percent', label: 'Downpayment percent' },
                { value: 'full_net', label: 'Full net' },
              ]}
            />
            {minimumDueMode === 'downpayment_percent' ? (
              <Input
                label="Downpayment percent"
                type="number"
                value={downpaymentPercent}
                onChange={(e) => setDownpaymentPercent(e.target.value)}
              />
            ) : null}
            <Select
              label="Default installment template"
              value={defaultPlanTemplateId}
              onChange={(e) => setDefaultPlanTemplateId(e.target.value)}
              placeholder="Auto-match by program / classification"
              options={planOptions}
            />
            <Button disabled={savePolicy.isPending} onClick={() => savePolicy.mutate()}>
              {savePolicy.isPending ? <Spinner className="h-4 w-4" /> : 'Save policy'}
            </Button>
            {policyQuery.data ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Saved mode:{' '}
                {String(
                  policyQuery.data.minimumDueMode ?? policyQuery.data.minimum_due_mode ?? '—'
                )}
              </p>
            ) : null}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title={`Remove ${removeTarget?.code ?? 'record'}?`}
        description={
          removeTarget?.kind === 'plan'
            ? 'New assessments will no longer use this template. Existing student installments are unchanged.'
            : 'It will no longer apply to new assessments. Past assessments are unchanged.'
        }
        confirmLabel="Remove"
        tone="destructive"
        loading={removeSchedule.isPending || removePlan.isPending}
        onConfirm={() => {
          if (!removeTarget) return
          if (removeTarget.kind === 'schedule') removeSchedule.mutate(removeTarget.id)
          else removePlan.mutate(removeTarget.id)
          setRemoveTarget(null)
        }}
      />
    </div>
  )
}
