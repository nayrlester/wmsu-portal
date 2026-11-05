import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { udmsApi } from '@/api/modules/udms.api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'
import { formatDate } from '@/lib/utils'

type Props = {
  documentId: string
  status: string
}

export function DocumentLifecyclePanel({ documentId, status }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canUpdate = hasPermission(PERMISSIONS.documentsUpdate)
  const canRetention = hasPermission(PERMISSIONS.recordsRetentionManage)
  const canArchives = hasPermission(PERMISSIONS.recordsArchivesManage)

  const [scheduleId, setScheduleId] = useState('')
  const [restoreRemarks, setRestoreRemarks] = useState('')
  const [versionNotes, setVersionNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['udms-lifecycle-summary', documentId],
    queryFn: () => udmsApi.getLifecycleSummary(documentId),
  })

  const { data: schedulesData } = useQuery({
    queryKey: ['udms-retention-schedules'],
    queryFn: () => udmsApi.listRetentionSchedules(),
    enabled: canRetention,
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['udms-lifecycle-summary', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['udms-archived'] }),
      queryClient.invalidateQueries({ queryKey: ['udms-retention-due'] }),
    ])
  }

  const createVersion = useMutation({
    mutationFn: () =>
      udmsApi.createVersion(documentId, {
        changeNotes: versionNotes.trim() || undefined,
      }),
  })

  if (isLoading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle & retention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading lifecycle summary…</p>
        </CardContent>
      </Card>
    )
  }

  const runArchive = async () => {
    const ok = await confirm({
      title: 'Archive document?',
      description:
        'Only approved/rejected/completed/returned documents can be archived. Metadata and versions are preserved.',
      confirmLabel: 'Archive',
    })
    if (!ok) return
    setBusy(true)
    try {
      await udmsApi.archive(documentId)
      toast.success('Document archived')
      await invalidate()
    } catch (err) {
      toast.error('Archive failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const runRestore = async () => {
    if (!restoreRemarks.trim()) {
      toast.error('Remarks required', 'Restoration requires remarks.')
      return
    }
    const ok = await confirm({
      title: 'Restore archived document?',
      description: 'Restores to completed status and a non-archived lifecycle stage. History is preserved.',
      confirmLabel: 'Restore',
    })
    if (!ok) return
    setBusy(true)
    try {
      await udmsApi.restore(documentId, { remarks: restoreRemarks.trim() })
      toast.success('Document restored')
      setRestoreRemarks('')
      await invalidate()
    } catch (err) {
      toast.error('Restore failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const runApplyRetention = async () => {
    if (!scheduleId) {
      toast.error('Schedule required', 'Select an existing retention schedule.')
      return
    }
    const ok = await confirm({
      title: 'Apply retention schedule?',
      description:
        'Uses configured schedule periods only. Official NAP period tables remain For Clarification.',
      confirmLabel: 'Apply',
    })
    if (!ok) return
    setBusy(true)
    try {
      await udmsApi.applyRetention(documentId, scheduleId)
      toast.success('Retention schedule applied')
      await invalidate()
    } catch (err) {
      toast.error('Retention update failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const runCreateVersion = async () => {
    setBusy(true)
    try {
      await createVersion.mutateAsync()
      toast.success('New version created')
      setVersionNotes('')
      await invalidate()
    } catch (err) {
      toast.error('Version create failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const archived = status === 'archived' || summary.lifecycle.status === 'archived'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lifecycle & retention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          DMS-003 / DMS-009 / DMS-019–022 facade. Retention period tables and multi-level disposal
          authorities remain For Clarification.
        </p>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Lifecycle</dt>
            <dd className="capitalize">{summary.lifecycle.status.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Archived at</dt>
            <dd>{summary.lifecycle.archivedAt ? formatDate(summary.lifecycle.archivedAt) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current version</dt>
            <dd>{summary.currentVersion?.label ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Retention due</dt>
            <dd>{summary.retention.dueAt ? formatDate(summary.retention.dueAt) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Schedule</dt>
            <dd>{summary.retention.schedule?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Disposition</dt>
            <dd className="capitalize">
              {(summary.retention.dispositionAction ?? '—').replaceAll('_', ' ')}
            </dd>
          </div>
        </dl>

        {canUpdate && !archived && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label htmlFor="versionNotes">New version notes</Label>
            <Textarea
              id="versionNotes"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              rows={2}
              placeholder="Optional revision description"
            />
            <Button size="sm" disabled={busy} onClick={() => void runCreateVersion()}>
              Create version
            </Button>
          </div>
        )}

        {canRetention && !archived && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label htmlFor="retentionSchedule">Apply retention schedule</Label>
            <Select
              id="retentionSchedule"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
            >
              <option value="">Select configured schedule…</option>
              {(schedulesData?.data ?? []).map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name} ({schedule.code})
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void runApplyRetention()}>
              Apply schedule
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canUpdate && !archived && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void runArchive()}>
              Archive
            </Button>
          )}
        </div>

        {canArchives && archived && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Label htmlFor="restoreRemarks">Restore remarks</Label>
            <Textarea
              id="restoreRemarks"
              value={restoreRemarks}
              onChange={(e) => setRestoreRemarks(e.target.value)}
              rows={2}
            />
            <Button size="sm" disabled={busy} onClick={() => void runRestore()}>
              Restore from archive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
