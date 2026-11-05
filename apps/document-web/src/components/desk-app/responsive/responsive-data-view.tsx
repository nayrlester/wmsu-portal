import type { ReactNode } from 'react'
import { useIsMobile } from '@/shared/hooks/use-breakpoint'
import { DataTable, type DataTableProps } from '@/components/desk-app/table/data-table'
import { CardListSkeleton } from '@/components/desk-app/ux/list-skeleton'
import { EmptyState } from '@/components/shared/status-badge'
import { FileText } from 'lucide-react'

export interface ResponsiveDataViewProps<T> extends DataTableProps<T> {
  mobileCardRender: (row: T) => ReactNode
  emptyIcon?: typeof FileText
  emptyTitle?: string
}

export function ResponsiveDataView<T>({
  mobileCardRender,
  emptyIcon = FileText,
  emptyTitle = 'No records found',
  loading,
  data,
  emptyMessage,
  ...tableProps
}: ResponsiveDataViewProps<T>) {
  const isMobile = useIsMobile()

  if (loading) {
    return isMobile ? <CardListSkeleton /> : <DataTable {...tableProps} data={[]} loading />
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyMessage}
      />
    )
  }

  if (isMobile) {
    return <div className="space-y-3">{data.map((row) => mobileCardRender(row))}</div>
  }

  return <DataTable {...tableProps} data={data} loading={loading} emptyMessage={emptyMessage} />
}
