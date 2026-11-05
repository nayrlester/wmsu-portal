import { useEffect, useState } from 'react'
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
  PageLayout,
  StatusBadge,
} from '@wmsu/ui'
import { Link2, ShieldAlert, Workflow } from 'lucide-react'
import { integrationApi, type IntegrationOverview } from '../lib/integration-api'

export function IntegrationServicesPage() {
  const [overview, setOverview] = useState<IntegrationOverview | null>(null)
  const [types, setTypes] = useState<Record<string, unknown>[]>([])
  const [subjectKey, setSubjectKey] = useState('DEV-STU-0001')
  const [evaluation, setEvaluation] = useState<{
    overallStatus: string
    breakdown: Array<Record<string, unknown>>
    note: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setError(null)
    try {
      const [ov, ty] = await Promise.all([integrationApi.overview(), integrationApi.clearanceTypes()])
      setOverview(ov)
      setTypes(ty)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CIS overview')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function evaluate() {
    setBusy(true)
    setError(null)
    try {
      setEvaluation(await integrationApi.clearance(subjectKey))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluate failed')
    } finally {
      setBusy(false)
    }
  }

  async function seedDeficiency() {
    setBusy(true)
    setError(null)
    const idempotencyKey = `admin-clr-${subjectKey}-${Date.now()}`
    try {
      await integrationApi.upsertRequirement(
        {
          requirementTypeCode: 'DEV-ACAD-HOLD',
          subjectKey,
          status: 'With Deficiency',
          notes: 'Admin portal foundation probe',
          sourceSystem: 'admin-portal',
          idempotencyKey,
        },
        idempotencyKey
      )
      setEvaluation(await integrationApi.clearance(subjectKey))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upsert failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageLayout
      header={{
        title: 'Common Integration Services',
        description:
          'Central API layer, events, clearance foundation, audit, and storage — no six-system workflows.',
      }}
    >
      <div className="space-y-6" data-testid="integration-services-page">
        {error ? (
          <Alert variant="danger" title="CIS API error">
            <span data-testid="integration-error">{error}</span>
          </Alert>
        ) : null}

        <Alert variant="info" title="Ownership">
          Enrollment/academic SoR stays with USiS; financial posting with UFMS. Platform CIS aggregates
          configurable clearance requirements and integration plumbing only.
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardCard
            title="Capabilities"
            value={overview?.capabilities.length ?? 0}
            tone="primary"
            icon={<Workflow className="h-5 w-5" />}
          />
          <DashboardCard
            title="Clearance types"
            value={overview?.counts.clearanceRequirementTypes ?? 0}
            tone="warning"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <DashboardCard
            title="Domain events"
            value={overview?.counts.domainEvents ?? 0}
            tone="default"
            icon={<Link2 className="h-5 w-5" />}
          />
        </div>

        {overview ? (
          <Card>
            <CardHeader>
              <CardTitle>Ownership boundaries</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm" data-testid="ownership-boundaries">
                {Object.entries(overview.ownershipBoundaries).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-medium">{k}</span>: {v}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Clearance evaluation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <FormField id="subjectKey" label="Subject key" required>
              <Input
                id="subjectKey"
                value={subjectKey}
                onChange={(e) => setSubjectKey(e.target.value)}
                data-testid="clearance-subject-key"
              />
            </FormField>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="button" onClick={() => void evaluate()} disabled={busy} data-testid="evaluate-clearance">
                Evaluate clearance
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void seedDeficiency()}
                disabled={busy}
                data-testid="upsert-deficiency"
              >
                Record academic deficiency
              </Button>
            </div>
            {evaluation ? (
              <div className="md:col-span-3 space-y-3" data-testid="clearance-evaluation">
                <p className="text-sm">
                  Overall status:{' '}
                  <StatusBadge
                    label={evaluation.overallStatus}
                    tone={evaluation.overallStatus === 'Cleared' ? 'success' : 'warning'}
                  />
                </p>
                <p className="text-xs text-slate-500">{evaluation.note}</p>
                <DataTable
                  label="Requirement breakdown"
                  columns={[
                    { key: 'officeCode', header: 'Office', render: (r) => String(r.officeCode ?? '') },
                    { key: 'typeCode', header: 'Type', render: (r) => String(r.typeCode ?? '') },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => <Badge>{String(r.status ?? '')}</Badge>,
                    },
                    { key: 'sourceSystem', header: 'Source', render: (r) => String(r.sourceSystem ?? '') },
                  ]}
                  data={evaluation.breakdown}
                  keyExtractor={(r) => String(r.requirementId ?? `${r.typeCode}-${r.status}`)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <DataTable
          label="Clearance requirement types"
          columns={[
            { key: 'code', header: 'Code', render: (r) => String(r.code ?? '') },
            { key: 'office_code', header: 'Office', render: (r) => String(r.office_code ?? '') },
            {
              key: 'policy_status',
              header: 'Policy',
              render: (r) => <StatusBadge label={String(r.policy_status ?? '')} tone="info" />,
            },
            {
              key: 'requires_university_approval',
              header: 'Needs approval',
              render: (r) => (r.requires_university_approval ? 'yes' : 'no'),
            },
          ]}
          data={types}
          keyExtractor={(r) => String(r.id ?? r.code)}
        />
      </div>
    </PageLayout>
  )
}
