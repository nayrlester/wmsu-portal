import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GitBranch, Pencil, Plus, Trash2, Play } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/status-badge'
import { FormModal } from '@/components/desk-app/forms/form-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  useWorkflows,
  useRoles,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from '@/hooks/use-api'
import { workflowsApi } from '@/lib/api'
import {
  buildMultiStepWorkflow,
  extractWorkflowSteps,
  type WorkflowStepDraft,
} from '@/lib/workflows'
import { simulateWorkflow, type SimulateResult } from '@/lib/workflow-simulate'
import { WorkflowCanvas } from '@/features/workflows/components/workflow-canvas'
import { toast } from '@/shared/store/toast-store'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import type { WorkflowRecord } from '@/types/api'

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type FormMode = 'create' | 'edit' | 'duplicate'

const emptyStep = (): WorkflowStepDraft => ({
  name: 'Review',
  roleId: '',
  type: 'sequential',
  slaHours: 24,
})

export function WorkflowsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRecord | null>(null)
  const [steps, setSteps] = useState<WorkflowStepDraft[]>([emptyStep()])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)
  const [simPriority, setSimPriority] = useState('normal')
  const [simulation, setSimulation] = useState<SimulateResult | null>(null)
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { data, isLoading } = useWorkflows()
  const { data: roles } = useRoles()
  const createMutation = useCreateWorkflow()
  const updateMutation = useUpdateWorkflow()
  const deleteMutation = useDeleteWorkflow()

  const roleNameById = useMemo(
    () => Object.fromEntries((roles ?? []).map((r) => [r.id, r.name])),
    [roles]
  )

  const publishMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow published')
    },
    onError: (err) => {
      toast.error('Publish failed', err instanceof Error ? err.message : undefined)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow archived')
    },
    onError: (err) => {
      toast.error('Archive failed', err instanceof Error ? err.message : undefined)
    },
  })

  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  const resetDesigner = (next: WorkflowStepDraft[]) => {
    setSteps(next)
    setSelectedIndex(next.length ? 0 : null)
    setSimulation(null)
    setSimPriority('normal')
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingWorkflow(null)
    form.reset({ name: '', description: '' })
    resetDesigner([emptyStep()])
    setFormOpen(true)
  }

  const openEdit = (workflow: WorkflowRecord) => {
    setFormMode('edit')
    setEditingWorkflow(workflow)
    form.reset({
      name: workflow.name,
      description: workflow.description ?? '',
    })
    const extracted = extractWorkflowSteps(workflow.definition)
    resetDesigner(extracted.length ? extracted : [emptyStep()])
    setFormOpen(true)
  }

  const openDuplicate = (workflow: WorkflowRecord) => {
    setFormMode('duplicate')
    setEditingWorkflow(null)
    form.reset({
      name: `${workflow.name} (copy)`,
      description: workflow.description ?? '',
    })
    const extracted = extractWorkflowSteps(workflow.definition)
    resetDesigner(extracted.length ? extracted : [emptyStep()])
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setFormMode('create')
    setEditingWorkflow(null)
    form.reset({ name: '', description: '' })
    resetDesigner([emptyStep()])
  }

  const formTitle =
    formMode === 'edit'
      ? 'Edit workflow'
      : formMode === 'duplicate'
        ? 'Edit workflow as new draft'
        : 'Create workflow'

  const formDescription =
    formMode === 'edit'
      ? 'Update this draft before publishing.'
      : formMode === 'duplicate'
        ? 'Published workflows are locked. Save your changes as a new draft, then publish it when ready.'
        : 'Design multi-step approval chains with parallel, conditional, and SLA rules.'

  const onSubmit = async (values: FormData) => {
    if (!steps.some((s) => s.roleId)) {
      toast.error('Add at least one step with an assignee role')
      return
    }
    try {
      const definition = buildMultiStepWorkflow(steps)
      const payload = {
        name: values.name,
        description: values.description,
        definition,
      }

      if (formMode === 'edit' && editingWorkflow) {
        await updateMutation.mutateAsync({ id: editingWorkflow.id, ...payload })
        toast.success('Workflow updated')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success(
          formMode === 'duplicate'
            ? 'Draft created from published workflow'
            : 'Workflow draft created'
        )
      }
      closeForm()
    } catch (err) {
      toast.error(
        formMode === 'edit' ? 'Update failed' : 'Create failed',
        err instanceof Error ? err.message : undefined
      )
    }
  }

  const handleDelete = async (workflow: WorkflowRecord) => {
    const approved = await confirm({
      title: 'Delete workflow',
      description: `Delete draft "${workflow.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })
    if (!approved) return

    try {
      await deleteMutation.mutateAsync(workflow.id)
      toast.success('Workflow deleted')
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : undefined)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  function updateStep(index: number, patch: Partial<WorkflowStepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    setSimulation(null)
  }

  function reorderSteps(from: number, to: number) {
    setSteps((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      if (!moved) return prev
      next.splice(to, 0, moved)
      return next
    })
    setSelectedIndex(to)
    setSimulation(null)
  }

  function runSimulation() {
    try {
      const result = simulateWorkflow(steps, { priority: simPriority })
      setSimulation(result)
      if (!result.trail.length) {
        toast.error('Assign roles to steps before simulating')
      }
    } catch (err) {
      toast.error('Simulation failed', err instanceof Error ? err.message : undefined)
    }
  }

  const selectedStep =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < steps.length
      ? steps[selectedIndex]
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Visual multi-step approval designer with parallel, conditional, SLA, and simulation"
        action={
          formOpen ? (
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          ) : (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              New workflow
            </Button>
          )
        }
      />

      <FormModal
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm()
          else setFormOpen(true)
        }}
        title={formTitle}
        description={formDescription}
        form={form}
        onSubmit={onSubmit}
        submitLabel={formMode === 'edit' ? 'Save changes' : 'Create draft'}
        cancelLabel="Close"
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="wf-name">Name</Label>
          <Input id="wf-name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wf-desc">Description</Label>
          <Textarea id="wf-desc" rows={2} {...form.register('description')} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Canvas</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSteps((prev) => {
                  const next = [
                    ...prev,
                    {
                      name: `Step ${prev.length + 1}`,
                      roleId: '',
                      type: 'sequential' as const,
                      slaHours: 24,
                    },
                  ]
                  setSelectedIndex(next.length - 1)
                  return next
                })
                setSimulation(null)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </Button>
          </div>

          <WorkflowCanvas
            steps={steps}
            selectedIndex={selectedIndex}
            roleNameById={roleNameById}
            onSelect={setSelectedIndex}
            onReorder={reorderSteps}
          />

          {selectedStep && selectedIndex != null && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Edit step {selectedIndex + 1}
                </p>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSteps((prev) => prev.filter((_, i) => i !== selectedIndex))
                      setSelectedIndex((idx) => {
                        if (idx == null) return 0
                        if (steps.length <= 2) return 0
                        return Math.max(0, idx - 1)
                      })
                      setSimulation(null)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Input
                value={selectedStep.name}
                onChange={(e) => updateStep(selectedIndex, { name: e.target.value })}
                placeholder="Step name"
              />
              <Select
                value={selectedStep.roleId}
                onChange={(e) => updateStep(selectedIndex, { roleId: e.target.value })}
              >
                <option value="" disabled>
                  Assignee role…
                </option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={selectedStep.type}
                  onChange={(e) =>
                    updateStep(selectedIndex, {
                      type: e.target.value as WorkflowStepDraft['type'],
                      parallelGroupId:
                        e.target.value === 'parallel' ? 'parallel_main' : undefined,
                    })
                  }
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="conditional">Conditional</option>
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={selectedStep.slaHours ?? ''}
                  onChange={(e) =>
                    updateStep(selectedIndex, {
                      slaHours: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="SLA hours"
                />
              </div>
              {selectedStep.type === 'conditional' && (
                <Select
                  value={selectedStep.conditionPriority ?? ''}
                  onChange={(e) =>
                    updateStep(selectedIndex, { conditionPriority: e.target.value })
                  }
                >
                  <option value="">Priority condition…</option>
                  <option value="low">When priority = low</option>
                  <option value="normal">When priority = normal</option>
                  <option value="high">When priority = high</option>
                  <option value="urgent">When priority = urgent</option>
                </Select>
              )}
              <Select
                value={selectedStep.actionType ?? 'none'}
                onChange={(e) =>
                  updateStep(selectedIndex, {
                    actionType: e.target.value as WorkflowStepDraft['actionType'],
                  })
                }
              >
                <option value="none">No side-effect</option>
                <option value="notify">Notify (email)</option>
                <option value="webhook">Webhook</option>
                <option value="sms">SMS (audited stub)</option>
              </Select>
              {(selectedStep.actionType === 'notify' || selectedStep.actionType === 'sms') && (
                <Input
                  value={selectedStep.actionMessage ?? ''}
                  onChange={(e) => updateStep(selectedIndex, { actionMessage: e.target.value })}
                  placeholder="Optional message"
                />
              )}
              {selectedStep.actionType === 'webhook' && (
                <Input
                  value={selectedStep.actionWebhookUrl ?? ''}
                  onChange={(e) => updateStep(selectedIndex, { actionWebhookUrl: e.target.value })}
                  placeholder="https://hooks.example.com/workflow"
                />
              )}
            </div>
          )}

          <div className="space-y-2 rounded-md border border-dashed border-border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label htmlFor="sim-priority">Simulate priority</Label>
                <Select
                  id="sim-priority"
                  value={simPriority}
                  onChange={(e) => setSimPriority(e.target.value)}
                >
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </Select>
              </div>
              <Button type="button" variant="secondary" onClick={runSimulation}>
                <Play className="mr-1 h-3.5 w-3.5" />
                Simulate
              </Button>
            </div>
            {simulation && simulation.trail.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  {simulation.activatedCount} activated · {simulation.skippedCount} skipped · est.
                  critical path {simulation.estimatedSlaHours}h
                </p>
                <ol className="space-y-1">
                  {simulation.trail.map((entry) => (
                    <li
                      key={`${entry.id}-${entry.status}`}
                      className="flex flex-wrap items-center gap-2 text-xs"
                    >
                      <Badge
                        variant={
                          entry.status === 'skipped'
                            ? 'secondary'
                            : entry.status === 'concurrent'
                              ? 'outline'
                              : 'default'
                        }
                        className="capitalize"
                      >
                        {entry.status}
                      </Badge>
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-muted-foreground">({entry.type})</span>
                      {entry.reason ? (
                        <span className="text-muted-foreground">— {entry.reason}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </FormModal>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !data?.workflows.length ? (
        <EmptyState
          icon={GitBranch}
          title="No workflows yet"
          description="Create a workflow to automate document approvals."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create workflow
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.workflows.map((wf) => {
            const stepCount = extractWorkflowSteps(wf.definition).length
            return (
              <Card key={wf.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-base">{wf.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      v{wf.version} · {stepCount || 1} step{stepCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <StatusBadge status={wf.status} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {wf.description ?? 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(wf.updatedAt ?? wf.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wf.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(wf)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate(wf.id)}
                          disabled={publishMutation.isPending}
                        >
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(wf)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete
                        </Button>
                      </>
                    )}
                    {wf.status === 'published' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openDuplicate(wf)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => archiveMutation.mutate(wf.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
