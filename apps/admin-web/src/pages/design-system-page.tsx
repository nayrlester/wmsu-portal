import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DashboardCard,
  DataTable,
  FileUpload,
  FilterPanel,
  FormField,
  Input,
  Modal,
  PageLayout,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
  useNotification,
} from '@wmsu/ui'
import { LayoutDashboard, Shield, Users, Wallet } from 'lucide-react'

type DemoRow = {
  id: string
  name: string
  system: string
  status: 'Active' | 'Draft' | 'Blocked'
}

const ALL_ROWS: DemoRow[] = [
  { id: '1', name: 'Platform Access', system: 'CMN', status: 'Active' },
  { id: '2', name: 'Enrollment Workspace', system: 'USiS', status: 'Draft' },
  { id: '3', name: 'Library Circulation', system: 'ULMIS', status: 'Active' },
  { id: '4', name: 'Cashiering Console', system: 'UFMS', status: 'Blocked' },
  { id: '5', name: 'Records Desk', system: 'TORMS', status: 'Active' },
]

export function DesignSystemPage() {
  const { notify } = useNotification()
  const [query, setQuery] = useState('')
  const [system, setSystem] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | undefined>()

  const filtered = useMemo(() => {
    return ALL_ROWS.filter((row) => {
      const matchesQuery =
        !query ||
        row.name.toLowerCase().includes(query.toLowerCase()) ||
        row.system.toLowerCase().includes(query.toLowerCase())
      const matchesSystem = system === 'all' || row.system === system
      return matchesQuery && matchesSystem
    })
  }, [query, system])

  const pageSize = 3
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function validateAndNotify() {
    if (!name.trim()) {
      setNameError('Display name is required.')
      return
    }
    setNameError(undefined)
    notify({
      tone: 'success',
      title: 'Validation passed',
      description: 'Shared form feedback pattern is ready for all six systems.',
    })
  }

  return (
    <>
      <PageLayout
        header={{
          title: 'Shared UI foundation',
          description:
            'Enterprise university admin patterns for desktop, tablet, and mobile. No USiS business modules yet.',
          breadcrumbs: [
            { label: 'Platform' },
            { label: 'Admin Portal' },
            { label: 'Design System', current: true },
          ],
          actions: (
            <>
              <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>
                Open modal
              </Button>
              <Button type="button" onClick={() => setConfirmOpen(true)}>
                Confirm action
              </Button>
            </>
          ),
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Systems" value="6" hint="TOR Component A" tone="primary" icon={<LayoutDashboard className="h-5 w-5" />} />
          <DashboardCard title="Shared packages" value="5" hint="ui / types / client…" tone="default" icon={<Users className="h-5 w-5" />} />
          <DashboardCard title="Ready layouts" value="12" hint="Shell + page patterns" tone="success" icon={<Shield className="h-5 w-5" />} />
          <DashboardCard title="Business modules" value="0" hint="Deferred by design" tone="warning" icon={<Wallet className="h-5 w-5" />} />
        </div>

        <FilterPanel
          title="Search & filters"
          onReset={() => {
            setQuery('')
            setSystem('all')
            setPage(1)
          }}
        >
          <FormField id="search" label="Search">
            <SearchInput
              id="search"
              value={query}
              placeholder="Search systems…"
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              onClear={() => {
                setQuery('')
                setPage(1)
              }}
            />
          </FormField>
          <FormField id="system" label="System">
            <Select
              id="system"
              value={system}
              onChange={(event) => {
                setSystem(event.target.value)
                setPage(1)
              }}
            >
              <option value="all">All systems</option>
              <option value="CMN">CMN</option>
              <option value="USiS">USiS</option>
              <option value="ULMIS">ULMIS</option>
              <option value="UFMS">UFMS</option>
              <option value="TORMS">TORMS</option>
            </Select>
          </FormField>
        </FilterPanel>

        <DataTable
          label="Demo systems table"
          columns={[
            { key: 'name', header: 'Workspace' },
            {
              key: 'system',
              header: 'Code',
              render: (row) => <Badge variant="secondary">{row.system}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusBadge
                  label={row.status}
                  tone={row.status === 'Active' ? 'success' : row.status === 'Draft' ? 'warning' : 'danger'}
                />
              ),
            },
          ]}
          data={pageRows}
          keyExtractor={(row) => row.id}
          actions={() => (
            <Button type="button" size="sm" variant="ghost">
              View
            </Button>
          )}
        />
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} totalLabel={`${filtered.length} records`} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Form validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField id="displayName" label="Display name" required error={nameError} description="Shown in headers and audit trails.">
                <Input
                  id="displayName"
                  value={name}
                  invalid={Boolean(nameError)}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Campus Registrar"
                />
              </FormField>
              <FormField id="notes" label="Notes">
                <Textarea id="notes" placeholder="Optional remarks" />
              </FormField>
              <Button type="button" onClick={validateAndNotify}>
                Validate sample form
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>File upload</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload multiple accept=".pdf,.png,.jpg" />
            </CardContent>
          </Card>
        </div>
      </PageLayout>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Reusable modal"
        description="Use Modal for non-destructive forms and detail panels."
        footer={
          <Button type="button" onClick={() => setModalOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-[var(--color-muted-foreground)]">
          This dialog is part of `@wmsu/ui` and can be imported by USiS, UFMS, TORMS, and the other CIS apps.
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm shared action?"
        description="Confirmation dialogs standardize destructive or irreversible actions across systems."
        tone="destructive"
        confirmLabel="Yes, continue"
        onConfirm={() => {
          setConfirmOpen(false)
          notify({ tone: 'success', title: 'Confirmed', description: 'Shared confirm pattern works.' })
        }}
      />
    </>
  )
}
