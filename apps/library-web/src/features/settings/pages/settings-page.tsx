import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDialog } from '@/components/providers/dialog-provider'
import { getApiErrorMessage } from '@/lib/api-client'
import { fetchCurrentTenant, updateCurrentTenant } from '@/lib/auth-api'
import {
  fetchNotificationPreferences,
  updateNotificationPreference,
} from '@/lib/notifications-api'
import { useAuthStore } from '@/stores/auth-store'
import type { NotificationPreference } from '@/types/notifications'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const canUpdate = user?.permissions.includes('settings:update')
  const { toast } = useDialog()
  const qc = useQueryClient()

  const tenantQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: fetchCurrentTenant,
  })

  const prefsQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
  })

  const [form, setForm] = useState({
    name: '',
    timezone: 'Asia/Manila',
    locale: 'en-PH',
    logoUrl: '',
    primaryColor: '#635bff',
    reportScheduleEnabled: false,
    reportScheduleCron: '0 7 * * 1',
    reportScheduleEmails: '',
  })

  useEffect(() => {
    const t = tenantQuery.data
    if (!t) return
    setForm({
      name: t.name || '',
      timezone: t.timezone || 'Asia/Manila',
      locale: t.locale || 'en-PH',
      logoUrl: t.logoUrl || '',
      primaryColor: t.primaryColor || '#635bff',
      reportScheduleEnabled: Boolean(t.reportScheduleEnabled),
      reportScheduleCron: t.reportScheduleCron || '0 7 * * 1',
      reportScheduleEmails: t.reportScheduleEmails || '',
    })
  }, [tenantQuery.data])

  const saveTenant = useMutation({
    mutationFn: () =>
      updateCurrentTenant({
        name: form.name,
        timezone: form.timezone,
        locale: form.locale,
        logoUrl: form.logoUrl || null,
        primaryColor: form.primaryColor || null,
        reportScheduleEnabled: form.reportScheduleEnabled,
        reportScheduleCron: form.reportScheduleCron,
        reportScheduleEmails: form.reportScheduleEmails,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Settings saved')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  async function togglePref(pref: NotificationPreference, field: keyof NotificationPreference) {
    if (field === 'eventType') return
    try {
      await updateNotificationPreference({
        ...pref,
        [field]: !pref[field],
      })
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
      toast.success('Preference updated')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">Institution profile, notifications, and operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/kiosk-platform"
          className="rounded-[1.5rem] bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold">Kiosk Platform</p>
          <p className="mt-1 text-sm text-slate-500">Devices, queue, locator</p>
        </Link>
        <Link
          to="/integrations"
          className="rounded-[1.5rem] bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold">Integrations</p>
          <p className="mt-1 text-sm text-slate-500">ARIS / HRIS / LDAP / SSO</p>
        </Link>
        <Link
          to="/attendance"
          className="rounded-[1.5rem] bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold">Attendance</p>
          <p className="mt-1 text-sm text-slate-500">Entry monitoring log</p>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Slug (read-only)</label>
              <Input value={tenantQuery.data?.slug || ''} disabled />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
              <Input
                value={form.name}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Timezone</label>
              <Input
                value={form.timezone}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Locale</label>
              <Input
                value={form.locale}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, locale: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Logo URL</label>
              <Input
                value={form.logoUrl}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Primary color</label>
              <Input
                value={form.primaryColor}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-primary-soft)] p-4">
            <p className="text-sm font-medium">Scheduled report email</p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.reportScheduleEnabled}
                disabled={!canUpdate}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reportScheduleEnabled: e.target.checked }))
                }
              />
              Enable weekly report email
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                id="report-cron"
                label="Schedule (cron)"
                placeholder="Default Mon 07:00"
                value={form.reportScheduleCron}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, reportScheduleCron: e.target.value }))}
              />
              <Input
                id="report-emails"
                label="Report emails"
                placeholder="Comma-separated addresses"
                value={form.reportScheduleEmails}
                disabled={!canUpdate}
                onChange={(e) => setForm((s) => ({ ...s, reportScheduleEmails: e.target.value }))}
              />
            </div>
          </div>

          {canUpdate && (
            <Button onClick={() => saveTenant.mutate()} disabled={saveTenant.isPending}>
              Save institution settings
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(prefsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-slate-500">
              No preference rows yet. Defaults apply until you toggle a channel below (will create a
              row).
            </p>
          )}
          {(prefsQuery.data ?? []).map((pref) => (
            <div
              key={pref.eventType}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3"
            >
              <p className="text-sm font-medium">{pref.eventType}</p>
              <div className="flex gap-3 text-xs">
                {(
                  [
                    ['inAppEnabled', 'In-app'],
                    ['emailEnabled', 'Email'],
                    ['smsEnabled', 'SMS'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(pref[key])}
                      onChange={() => togglePref(pref, key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {(prefsQuery.data ?? []).length === 0 && (
            <div className="flex flex-wrap gap-2">
              {['due_soon', 'overdue', 'reservation_ready', 'fine_created'].map((eventType) => (
                <Button
                  key={eventType}
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await updateNotificationPreference({
                        eventType,
                        emailEnabled: true,
                        inAppEnabled: true,
                        smsEnabled: false,
                      })
                      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
                      toast.success(`Defaults enabled for ${eventType}`)
                    } catch (err) {
                      toast.error(getApiErrorMessage(err))
                    }
                  }}
                >
                  Enable defaults for {eventType}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
