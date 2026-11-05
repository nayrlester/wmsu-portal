import { Link } from 'react-router-dom'
import { ResponsiveDataView } from '@/components/desk-app/responsive/responsive-data-view'
import { DocumentCard } from '@/components/desk-app/documents/document-card'
import { Button } from '@/components/ui/button'
import { StatusBadge as DocumentStatusBadge } from '@/components/shared/status-badge'
import { HighlightText } from '@/features/search/components/highlight-text'
import { formatDate } from '@/shared/utils'
import type { DocumentRecord } from '@/shared/types'

interface DocumentsTableProps {
  data: DocumentRecord[]
  loading: boolean
  searchTerm?: string
  onRowClick: (record: DocumentRecord) => void
}

export function DocumentsTable({ data, loading, searchTerm, onRowClick }: DocumentsTableProps) {
  return (
    <ResponsiveDataView<DocumentRecord>
      loading={loading}
      data={data}
      keyExtractor={(record) => record.id}
      onRowClick={onRowClick}
      emptyMessage="No documents match your filters."
      emptyTitle="No documents"
      mobileCardRender={(record) => (
        <DocumentCard
          id={record.id}
          title={record.title}
          trackingNumber={record.trackingNumber}
          status={record.status}
          createdAt={record.createdAt}
          href={`/app/documents/${record.id}`}
        />
      )}
      columns={[
        {
          key: 'trackingNumber',
          header: 'Tracking #',
          render: (record) => (
            <span className="font-mono text-xs font-medium">{record.trackingNumber}</span>
          ),
        },
        {
          key: 'title',
          header: 'Title',
          render: (record) => (
            <span className="font-medium">
              {searchTerm ? <HighlightText text={record.title} query={searchTerm} /> : record.title}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (record) => <DocumentStatusBadge status={record.status} />,
        },
        {
          key: 'priority',
          header: 'Priority',
          render: (record) => <span className="capitalize">{record.priority}</span>,
        },
        {
          key: 'department',
          header: 'Department',
          render: (record) => record.department?.name ?? '—',
        },
        {
          key: 'createdAt',
          header: 'Created',
          render: (record) => formatDate(record.createdAt),
        },
        {
          key: 'actions',
          header: 'Action',
          render: (record) => (
            <Link to={`/app/documents/${record.id}`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
          ),
        },
      ]}
    />
  )
}
