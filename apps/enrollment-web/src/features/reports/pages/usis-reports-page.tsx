import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardCard,
  DataTable,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  useNotification,
} from '@wmsu/ui'
import { RequirePermission } from '@/components/auth/require-permission'
import { getApiErrorMessage } from '@/lib/api-client'
import { fetchAcademicYears, fetchPrograms } from '@/lib/usis-api'
import {
  downloadBlob,
  exportReport,
  fetchReport,
  fetchReportCatalog,
  fetchReportsDashboard,
  type ReportFilters,
} from '@/lib/usis-reports-api'

const emptyFilters: ReportFilters = {
  academicYearId: '',
  semester: '',
  campusId: '',
  collegeCode: '',
  programId: '',
  yearLevel: '',
  dateFrom: '',
  dateTo: '',
}

export function UsisReportsPage() {
  return (
    <RequirePermission anyOf={['reports.read', 'enrollments.read', 'applicants.read', 'grades.read', 'scholarships.read', 'guidance.read', 'health.read', 'osa.read']}>
      <UsisReportsInner />
    </RequirePermission>
  )
}

function UsisReportsInner() {
  const { notify } = useNotification()
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters)
  const [applied, setApplied] = useState<ReportFilters>(emptyFilters)
  const [selectedReport, setSelectedReport] = useState<string>('')

  const catalog = useQuery({ queryKey: ['reports', 'catalog'], queryFn: fetchReportCatalog })
  const years = useQuery({ queryKey: ['reports', 'years'], queryFn: fetchAcademicYears })
  const programs = useQuery({ queryKey: ['reports', 'programs'], queryFn: () => fetchPrograms({ limit: 200 }) })
  const dashboard = useQuery({
    queryKey: ['reports', 'dashboard', applied],
    queryFn: () => fetchReportsDashboard(applied),
  })
  const report = useQuery({
    queryKey: ['reports', 'detail', selectedReport, applied],
    queryFn: () => fetchReport(selectedReport, applied),
    enabled: !!selectedReport,
  })

  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'xlsx' | 'pdf' | 'json') => exportReport(selectedReport, format, applied),
    onSuccess: (blob, format) => {
      const ext = format === 'xlsx' ? 'xls' : format
      downloadBlob(blob, `${selectedReport}.${ext}`)
      notify({ tone: 'success', title: `Exported ${format.toUpperCase()}` })
    },
    onError: (err) => notify({ tone: 'danger', title: 'Export failed', description: getApiErrorMessage(err) }),
  })

  const reportOptions = useMemo(() => catalog.data?.reports ?? [], [catalog.data])

  if (catalog.isLoading) return <LoadingState label="Loading reports catalog" />
  if (catalog.isError) {
    return (
      <Alert variant="danger" title="Unable to load report catalog">
        {getApiErrorMessage(catalog.error)}
      </Alert>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & dashboards"
        description={`Role: ${catalog.data?.role ?? '—'} · ENR-033 / ENR-034 / ENR-052`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FormField id="academicYearId" label="Academic year">
            <Select
              id="academicYearId"
              value={filters.academicYearId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, academicYearId: e.target.value }))}
            >
              <option value="">All years</option>
              {(years.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code} · {y.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="semester" label="Semester">
            <Select
              id="semester"
              value={filters.semester === '' || filters.semester == null ? '' : String(filters.semester)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  semester: e.target.value === '' ? '' : Number(e.target.value),
                }))
              }
            >
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </Select>
          </FormField>
          <FormField id="campusId" label="Campus ID">
            <Input
              id="campusId"
              value={filters.campusId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, campusId: e.target.value }))}
              placeholder="Campus UUID"
            />
          </FormField>
          <FormField id="collegeCode" label="College code">
            <Input
              id="collegeCode"
              value={filters.collegeCode ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, collegeCode: e.target.value }))}
              placeholder="e.g. CCS"
            />
          </FormField>
          <FormField id="programId" label="Program">
            <Select
              id="programId"
              value={filters.programId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, programId: e.target.value }))}
            >
              <option value="">All programs</option>
              {(programs.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="yearLevel" label="Year level">
            <Select
              id="yearLevel"
              value={filters.yearLevel === '' || filters.yearLevel == null ? '' : String(filters.yearLevel)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  yearLevel: e.target.value === '' ? '' : Number(e.target.value),
                }))
              }
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="dateFrom" label="Date from">
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </FormField>
          <FormField id="dateTo" label="Date to">
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </FormField>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              type="button"
              onClick={() => {
                setApplied({ ...filters })
                if (!selectedReport && reportOptions[0]) setSelectedReport(reportOptions[0].id)
              }}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilters(emptyFilters)
                setApplied(emptyFilters)
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(dashboard.data?.cards ?? []).map((card) => {
          const primary = Object.entries(card.totals)[0]
          return (
            <button
              key={card.reportId}
              type="button"
              className="text-left"
              onClick={() => setSelectedReport(card.reportId)}
            >
              <DashboardCard
                title={card.title}
                value={primary ? String(primary[1]) : '—'}
                hint={card.validationOk ? 'Validated totals' : 'Check validation'}
                tone={card.confidential ? 'warning' : 'default'}
              />
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="reportId" label="Select report">
            <Select
              id="reportId"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
            >
              <option value="">Choose…</option>
              {reportOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.torIds.includes('ENR-034') ? ' · HEMIS' : ''}
                  {r.confidential ? ' (aggregate / confidential)' : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {report.isLoading ? <LoadingState label="Loading report" /> : null}
          {report.isError ? (
            <Alert variant="danger" title="Report failed">
              {getApiErrorMessage(report.error)}
            </Alert>
          ) : null}

          {report.data ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">{report.data.title}</h2>
                {report.data.confidential ? <Badge>Confidential aggregates</Badge> : null}
                <Badge>{report.data.validation.ok ? 'Totals OK' : 'Totals mismatch'}</Badge>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">{report.data.calculation}</p>
              <Alert variant={report.data.validation.ok ? 'success' : 'warning'} title="Validation">
                {report.data.validation.message}
                {report.data.validation.expectedTotal != null
                  ? ` · expected ${report.data.validation.expectedTotal}, actual ${report.data.validation.actualTotal}`
                  : null}
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate('csv')}
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate('xlsx')}
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exportMutation.isPending}
                  onClick={() => exportMutation.mutate('pdf')}
                >
                  PDF
                </Button>
                {selectedReport.startsWith('hemis-') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={exportMutation.isPending}
                    onClick={() => exportMutation.mutate('json')}
                  >
                    HEMIS JSON
                  </Button>
                ) : null}
              </div>
              <DataTable
                label={report.data.title}
                columns={(report.data.columns.length
                  ? report.data.columns
                  : ['message']
                ).map((key) => ({
                  key,
                  header: key,
                  render: (row: Record<string, unknown>) => String(row[key] ?? '—'),
                }))}
                data={
                  report.data.rows.length
                    ? report.data.rows
                    : [{ message: 'No rows for the current filters' }]
                }
                keyExtractor={(row) =>
                  String(
                    row.id ??
                      row.status ??
                      row.metric ??
                      row.subjectCode ??
                      row.sectionCode ??
                      row.scholarshipCode ??
                      row.requirementCode ??
                      row.collegeCode ??
                      row.campusId ??
                      row.programCode ??
                      row.office ??
                      JSON.stringify(row)
                  )
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
