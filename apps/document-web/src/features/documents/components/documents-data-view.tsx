import { useNavigate } from 'react-router-dom'
import { DocumentsTable } from '@/features/documents/components/documents-table'
import { DocumentTile } from '@/features/documents/components/document-tile'
import { DocumentDetailsPane } from '@/features/documents/components/document-details-pane'
import type { DocumentsViewMode } from '@/features/documents/store/documents-ui.store'
import type { DocumentRecord } from '@/shared/types'

interface DocumentsDataViewProps {
  viewMode: DocumentsViewMode
  data: DocumentRecord[]
  loading: boolean
  searchTerm?: string
  selectedDocumentId: string | null
  onSelectDocument: (id: string) => void
}

export function DocumentsDataView({
  viewMode,
  data,
  loading,
  searchTerm,
  selectedDocumentId,
  onSelectDocument,
}: DocumentsDataViewProps) {
  const navigate = useNavigate()

  const openDocument = (record: DocumentRecord) => {
    if (viewMode === 'details') {
      onSelectDocument(record.id)
      return
    }
    navigate(`/app/documents/${record.id}`)
  }

  if (viewMode === 'tile') {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data.map((document) => (
          <DocumentTile
            key={document.id}
            document={document}
            searchTerm={searchTerm}
            onClick={() => openDocument(document)}
          />
        ))}
        {!loading && data.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No documents match your filters.
          </p>
        )}
      </div>
    )
  }

  if (viewMode === 'details') {
    const activeId = selectedDocumentId ?? data[0]?.id ?? null
    return (
      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(300px,1fr)]">
        <div className="desk-card min-w-0 overflow-hidden">
          <DocumentsTable
            loading={loading}
            data={data}
            onRowClick={(record) => onSelectDocument(record.id)}
          />
        </div>
        <div className="desk-card min-h-[420px] min-w-0 overflow-hidden">
          {activeId ? (
            <DocumentDetailsPane documentId={activeId} />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Select a document to preview.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <DocumentsTable loading={loading} data={data} onRowClick={openDocument} searchTerm={searchTerm} />
  )
}
