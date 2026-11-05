import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  Eye,
  FilePenLine,
  History,
  Loader2,
  PenLine,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileUploadZone } from '@/components/desk/file-upload-zone'
import { DOCUMENT_FILE_ACCEPT } from '@/features/documents/constants/file-upload'
import { HighlightText } from '@/features/search/components/highlight-text'
import { DocumentContentPanel } from '@/features/documents/components/document-content-panel'
import { DocumentFileEditorDialog } from '@/features/documents/components/document-file-editor-dialog'
import { DocumentFileViewerDialog } from '@/features/documents/components/document-file-viewer-dialog'
import { DocumentEsignModal } from '@/features/documents/components/document-esign-modal'
import { StatusBadge } from '@/components/shared/status-badge'
import { VersionContentPreview, VersionSourceBadge } from '@/features/documents/components/version-content-preview'
import { shouldShowVersionChangeNotes } from '@/features/documents/utils/version-change-notes'
import { canSubmitVersion } from '@/features/documents/utils/version-submit'
import {
  canDeleteVersionFile,
  canManageDocumentDrafts,
  canModifyVersionFile,
  isEditableVersionStatus,
  shouldShowFileUploadZone,
} from '@/features/documents/utils/version-edit'
import { canShowVersionApproval } from '@/features/documents/utils/version-approval'
import { formatActorName } from '@/features/documents/utils/format-actor-name'
import { DocumentVersionApprovalActions } from '@/features/documents/components/document-version-approval-actions'
import {
  DocumentVersionApprovalModal,
  type VersionApprovalModalAction,
} from '@/features/documents/components/document-version-approval-modal'
import { shouldShowVersionWrittenContent } from '@/features/documents/utils/version-written-content'
import { canEditFile, getFileEditButtonLabel } from '@/features/documents/constants/editable-files'
import { DocumentFileIcon } from '@/features/documents/utils/document-file-icon'
import { documentsApi } from '@/api'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { useDocumentVersions, useSubmitDocumentVersion } from '@/features/documents/hooks/use-documents'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { filterVisibleDocumentVersions, isDocumentOwner } from '@/features/documents/utils/version-access'
import { toast } from '@/shared/store/toast-store'
import type { FileRecord, VersionRecord } from '@/features/documents/types/document.types'

interface DocumentFilesPanelProps {
  documentId: string
  documentOwnerId?: string
  contentHtml?: string | null
  documentStatus?: string
  canEdit: boolean
  canSubmit?: boolean
  canDelete: boolean
  canDownload: boolean
  confidentiality?: string | null
  preview?: boolean
  canApprove?: boolean
  canActOnVersionApproval?: (versionId: string) => boolean
  approvalPending?: boolean
  showApprovalBlockedHint?: boolean
  /** When e-sign is enabled, Approve stays off until status is completed. */
  esignCompleted?: boolean
  esignRequiredForApprove?: boolean
  signedFileId?: string | null
  onApproval?: (versionId: string, action: VersionApprovalModalAction, comments: string) => void
  highlightFileId?: string | null
  keyword?: string | null
}

function getOcrText(file: FileRecord): string | null {
  const metadata = file.extractedMetadata as { searchText?: string; ocr?: { text?: string } } | null
  return metadata?.searchText ?? metadata?.ocr?.text ?? null
}

