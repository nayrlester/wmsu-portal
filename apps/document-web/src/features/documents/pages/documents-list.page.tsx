import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageContainer, ContentWrapper } from '@/components/layout/page-container'
import { StickyActionBar } from '@/components/desk-app/responsive/sticky-action-bar'
import { TablePagination } from '@/components/desk-app/table/table-pagination'
import { useIsMobile } from '@/shared/hooks/use-breakpoint'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { Button } from '@/components/ui/button'
import { DocumentsToolbar } from '@/features/documents/components/documents-toolbar'
import { DocumentsDataView } from '@/features/documents/components/documents-data-view'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useDocumentsUiStore } from '@/features/documents/store/documents-ui.store'
import { buildDocumentListFilters } from '@/features/documents/utils/document.helpers'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'

export function DocumentsListPage() {
  const isMobile = useIsMobile()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission(PERMISSIONS.documentsCreate)
  const {
    search,
    status,
    lifecycleStatus,
    confidentiality,
    napCategory,
    dueForArchive,
    viewMode,
    selectedDocumentId,
    setSearch,
    setStatus,
    setLifecycleStatus,
    setConfidentiality,
    setNapCategory,
    setDueForArchive,
    setViewMode,
    setSelectedDocumentId,
  } = useDocumentsUiStore()
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const effectiveViewMode = isMobile && viewMode === 'details' ? 'list' : viewMode
  const filters = buildDocumentListFilters(debouncedSearch, status, page, pageSize, {
    lifecycleStatus,
    confidentiality,
    napCategory,
    dueForArchive,
  })
  const { data, isLoading, isFetching } = useDocuments(filters)

  const createAction = canCreate ? (
    <Link to="/app/documents/create">
      <Button>
        <Plus className="h-4 w-4" aria-hidden />
        Register document
      </Button>
    </Link>
  ) : undefined

  return (
    <PageContainer
      title="Document Repository"
      breadcrumb="Home / Documents"
      description="Central repository for registered records — search, filter, and open document details"
      action={isMobile ? undefined : createAction}
    >
      <ContentWrapper>
        <DocumentsToolbar
          search={search}
          status={status}
          lifecycleStatus={lifecycleStatus}
          confidentiality={confidentiality}
          napCategory={napCategory}
          dueForArchive={dueForArchive}
          total={data?.meta.total ?? 0}
          viewMode={effectiveViewMode}
          showDetailsMode={!isMobile}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          onStatusChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          onLifecycleChange={(value) => {
            setLifecycleStatus(value)
            setPage(1)
          }}
          onConfidentialityChange={(value) => {
            setConfidentiality(value)
            setPage(1)
          }}
          onNapCategoryChange={(value) => {
            setNapCategory(value)
            setPage(1)
          }}
          onDueForArchiveChange={(value) => {
            setDueForArchive(value)
            setPage(1)
          }}
          onViewModeChange={setViewMode}
        />
        <DocumentsDataView
          viewMode={effectiveViewMode}
          data={data?.data ?? []}
          loading={isLoading || isFetching}
          searchTerm={debouncedSearch}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={setSelectedDocumentId}
        />
        {data?.meta && (
          <TablePagination
            className="mt-4"
            pagination={{
              page: data.meta.currentPage ?? page,
              pageSize,
              total: data.meta.total ?? 0,
            }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
        {isMobile && canCreate ? (
          <StickyActionBar>
            <Link to="/app/documents/create" className="w-full">
              <Button className="w-full">
                <Plus className="h-4 w-4" aria-hidden />
                Create document
              </Button>
            </Link>
          </StickyActionBar>
        ) : null}
      </ContentWrapper>
    </PageContainer>
  )
}
