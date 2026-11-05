import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { udmsApi } from '@/api/modules/udms.api'
import { documentsApi } from '@/api/modules/documents.api'
import { usersApi } from '@/api/modules/users.api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'

type Props = {
  documentId: string
  status: string
}

export function DocumentRoutingPanel({ documentId, status }: Props) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canUpdate = hasPermission(PERMISSIONS.documentsUpdate)
  const canManageUsers = hasPermission(PERMISSIONS.usersManage)

  const [toUserId, setToUserId] = useState('')
  const [toOfficeId, setToOfficeId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: departmentsData } = useQuery({
    queryKey: ['document-departments'],
    queryFn: () => documentsApi.departments(),
    enabled: canUpdate,
  })

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users-for-routing'],
    queryFn: () => usersApi.list(),
    enabled: canUpdate && canManageUsers,
  })

  const users = usersData?.users ?? []
  const departments = departmentsData?.departments ?? []

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-timeline', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] }),
      queryClient.invalidateQueries({ queryKey: ['udms-queue-assigned'] }),
      queryClient.invalidateQueries({ queryKey: ['udms-queue-office'] }),
      queryClient.invalidateQueries({ queryKey: ['udms-queue-awaiting'] }),
      queryClient.invalidateQueries({ queryKey: ['udms-tracking', documentId] }),
    ])
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      udmsApi.assign(documentId, {
        toUserId,
        toOfficeId: toOfficeId || undefined,
        remarks: remarks.trim() || undefined,
      }),
  })

  const routeMutation = useMutation({
    mutationFn: () =>
      udmsApi.route(documentId, {
        toUserId: toUserId || undefined,
        toOfficeId: toOfficeId || undefined,
        remarks: remarks.trim(),
      }),
  })

  if (!canUpdate) return null

  const draftBlocked = status === 'draft'
  const archivedBlocked = status === 'archived'

  const runAssign = async () => {
    if (!toUserId) {
      toast.error('Assignee required', 'Select a user to assign this document.')
      return
    }
    const ok = await confirm({
      title: 'Assign document?',
      description: 'This transfers current assignment to the selected user and records tracking history.',
      confirmLabel: 'Assign',
    })
    if (!ok) return
    setBusy(true)
    try {
      await assignMutation.mutateAsync()
      toast.success('Document assigned')
      setRemarks('')
      await invalidate()
    } catch (err) {
      toast.error('Assignment failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  const runRoute = async () => {
    if (!toUserId && !toOfficeId) {
      toast.error('Destination required', 'Select a user and/or office.')
      return
    }
    if (!remarks.trim()) {
      toast.error('Remarks required', 'Routing requires remarks per workflow policy.')
      return
    }
    if (draftBlocked) {
      toast.error('Submit first', 'Draft documents cannot be routed.')
      return
    }
    if (archivedBlocked) {
      toast.error('Archived', 'Archived documents cannot be routed.')
      return
    }
    const ok = await confirm({
      title: 'Route document?',
      description: 'This records a forward/routing entry and updates current responsibility.',
      confirmLabel: 'Route',
    })
    if (!ok) return
    setBusy(true)
    try {
      await routeMutation.mutateAsync()
      toast.success('Document routed')
      setRemarks('')
      await invalidate()
    } catch (err) {
      toast.error('Routing failed', err instanceof ApiError ? err.message : 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Routing and assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Uses approved DMS-007 actions only. Deadlines and escalation rules remain For Clarification.
        </p>

        {canManageUsers ? (
          <div className="space-y-2">
            <Label htmlFor="routeToUser">Assign / route to user</Label>
            <Select
              id="routeToUser"
              value={toUserId}
              onChange={(event) => setToUserId(event.target.value)}
            >
              <option value="">Select user…</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.email}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            User directory requires users.manage. You can still route to an office when permitted.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="routeToOffice">Office</Label>
          <Select
            id="routeToOffice"
            value={toOfficeId}
            onChange={(event) => setToOfficeId(event.target.value)}
          >
            <option value="">Select office…</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="routeRemarks">Remarks</Label>
          <Textarea
            id="routeRemarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Required for routing; optional for assignment"
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || !toUserId} onClick={() => void runAssign()}>
            Assign
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || draftBlocked || archivedBlocked}
            onClick={() => void runRoute()}
          >
            Route / forward
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
