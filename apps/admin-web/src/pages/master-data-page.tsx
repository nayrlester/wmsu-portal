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
  LoadingState,
  PageLayout,
  StatusBadge,
  useNotification,
} from '@wmsu/ui'
import { Building2, CalendarRange, Hash, Users } from 'lucide-react'
import { mdmApi, type MdmOverview } from '../lib/mdm-api'

const DEV_UNIVERSITY_ID = 'a1111111-1111-4111-8111-111111111111'

export function MasterDataPage() {
  const { notify } = useNotification()
  const [overview, setOverview] = useState<MdmOverview | null>(null)
  const [campuses, setCampuses] = useState<Record<string, unknown>[]>([])
  const [colleges, setColleges] = useState<Record<string, unknown>[]>([])
  const [departments, setDepartments] = useState<Record<string, unknown>[]>([])
  const [offices, setOffices] = useState<Record<string, unknown>[]>([])
  const [years, setYears] = useState<Record<string, unknown>[]>([])
  const [terms, setTerms] = useState<Record<string, unknown>[]>([])
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([])
  const [students, setStudents] = useState<Record<string, unknown>[]>([])
  const [studentNote, setStudentNote] = useState('')
  const [countries, setCountries] = useState<Record<string, unknown>[]>([])
  const [regions, setRegions] = useState<Record<string, unknown>[]>([])
  const [sequences, setSequences] = useState<Record<string, unknown>[]>([])
  const [settings, setSettings] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [campusCode, setCampusCode] = useState('')
  const [campusName, setCampusName] = useState('')
  const [campusError, setCampusError] = useState<string | undefined>()

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [ov, camp, col, dep, off, yr, emp, stu, ctry, seq, set] = await Promise.all([
        mdmApi.overview(),
        mdmApi.campuses(DEV_UNIVERSITY_ID),
        mdmApi.colleges(DEV_UNIVERSITY_ID),
        mdmApi.departments(),
        mdmApi.offices(DEV_UNIVERSITY_ID),
        mdmApi.academicYears(DEV_UNIVERSITY_ID),
        mdmApi.employees(DEV_UNIVERSITY_ID),
        mdmApi.studentIdentityRefs(DEV_UNIVERSITY_ID),
        mdmApi.countries(),
        mdmApi.sequences(DEV_UNIVERSITY_ID),
        mdmApi.settings(DEV_UNIVERSITY_ID),
      ])
      setOverview(ov)
      setCampuses(camp)
      setColleges(col)
      setDepartments(dep)
      setOffices(off)
      setYears(yr)
      setEmployees(emp)
      setStudents(stu.rows)
      setStudentNote(stu.note)
      setCountries(ctry)
      setSequences(seq)
      setSettings(set)
      if (yr[0]?.id) setTerms(await mdmApi.terms(String(yr[0].id)))
      if (ctry[0]?.id) setRegions(await mdmApi.regions(String(ctry[0].id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MDM')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function createCampus() {
    if (!campusCode.trim() || !campusName.trim()) {
      setCampusError('Code and name are required.')
      return
    }
    setCampusError(undefined)
    try {
      await mdmApi.createCampus({
        universityId: DEV_UNIVERSITY_ID,
        code: campusCode.trim(),
        name: campusName.trim(),
      })
      setCampusCode('')
      setCampusName('')
      notify({ tone: 'success', title: 'Campus created', description: 'MDM write audited on the API.' })
      await reload()
    } catch (err) {
      notify({
        tone: 'danger',
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  async function allocateSequence(id: string) {
    try {
      const result = await mdmApi.nextSequence(id)
      notify({
        tone: 'success',
        title: 'Sequence allocated',
        description: `Issued ${result.formatted}`,
      })
      await reload()
    } catch (err) {
      notify({
        tone: 'danger',
        title: 'Sequence failed',
        description: err instanceof Error ? err.message : 'Set VITE_MDM_ADMIN_KEY for writes',
      })
    }
  }

  if (loading) return <LoadingState label="Loading master data…" />

  return (
    <PageLayout
      header={{
        title: 'Master Data Management',
        description:
          'Shared organizational reference data. Student academic records remain owned by USiS; this console manages identity projections and org structure only.',
        breadcrumbs: [
          { label: 'Platform' },
          { label: 'Admin' },
          { label: 'Master Data', current: true },
        ],
        actions: (
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Refresh
          </Button>
        ),
      }}
    >
      {error ? (
        <Alert variant="danger" title="MDM API error">
          {error}
        </Alert>
      ) : null}

      <Alert variant="info" title="Ownership">
        Academic SoR: <strong>{overview?.ownership.studentAcademicSoR}</strong>. Student identity
        projection: <strong>{overview?.ownership.studentIdentityProjection}</strong>. Organization
        SoR: <strong>{overview?.ownership.organizationSoR}</strong>. Seed rows are marked{' '}
        <Badge>DEV</Badge> and are not official WMSU data.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Campuses" value={overview?.counts.campuses ?? 0} tone="primary" icon={<Building2 className="h-5 w-5" />} />
        <DashboardCard title="Academic years" value={overview?.counts.academicYears ?? 0} tone="default" icon={<CalendarRange className="h-5 w-5" />} />
        <DashboardCard title="Employees (ref)" value={overview?.counts.employees ?? 0} tone="success" icon={<Users className="h-5 w-5" />} />
        <DashboardCard title="Sequences" value={overview?.counts.numberSequences ?? 0} tone="warning" icon={<Hash className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create campus (authorized write)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <FormField id="campusCode" label="Code" required error={campusError}>
            <Input id="campusCode" value={campusCode} onChange={(e) => setCampusCode(e.target.value)} placeholder="DEV-EXT" />
          </FormField>
          <FormField id="campusName" label="Name" required>
            <Input id="campusName" value={campusName} onChange={(e) => setCampusName(e.target.value)} placeholder="DEV Extension (Seed)" />
          </FormField>
          <div className="flex items-end">
            <Button type="button" onClick={() => void createCampus()}>
              Save campus
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        label="Campuses"
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'name', header: 'Name' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge label={String(row.status)} tone={row.status === 'active' ? 'success' : 'neutral'} />,
          },
          {
            key: 'is_development_seed',
            header: 'Seed',
            render: (row) => (row.is_development_seed ? <Badge>DEV</Badge> : '—'),
          },
        ]}
        data={campuses}
        keyExtractor={(row) => String(row.id)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          label="Colleges"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
          ]}
          data={colleges}
          keyExtractor={(row) => String(row.id)}
        />
        <DataTable
          label="Departments"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
          ]}
          data={departments}
          keyExtractor={(row) => String(row.id)}
        />
      </div>

      <DataTable
        label="Offices"
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'name', header: 'Name' },
          { key: 'office_type', header: 'Type' },
        ]}
        data={offices}
        keyExtractor={(row) => String(row.id)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          label="Academic years"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
            {
              key: 'is_current',
              header: 'Current',
              render: (row) => (row.is_current ? <Badge variant="success">Yes</Badge> : 'No'),
            },
          ]}
          data={years}
          keyExtractor={(row) => String(row.id)}
        />
        <DataTable
          label="Terms"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
            { key: 'term_type', header: 'Type' },
          ]}
          data={terms}
          keyExtractor={(row) => String(row.id)}
        />
      </div>

      <Alert variant="warning" title="Student identity references">
        {studentNote}
      </Alert>
      <DataTable
        label="Student identity refs"
        columns={[
          { key: 'student_number', header: 'Student no.' },
          { key: 'display_name', header: 'Display name' },
          { key: 'source_system', header: 'Source' },
          { key: 'status', header: 'Status' },
        ]}
        data={students}
        keyExtractor={(row) => String(row.id)}
      />

      <DataTable
        label="Employee references"
        columns={[
          { key: 'employee_number', header: 'Employee no.' },
          { key: 'full_name', header: 'Name' },
          { key: 'email', header: 'Email' },
        ]}
        data={employees}
        keyExtractor={(row) => String(row.id)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          label="Countries"
          columns={[
            { key: 'iso2', header: 'ISO2' },
            { key: 'name', header: 'Name' },
          ]}
          data={countries}
          keyExtractor={(row) => String(row.id)}
        />
        <DataTable
          label="Regions"
          columns={[
            { key: 'code', header: 'Code' },
            { key: 'name', header: 'Name' },
          ]}
          data={regions}
          keyExtractor={(row) => String(row.id)}
        />
      </div>

      <DataTable
        label="Number sequences"
        columns={[
          { key: 'code', header: 'Code' },
          { key: 'prefix', header: 'Prefix' },
          { key: 'next_value', header: 'Next' },
        ]}
        data={sequences}
        keyExtractor={(row) => String(row.id)}
        actions={(row) => (
          <Button type="button" size="sm" variant="outline" onClick={() => void allocateSequence(String(row.id))}>
            Allocate next
          </Button>
        )}
      />

      <DataTable
        label="System settings"
        columns={[
          { key: 'key', header: 'Key' },
          {
            key: 'value',
            header: 'Value',
            render: (row) => <code className="text-xs">{JSON.stringify(row.value)}</code>,
          },
          { key: 'description', header: 'Description' },
        ]}
        data={settings}
        keyExtractor={(row) => String(row.id)}
      />
    </PageLayout>
  )
}
