import { useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStepDraft } from '@/lib/workflows'
import { Badge } from '@/components/ui/badge'

interface WorkflowCanvasProps {
  steps: WorkflowStepDraft[]
  selectedIndex: number | null
  roleNameById: Record<string, string>
  onSelect: (index: number) => void
  onReorder: (from: number, to: number) => void
  className?: string
}

const TYPE_LABEL: Record<WorkflowStepDraft['type'], string> = {
  sequential: 'Seq',
  parallel: 'Par',
  conditional: 'If',
}

export function WorkflowCanvas({
  steps,
  selectedIndex,
  roleNameById,
  onSelect,
  onReorder,
  className,
}: WorkflowCanvasProps) {
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">
        Drag steps to reorder. Click a node to edit details below.
      </p>
      <div className="overflow-x-auto rounded-md border border-border bg-muted/20 p-3">
        <div className="flex min-w-max items-center gap-2">
          <TerminalNode label="Start" />
          <Edge />
          {steps.map((step, index) => (
            <div key={`step-${index}`} className="flex items-center gap-2">
              <button
                type="button"
                draggable
                onDragStart={() => {
                  dragFrom.current = index
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(index)
                }}
                onDragLeave={() => setDragOver((v) => (v === index ? null : v))}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = dragFrom.current
                  dragFrom.current = null
                  setDragOver(null)
                  if (from == null || from === index) return
                  onReorder(from, index)
                }}
                onDragEnd={() => {
                  dragFrom.current = null
                  setDragOver(null)
                }}
                onClick={() => onSelect(index)}
                className={cn(
                  'flex w-40 flex-col gap-1 rounded-md border bg-background px-2.5 py-2 text-left transition-premium',
                  selectedIndex === index
                    ? 'border-primary ring-1 ring-primary/40'
                    : 'border-border hover:border-foreground/30',
                  dragOver === index && 'border-dashed border-primary'
                )}
                aria-pressed={selectedIndex === index}
              >
                <div className="flex items-center gap-1">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-xs font-semibold">{step.name || `Step ${index + 1}`}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {TYPE_LABEL[step.type]}
                  </Badge>
                  {step.slaHours ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {step.slaHours}h
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  {step.roleId ? roleNameById[step.roleId] ?? 'Role set' : 'No role'}
                </p>
              </button>
              <Edge />
            </div>
          ))}
          <TerminalNode label="End" />
        </div>
      </div>
    </div>
  )
}

function TerminalNode({ label }: { label: string }) {
  return (
    <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold">
      {label}
    </div>
  )
}

function Edge() {
  return <div className="h-px w-6 shrink-0 bg-border" aria-hidden />
}
