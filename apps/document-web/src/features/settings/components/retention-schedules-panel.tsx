import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { recordsApi } from '@/api/modules/records.api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'

const NAP_OPTIONS = [
  { value: 'administrative', label: 'Administrative' },
  { value: 'financial_property', label: 'Financial and property' },
  { value: 'legal_contractual', label: 'Legal and contractual' },
  { value: 'academic_instructional', label: 'Academic and instructional' },
  { value: 'personnel', label: 'Personnel' },
  { value: 'student_support', label: 'Student and support' },
  { value: 'institutional_governance', label: 'Institutional governance' },
]

const DISPOSITION_OPTIONS = [
  { value: 'archive', label: 'Archive' },
  { value: 'dispose', label: 'Dispose' },
  { value: 'permanent', label: 'Permanent' },
]

export function RetentionSchedulesPanel() {
  const queryClient = useQueryClient()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission(PERMISSIONS.recordsRetentionManage)

  const { data, isLoading } = useQuery({
    queryKey: ['retention-schedules'],
    queryFn: () => recordsApi.listSchedules(),
  })

  const [form, setForm] = useState({
    name: '',
    code: '',
    napCategory: 'administrative',
    retentionYears: 5,
    retentionMonths: 0,
    dispositionAction: 'archive',
    description: '',
  })

  const createMutation = useMutation({
    mutationFn: () => recordsApi.createSchedule(form),
    onSuccess: () => {
      toast.success('Retention schedule created')
      queryClient.invalidateQueries({ queryKey: ['retention-schedules'] })
      setForm((prev) => ({ ...prev, name: '', code: '', description: '' }))
    },
    onError: (err) => {
      toast.error('Create failed', err instanceof ApiError ? err.message : undefined)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.deleteSchedule(id),
    onSuccess: () => {
      toast.success('Schedule deleted')
      queryClient.invalidateQueries({ queryKey: ['retention-schedules'] })
    },
    onError: (err) => {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined)
    },
  })

  const agencyPackMutation = useMutation({
    mutationFn: (packs: Array<'coa' | 'ched'>) => recordsApi.applyAgencyPacks(packs),
    onSuccess: (result) => {
      toast.success('Agency packs applied', `${result.upserted} schedules upserted`)
      queryClient.invalidateQueries({ queryKey: ['retention-schedules'] })
    },
    onError: (err) => {
      toast.error('Agency pack failed', err instanceof ApiError ? err.message : undefined)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Retention schedules (NAP)</h3>
          <p className="text-sm text-muted-foreground">
            Default NAP General Circular No. 5 categories are provisioned per tenant. Customize retention
            periods as needed.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={agencyPackMutation.isPending}
              onClick={() => agencyPackMutation.mutate(['coa'])}
            >
              Apply COA pack
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={agencyPackMutation.isPending}
              onClick={() => agencyPackMutation.mutate(['ched'])}
            >
              Apply CHED pack
            </Button>
            <Button
              size="sm"
              disabled={agencyPackMutation.isPending}
              onClick={() => agencyPackMutation.mutate(['coa', 'ched'])}
            >
              Apply COA + CHED
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          {data?.schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{schedule.name}</p>
                  <Badge variant="secondary">{schedule.code}</Badge>
                  {schedule.isSystem && <Badge variant="outline">System</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {schedule.napCategory.replaceAll('_', ' ')} · {schedule.retentionYears}y{' '}
                  {schedule.retentionMonths}m · {schedule.dispositionAction}
                </p>
              </div>
              {canManage && !schedule.isSystem && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(schedule.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="space-y-3 rounded-md border border-border p-4">
          <h4 className="font-medium">Add custom schedule</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ret-name">Name</Label>
              <Input
                id="ret-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ret-code">Code</Label>
              <Input
                id="ret-code"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ret-nap">NAP category</Label>
              <Select
                id="ret-nap"
                value={form.napCategory}
                onChange={(e) => setForm((p) => ({ ...p, napCategory: e.target.value }))}
              >
                {NAP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ret-disp">Disposition</Label>
              <Select
                id="ret-disp"
                value={form.dispositionAction}
                onChange={(e) => setForm((p) => ({ ...p, dispositionAction: e.target.value }))}
              >
                {DISPOSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ret-years">Retention years</Label>
              <Input
                id="ret-years"
                type="number"
                min={0}
                value={form.retentionYears}
                onChange={(e) => setForm((p) => ({ ...p, retentionYears: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ret-months">Retention months</Label>
              <Input
                id="ret-months"
                type="number"
                min={0}
                max={11}
                value={form.retentionMonths}
                onChange={(e) => setForm((p) => ({ ...p, retentionMonths: Number(e.target.value) }))}
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={!form.name.trim() || !form.code.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Saving…' : 'Create schedule'}
          </Button>
        </div>
      )}
    </div>
  )
}
