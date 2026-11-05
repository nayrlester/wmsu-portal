import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer, ContentWrapper } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { udmsApi, type FilePlanNode } from '@/api/modules/udms.api'
import { ApiError } from '@/api/errors/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'

export function FilePlanPage() {
  const queryClient = useQueryClient()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission(PERMISSIONS.settingsManage)
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['udms-file-plan'],
    queryFn: () => udmsApi.listFilePlan(),
  })
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      udmsApi.createFilePlan({
        name: name.trim(),
        code: code.trim() || undefined,
        parentId: parentId || undefined,
      }),
    onSuccess: async () => {
      setName('')
      setCode('')
      setParentId('')
      setError('')
      await queryClient.invalidateQueries({ queryKey: ['udms-file-plan'] })
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to create file-plan node')
    },
  })

  return (
    <PageContainer
      title="File Plan"
      breadcrumb="Home / Documents / File Plan"
      description="Folder and file-plan structure for the centralized repository (DMS-001)"
    >
      <ContentWrapper>
        <div className="desk-card space-y-4 p-6">
          {canManage && (
            <form
              className="grid gap-3 sm:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!name.trim()) {
                  setError('Name is required')
                  return
                }
                createMutation.mutate()
              }}
            >
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="fp-name">Folder name</Label>
                <Input id="fp-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fp-code">Code</Label>
                <Input id="fp-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fp-parent">Parent</Label>
                <Select id="fp-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">Root</option>
                  {nodes.map((node: FilePlanNode) => (
                    <option key={node.id} value={node.id}>
                      {node.path}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Add folder'}
                </Button>
              </div>
              {error && (
                <p className="sm:col-span-4 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading file plan…</p>
          ) : nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No file-plan folders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {nodes.map((node) => (
                <li key={node.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{node.name}</p>
                    <p className="text-muted-foreground">{node.path}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {node.isActive ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ContentWrapper>
    </PageContainer>
  )
}
