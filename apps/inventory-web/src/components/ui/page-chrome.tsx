import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCard({
  title,
  children,
  padding = 'default',
  className,
}: {
  title?: string
  children: ReactNode
  padding?: 'default' | 'sm' | 'none'
  className?: string
}) {
  const padClass =
    padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5'

  return (
    <div className={cn('uims-card overflow-hidden', className)}>
      {title && (
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
      )}
      <div className={padClass}>{children}</div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    available: 'bg-emerald-50 text-emerald-700',
    assigned: 'bg-blue-50 text-blue-700',
    in_use: 'bg-blue-50 text-blue-700',
    maintenance: 'bg-amber-50 text-amber-700',
    in_maintenance: 'bg-amber-50 text-amber-700',
    return_pending: 'bg-orange-50 text-orange-700',
    disposed: 'bg-slate-100 text-slate-500',
    inactive: 'bg-slate-100 text-slate-500',
    scheduled: 'bg-sky-50 text-sky-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
    received: 'bg-emerald-50 text-emerald-700',
    issued: 'bg-blue-50 text-blue-700',
    transferred: 'bg-violet-50 text-violet-700',
    adjusted: 'bg-orange-50 text-orange-700',
  }

  const colorClass = colors[status] ?? 'bg-slate-100 text-slate-600'
  const label = status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
        colorClass
      )}
    >
      {label}
    </span>
  )
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-slate-100 bg-slate-50/50">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-slate-50/50">{children}</tr>
}

export function TableHeaderCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={cn('px-4 py-3 text-sm text-slate-700', className)}>
      {children}
    </td>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="uims-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="mb-4 h-12 w-12 text-slate-300" />
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ModalShell({
  title,
  description,
  onClose,
  disabled,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
