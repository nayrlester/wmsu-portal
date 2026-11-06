import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  fetchIntegrationsStatus,
  syncEnrollmentStudents,
  syncArisStudents,
  syncHrisEmployees,
} from '@/lib/integrations-api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/lib/sweet-alert'
import { getApiErrorMessage } from '@/lib/api-client'

const ARIS_SAMPLE = `[
  {
    "studentId": "2024-0001",
    "fullName": "Juan Dela Cruz",
    "email": "juan@university.edu",
    "department": "Computer Science",
    "enrolled": true,
    "academicStatus": "enrolled"
  }
]`

const HRIS_SAMPLE = `[
  {
    "employeeId": "EMP-100",
    "fullName": "Maria Santos",
    "email": "maria@university.edu",
    "department": "Library",
    "active": true,
    "roleHint": "faculty"
  }
]`

export function IntegrationsPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.permissions.includes('settings:update')
  const [arisJson, setArisJson] = useState(ARIS_SAMPLE)
  const [hrisJson, setHrisJson] = useState(HRIS_SAMPLE)

  const { data: status, isLoading } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: fetchIntegrationsStatus,
    enabled: Boolean(canManage),
  })

  const [syncResult, setSyncResult] = useState('')

  const enrollmentMut = useMutation({
    mutationFn: syncEnrollmentStudents,
    onSuccess: (result) => {
      const message = `Enrollment sync: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
      setSyncResult(message)
      toast.success(message)
    },
    onError: (err) => {
      const message = getApiErrorMessage(err) || 'Enrollment sync failed'
      setSyncResult(message)
      toast.error(message)
    },
  })

  const arisMut = useMutation({
    mutationFn: async () => {
      const students = JSON.parse(arisJson) as unknown[]
      if (!Array.isArray(students)) throw new Error('ARIS payload must be a JSON array')
      return syncArisStudents(students)
    },
    onSuccess: (result) =>
      toast.success(
        `ARIS sync: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
      ),
    onError: (err) => toast.error(getApiErrorMessage(err) || 'ARIS sync failed'),
  })

  const hrisMut = useMutation({
    mutationFn: async () => {
      const employees = JSON.parse(hrisJson) as unknown[]
      if (!Array.isArray(employees)) throw new Error('HRIS payload must be a JSON array')
      return syncHrisEmployees(employees)
    },
    onSuccess: (result) =>
      toast.success(
        `HRIS sync: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
      ),
    onError: (err) => toast.error(getApiErrorMessage(err) || 'HRIS sync failed'),
  })

  const channels = useMemo(
    () => [
      {
        key: 'aris',
        title: 'ARIS (students)',
        status: status?.aris,
      },
      {
        key: 'hris',
        title: 'HRIS (employees)',
        status: status?.hris,
      },
      {
        key: 'ldap',
        title: 'LDAP / Active Directory',
        status: status?.ldap,
      },
      {
        key: 'sso',
        title: 'Smart Campus SSO',
        status: status?.smartCampusSso,
      },
    ],
    [status]
  )

  if (!canManage) {
    return (
      <div className="ui-card border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Integrations require the settings:update permission.{' '}
        <Link to="/settings" className="text-[var(--color-primary)] hover:underline">
          Back to Settings
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Integrations
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          ARIS / HRIS inbound sync · LDAP and SSO remain disabled until verified
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-sm text-slate-500">Loading status...</CardContent>
              </Card>
            ))
          : channels.map((ch) => (
              <Card key={ch.key}>
                <CardContent className="p-4">
                  <p className="font-medium text-slate-900">{ch.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {ch.status?.mode === 'not_enabled'
                      ? 'Not enabled'
                      : ch.status?.configured
                        ? `Configured · ${ch.status.mode}`
                        : `Ready for inbound push · ${ch.status?.mode ?? 'unknown'}`}
                  </p>
                  {ch.status?.note && (
                    <p className="mt-2 text-xs text-slate-400">{ch.status.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-medium text-slate-900">USiS enrollment</p>
            <p className="text-sm text-slate-500">
              Copy active student records into library patrons. An existing patron with the same email keeps the current library card.
            </p>
          </div>
          <Button
            className="whitespace-nowrap"
            onClick={() => enrollmentMut.mutate()}
            disabled={enrollmentMut.isPending}
          >
            Sync from enrollment
          </Button>
          {syncResult ? (
            <p className="text-sm text-slate-700" data-testid="enrollment-sync-result">
              {syncResult}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-medium text-slate-900">ARIS student sync</p>
            <p className="text-sm text-slate-500">Paste a JSON array of student records</p>
          </div>
          <textarea
            className="min-h-[180px] w-full rounded-xl border border-[var(--color-border)] bg-white p-3 font-mono text-xs"
            value={arisJson}
            onChange={(e) => setArisJson(e.target.value)}
          />
          <Button onClick={() => arisMut.mutate()} disabled={arisMut.isPending}>
            Sync ARIS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-medium text-slate-900">HRIS employee sync</p>
            <p className="text-sm text-slate-500">Paste a JSON array of employee records</p>
          </div>
          <textarea
            className="min-h-[180px] w-full rounded-xl border border-[var(--color-border)] bg-white p-3 font-mono text-xs"
            value={hrisJson}
            onChange={(e) => setHrisJson(e.target.value)}
          />
          <Button onClick={() => hrisMut.mutate()} disabled={hrisMut.isPending}>
            Sync HRIS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="font-medium text-slate-900">LDAP / SSO</p>
          <p className="text-sm text-slate-500">
            Not enabled until a verified directory client and signature-checked SSO assertion
            flow are configured. Password binds and unverified assertion exchange stay disabled.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