export function DocumentFilesPanel({
  documentId,
  documentOwnerId,
  contentHtml,
  documentStatus,
  canEdit,
  canSubmit = false,
  canDelete,
  canDownload,
  confidentiality,
  preview = false,
  canApprove = false,
  canActOnVersionApproval,
  approvalPending = false,
  showApprovalBlockedHint = false,
  esignCompleted = true,
  esignRequiredForApprove = false,
  signedFileId = null,
  onApproval,
  highlightFileId,
  keyword,
}: DocumentFilesPanelProps) {
  const approveBlockedByEsign = esignRequiredForApprove && !esignCompleted
  const approveDisabledReason = approveBlockedByEsign
    ? 'Complete e-signature before approving this document.'
    : null

  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const canEsign = hasPermission(PERMISSIONS.documentsEsign)
  const isOwner = isDocumentOwner(documentOwnerId, currentUserId)
  const canManageDrafts = canManageDocumentDrafts(canEdit, canSubmit)
  const hasUpdatePermission = Boolean(canEdit || canSubmit)
  const submitVersionMutation = useSubmitDocumentVersion(documentId)
  const fileRef = useRef<HTMLDivElement>(null)
  const [approvalModal, setApprovalModal] = useState<{
    version: VersionRecord
    action: VersionApprovalModalAction
  } | null>(null)
  const [esignTarget, setEsignTarget] = useState<{
    fileId: string
    versionLabel: string
  } | null>(null)
  const [changeNotes, setChangeNotes] = useState('')
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [viewingFileContext, setViewingFileContext] = useState<{
    file: FileRecord
    version: VersionRecord
  } | null>(null)
  const { data: versionsData, isLoading } = useDocumentVersions(documentId)
  const versions = filterVisibleDocumentVersions(
    versionsData?.versions ?? [],
    documentOwnerId,
    currentUserId
  )
  const versionsNewestFirst = [...versions].sort((a, b) => {
    if (a.versionNumber !== b.versionNumber) return b.versionNumber - a.versionNumber
    return (b.versionMinor ?? 0) - (a.versionMinor ?? 0)
  })
  const latestVersionId = versionsNewestFirst[0]?.id ?? null
  const hasUploadedFiles = versions.some((version) => version.files.length > 0)
  const showFileUpload = shouldShowFileUploadZone(canManageDrafts, versions)
  const isReturnedForRevision =
    documentStatus === 'returned' || versions.some((version) => version.status === 'returned')
  const hasWrittenNotes = Boolean(contentHtml?.trim())
  const [showWrittenContent, setShowWrittenContent] = useState(() => hasWrittenNotes && !hasUploadedFiles)

  useEffect(() => {
    if (hasWrittenNotes && !hasUploadedFiles) {
      setShowWrittenContent(true)
    }
  }, [hasWrittenNotes, hasUploadedFiles])

  useEffect(() => {
    if (!highlightFileId || !fileRef.current) return
    fileRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightFileId, versions])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
    queryClient.invalidateQueries({ queryKey: ['document-files', documentId] })
    queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] })
    queryClient.invalidateQueries({ queryKey: ['document', documentId] })
  }

  const [uploadZoneKey, setUploadZoneKey] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (files.length === 0) return

      const editableDraftWithoutFiles = [...versions]
        .reverse()
        .find((version) => isEditableVersionStatus(version.status) && version.files.length === 0)

      let targetVersion = editableDraftWithoutFiles
      let createdNewVersion = false

      if (!targetVersion) {
        const latestEditable = [...versions]
          .reverse()
          .find((version) => isEditableVersionStatus(version.status))

        if (latestEditable && latestEditable.files.length > 0) {
          targetVersion = await documentsApi.createVersion(documentId, {
            changeNotes: changeNotes.trim() || 'Added new files',
          })
          createdNewVersion = true
        } else {
          targetVersion = latestEditable ?? versions[versions.length - 1]
        }
      }

      if (!targetVersion) return

      await documentsApi.uploadFile(documentId, targetVersion.id, files[0])
      return { createdNewVersion, fileName: files[0]?.name }
    },
    onSuccess: (result) => {
      setChangeNotes('')
      setUploadZoneKey((key) => key + 1)
      invalidate()
      toast.success(
        result?.createdNewVersion ? 'New version uploaded' : 'File uploaded',
        'Click Submit for processing on the latest version below to send it for approval.'
      )
    },
    onError: (err) => {
      setUploadZoneKey((key) => key + 1)
      toast.error(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload the file. Check your connection and try again.'
      )
    },
  })

  const createVersionMutation = useMutation({
    mutationFn: () =>
      documentsApi.createVersion(documentId, {
        changeNotes: changeNotes.trim() || 'New draft version for revision',
      }),
    onSuccess: () => {
      setChangeNotes('')
      invalidate()
      toast.success('New draft version created', 'Upload a file or add written notes, then submit.')
    },
    onError: (err) => {
      toast.error(
        'Could not create version',
        err instanceof Error ? err.message : 'Unknown error'
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => documentsApi.deleteFile(documentId, fileId),
    onSuccess: invalidate,
  })

  const downloadMutation = useMutation({
    mutationFn: (fileId: string) => documentsApi.downloadFile(documentId, fileId),
    onSuccess: ({ url }) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading files and versions…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(canManageDrafts) && (
        <p className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Use <strong>Edit content</strong> to fix searchable text (PDFs/images keep the original
          file on download) or to edit TXT, CSV, Word, and Excel files directly.
        </p>
      )}

      {canManageDrafts && isReturnedForRevision && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Returned for revision — edit the file or upload a new version, then submit again.
        </p>
      )}

      {showApprovalBlockedHint && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          You have approval permission, but no version is awaiting your action right now.
        </p>
      )}

      {keyword && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Showing matches for keywords:{' '}
          <span className="font-medium">
            <HighlightText text={keyword} query={keyword} />
          </span>
        </div>
      )}

      {canManageDrafts && hasUploadedFiles && hasWrittenNotes && !showWrittenContent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/80 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            This document has optional written notes that are separate from your uploaded files.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowWrittenContent(true)}>
              View written notes
            </Button>
          </div>
        </div>
      )}

      {canManageDrafts && hasUploadedFiles && !hasWrittenNotes && !showWrittenContent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/80 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Uploaded files are edited with <strong>Edit file</strong> on each attachment below.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowWrittenContent(true)}>
            Add written notes
          </Button>
        </div>
      )}

      {(hasWrittenNotes && showWrittenContent) || (canManageDrafts && !hasUploadedFiles) ? (
        <div className="space-y-3 rounded-lg border border-border/80 p-4">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Written content</h3>
          </div>
          {canManageDrafts && (
            <p className="text-xs text-muted-foreground">
              {hasUploadedFiles
                ? 'Optional rich-text notes saved separately from uploaded files. Use Edit file on attachments to change file contents.'
                : 'Rich text saved here creates a new version alongside file uploads.'}
            </p>
          )}
          <DocumentContentPanel
            documentId={documentId}
            contentHtml={contentHtml}
            canEdit={canManageDrafts}
            onClearWrittenNotes={() => setShowWrittenContent(false)}
          />
        </div>
      ) : null}

      {showFileUpload ? (
        <div className="space-y-3 rounded-lg border border-border/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Add file</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createVersionMutation.isPending || uploadMutation.isPending}
              onClick={() => createVersionMutation.mutate()}
            >
              {createVersionMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create new version'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Choosing a file uploads it automatically
            {isReturnedForRevision
              ? ' (creates a new draft version when the returned version already has a file)'
              : ''}
            . Then use <strong>Submit for processing</strong> on the latest version card below.
          </p>
          <Input
            value={changeNotes}
            onChange={(event) => setChangeNotes(event.target.value)}
            placeholder="Version notes (optional — used when a new version is created)"
          />
          <FileUploadZone
            key={uploadZoneKey}
            multiple={false}
            accept={DOCUMENT_FILE_ACCEPT}
            disabled={uploadMutation.isPending}
            onFiles={(files) => uploadMutation.mutate(files)}
          />
          {uploadMutation.isPending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        {versionsNewestFirst.map((version: VersionRecord) => {
          const isLatestVersion = version.id === latestVersionId
          const primarySignFile =
            version.files.find((f) => f.mimeType === 'application/pdf') ?? version.files[0] ?? null

          return (
          <section key={version.id} className="rounded-lg border border-border/80">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex items-start gap-2">
                <History className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{version.label}</p>
                    <VersionSourceBadge sourceType={version.sourceType} />
                    {isLatestVersion && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        Latest
                      </Badge>
                    )}
                    {isLatestVersion && esignCompleted && (
                      <Badge variant="secondary">E-signed</Badge>
                    )}
                    {isLatestVersion && esignRequiredForApprove && !esignCompleted && (
                      <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                        Signature required
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col items-start gap-2">
                    <StatusBadge status={version.status ?? documentStatus ?? 'draft'} />
                  </div>
                  {shouldShowVersionChangeNotes(version.changeNotes) && (
                    <p className="mt-1 text-xs text-muted-foreground">{version.changeNotes}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDate(version.createdAt)}</p>
                {version.createdBy && (
                  <p className="mt-0.5">
                    Last edited by {formatActorName(version.createdBy)}
                  </p>
                )}
              </div>
            </div>

            {shouldShowVersionWrittenContent(version) && (
              <div className="border-b border-border/60 px-4 py-3">
                <VersionContentPreview contentHtml={version.contentHtml!} compact />
              </div>
            )}

            {version.files.length === 0 && !shouldShowVersionWrittenContent(version) ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No content in this version.</p>
            ) : version.files.length === 0 ? null : (
              <ul className="divide-y divide-border/60">
                {version.files.map((file) => {
                  const ocrText = getOcrText(file)
                  const isHighlighted = highlightFileId === file.id
                  const canEditFileContent =
                    canModifyVersionFile(version.status, hasUpdatePermission) &&
                    canEditFile(file)
                  const matchesKeyword =
                    keyword &&
                    (file.originalName.toLowerCase().includes(keyword.toLowerCase()) ||
                      ocrText?.toLowerCase().includes(keyword.toLowerCase()))

                  if (keyword && !matchesKeyword) return null

                  return (
                    <li key={file.id}>
                      <div
                        ref={isHighlighted ? fileRef : undefined}
                        className={cn(
                          'px-4 py-4',
                          isHighlighted && 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                        )}
                      >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <DocumentFileIcon
                              mimeType={file.mimeType}
                              originalName={file.originalName}
                              sizeClassName="h-4 w-4 shrink-0"
                            />
                            <p className="font-medium">
                              {preview ? (
                                keyword ? (
                                  <HighlightText text={file.originalName} query={keyword} />
                                ) : (
                                  file.originalName
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="text-left hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                                  onClick={() => setViewingFileContext({ file, version })}
                                >
                                  {keyword ? (
                                    <HighlightText text={file.originalName} query={keyword} />
                                  ) : (
                                    file.originalName
                                  )}
                                </button>
                              )}
                            </p>
                            {(file.id === signedFileId ||
                              (file.extractedMetadata as { source?: string } | null)?.source ===
                                'pandadoc') && (
                              <Badge variant="secondary" className="shrink-0">
                                E-signed
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {file.mimeType} · {formatBytes(file.fileSize)}
                            {file.createdAt ? ` · ${formatDate(file.createdAt)}` : ''}
                          </p>
                          {ocrText && (
                            <div className="mt-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                From uploaded file
                              </p>
                              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                              {keyword ? (
                                <HighlightText text={ocrText} query={keyword} />
                              ) : (
                                ocrText
                              )}
                            </p>
                            </div>
                          )}
                        </div>

                        {!preview && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingFileContext({ file, version })}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          {isLatestVersion &&
                            canEsign &&
                            primarySignFile != null &&
                            file.id === primarySignFile.id && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setEsignTarget({
                                  fileId: file.id,
                                  versionLabel: version.label,
                                })
                              }
                            >
                              <PenLine className="h-3.5 w-3.5" />
                              {esignCompleted ? 'Sign again' : 'Sign'}
                            </Button>
                          )}
                          {canDownload && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={downloadMutation.isPending}
                              onClick={() => downloadMutation.mutate(file.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          )}
                          {canEditFileContent && (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => setEditingFileId(file.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {getFileEditButtonLabel()}
                            </Button>
                          )}
                          {isOwner && canDeleteVersionFile(version.status, canDelete) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(file.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                        )}
                      </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {!preview &&
              isLatestVersion &&
              (canSubmitVersion(version.status, canSubmit) ||
                canShowVersionApproval(
                  version.status,
                  canApprove,
                  canActOnVersionApproval?.(version.id) ?? false
                )) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 px-4 py-3">
                {canShowVersionApproval(
                  version.status,
                  canApprove,
                  canActOnVersionApproval?.(version.id) ?? false
                ) && (
                  <DocumentVersionApprovalActions
                    pending={approvalPending}
                    approveDisabled={approveBlockedByEsign}
                    approveDisabledReason={approveDisabledReason}
                    onApprove={() => setApprovalModal({ version, action: 'approve' })}
                    onReturn={() => setApprovalModal({ version, action: 'return' })}
                    onReject={() => setApprovalModal({ version, action: 'reject' })}
                  />
                )}
                {canSubmitVersion(version.status, canSubmit) && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      submitVersionMutation.isPending &&
                      submitVersionMutation.variables === version.id
                    }
                    onClick={() => submitVersionMutation.mutate(version.id)}
                  >
                    {submitVersionMutation.isPending &&
                    submitVersionMutation.variables === version.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit for processing'
                    )}
                  </Button>
                )}
              </div>
            )}
          </section>
          )
        })}
      </div>

      {!preview && (
      <DocumentFileViewerDialog
        documentId={documentId}
        file={viewingFileContext?.file ?? null}
        extractedText={viewingFileContext ? getOcrText(viewingFileContext.file) : null}
        editedBy={viewingFileContext?.version.createdBy ?? null}
        editedAt={viewingFileContext?.version.createdAt ?? null}
        open={Boolean(viewingFileContext)}
        canDownload={canDownload}
        restrictPrint={
          confidentiality === 'confidential' || confidentiality === 'restricted'
        }
        onClose={() => setViewingFileContext(null)}
        onDownload={(fileId) => downloadMutation.mutate(fileId)}
      />
      )}

      {!preview && (
        <DocumentEsignModal
          documentId={documentId}
          fileId={esignTarget?.fileId}
          versionLabel={esignTarget?.versionLabel}
          open={Boolean(esignTarget)}
          onClose={() => setEsignTarget(null)}
        />
      )}

      {!preview && (
      <DocumentFileEditorDialog
        documentId={documentId}
        fileId={editingFileId}
        open={Boolean(editingFileId)}
        onClose={() => setEditingFileId(null)}
        onSaved={invalidate}
      />
      )}

      <DocumentVersionApprovalModal
        open={Boolean(approvalModal)}
        action={approvalModal?.action ?? null}
        versionLabel={approvalModal?.version.label ?? ''}
        pending={approvalPending}
        onClose={() => setApprovalModal(null)}
        onConfirm={(comments) => {
          if (!approvalModal || !onApproval) return
          onApproval(approvalModal.version.id, approvalModal.action, comments)
          setApprovalModal(null)
        }}
      />
    </div>
  )
}
