import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/shared/utils'
import { PERMISSIONS } from '@/shared/constants/env'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { esignApi } from '@/api/modules/records.api'
import { DocumentTimeline } from '@/features/documents/components/document-timeline'
import { DocumentFilesPanel } from '@/features/documents/components/document-files-panel'
import type { VersionApprovalModalAction } from '@/features/documents/components/document-version-approval-modal'
import { DocumentPrivacyControls } from '@/features/documents/components/document-privacy-controls'
import { DocumentActivityFeed } from '@/features/documents/components/document-activity-feed'
import { DocumentMetadataCorrectionPanel } from '@/features/documents/components/document-metadata-correction-panel'
import { DocumentRoutingPanel } from '@/features/documents/components/document-routing-panel'
import { DocumentLifecyclePanel } from '@/features/documents/components/document-lifecycle-panel'
import { useArchivesMutations } from '@/features/records/hooks/use-archives'
import {
  useDocument,
  useDocumentActivity,
  useDocumentTimeline,
  useDocumentApproval,
  useDocumentWorkflow,
  useLogDocumentView,
  useUpdateDocument,
} from '@/features/documents/hooks/use-documents'
import { getPublicTrackUrl, isApprovableStatus } from '@/features/documents/utils/document.helpers'
import { formatActorName } from '@/features/documents/utils/format-actor-name'

const EDITABLE_STATUSES = new Set(['draft', 'returned'])
const CONTENT_MODIFIABLE_STATUSES = new Set(['draft', 'returned', 'rejected'])

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const permissionsReady = useAuthStore((s) => s.permissionsReady)
  const highlightFileId = searchParams.get('fileId')
  const keyword = searchParams.get('q')
  const tabParam = searchParams.get('tab')
  const activeTab = !tabParam || tabParam === 'files' ? 'details' : tabParam

  const { data: document, isLoading, error } = useDocument(id)
  useLogDocumentView(id)
  const updateMutation = useUpdateDocument(id!)
  const archivesMutations = useArchivesMutations()
  const { data: timeline, isLoading: timelineLoading } = useDocumentTimeline(id, activeTab === 'timeline')
  const { data: activity = [], isLoading: activityLoading } = useDocumentActivity(id, activeTab === 'activity')
  const { data: esignData } = useQuery({
    queryKey: ['esign', id],
    queryFn: () => esignApi.get(id!),
    enabled: Boolean(id),
  })
  const esignCompleted = esignData?.envelope?.status === 'completed'
  const esignRequiredForApprove = true
  const signedFileId = esignData?.envelope?.signedFileId ?? null
  const { data: workflowState, isLoading: workflowLoading } = useDocumentWorkflow(
    id,
    activeTab === 'approval' || activeTab === 'details'
  )
  const approvalMutation = useDocumentApproval(id!)

  const canModifyContent = useMemo(() => {
    if (!permissionsReady || !document) return false
    return CONTENT_MODIFIABLE_STATUSES.has(document.status) && hasPermission(PERMISSIONS.documentsUpdate)
  }, [document, hasPermission, permissionsReady])

  const canEditMetadata = useMemo(() => {
    if (!permissionsReady || !document) return false
    return hasPermission(PERMISSIONS.documentsUpdate)
  }, [document, hasPermission, permissionsReady])

  const canManageArchives = useMemo(() => {
    if (!permissionsReady) return false
    return hasPermission(PERMISSIONS.recordsArchivesManage)
  }, [hasPermission, permissionsReady])

  const canDeleteFiles = useMemo(() => {
    if (!permissionsReady || !document) return false
    return EDITABLE_STATUSES.has(document.status) && hasPermission(PERMISSIONS.documentsDelete)
  }, [document, hasPermission, permissionsReady])

  const canDownloadFiles = useMemo(() => {
    if (!permissionsReady) return false
    return hasPermission(PERMISSIONS.documentsDownload)
  }, [hasPermission, permissionsReady])

  const canSubmitVersions = useMemo(() => {
    if (!permissionsReady) return false
    return hasPermission(PERMISSIONS.documentsUpdate)
  }, [hasPermission, permissionsReady])

  const hasApprovePermission = hasPermission(PERMISSIONS.documentsApprove)

  const canActOnVersionApproval = useMemo(() => {
    if (!hasApprovePermission || workflowLoading || workflowState === undefined) {
      return () => false
    }

    const byVersion = new Map<string, boolean>()
    for (const entry of workflowState.versionWorkflows ?? []) {
      if (entry.versionId) {
        byVersion.set(entry.versionId, entry.canCurrentUserAct === true)
      }
    }

    const legacyWorkflowCanAct = (workflowState.versionWorkflows ?? []).some(
      (entry) => !entry.versionId && entry.canCurrentUserAct === true
    )

    return (versionId: string) => {
      if (byVersion.has(versionId)) return byVersion.get(versionId)!
      return legacyWorkflowCanAct
    }
  }, [hasApprovePermission, workflowLoading, workflowState])

  const showApprovalBlockedHint =
    hasApprovePermission &&
    Boolean(document && isApprovableStatus(document.status)) &&
    !workflowLoading &&
    workflowState !== undefined &&
    workflowState.canCurrentUserAct === false

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="space-y-4">
        <p className="text-destructive" role="alert">
          Document not found.
        </p>
        <Link to="/app/documents" className="text-primary hover:underline">
          Back to documents
        </Link>
      </div>
    )
  }

  const trackUrl = getPublicTrackUrl(document)
  const isPublic = document.visibility === 'public'
  const canApprove = isApprovableStatus(document.status)
  const showWorkflowHint =
    canApprove &&
    workflowState !== undefined &&
    'active' in workflowState &&
    workflowState.active === false

  const handleApproval = (
    versionId: string,
    action: VersionApprovalModalAction,
    comments: string
  ) => {
    const trimmedComments = comments.trim()

    if (action === 'reject' && !trimmedComments) {
      toast.error('Rejection reason required', 'Please explain why you are rejecting this version.')
      return
    }

    approvalMutation.mutate(
      { action, comments: trimmedComments || undefined, versionId },
      {
        onSuccess: () => {
          toast.success(
            'Action recorded',
            action === 'approve'
              ? 'Version approved.'
              : action === 'return'
                ? 'Version returned.'
                : 'Version rejected.'
          )
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'You cannot perform this action on this version.'
          toast.error('Approval failed', message)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Link to="/app/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">{document.trackingNumber}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={(tab) => {
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                next.set('tab', tab)
                if (tab !== 'details') {
                  next.delete('fileId')
                  next.delete('q')
                }
                return next
              })
            }}
          >
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity log</TabsTrigger>
              <TabsTrigger value="timeline">Routing timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {document.description && (
                    <p className="text-sm text-muted-foreground">{document.description}</p>
                  )}
                  {document.department && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Department: </span>
                      {document.department.name}
                    </p>
                  )}
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Created By</dt>
                      <dd>{document.createdBy?.fullName ?? document.createdBy?.email ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd>{formatDate(document.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last Edited By</dt>
                      <dd>{formatActorName(document.lastEditedBy ?? document.createdBy)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Date Created</dt>
                      <dd>{formatDate(document.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Privacy</dt>
                      <dd className="capitalize">{document.visibility ?? 'private'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Confidentiality</dt>
                      <dd className="capitalize">{document.confidentiality ?? 'internal'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Legal hold</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        <span>{document.legalHold ? 'Active' : 'Off'}</span>
                        {canManageArchives && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const hold = !document.legalHold
                              const reason = hold
                                ? window.prompt('Legal hold reason') || ''
                                : 'Released'
                              if (hold && reason.trim().length < 3) {
                                toast.error('Reason required (min 3 characters)')
                                return
                              }
                              archivesMutations.setLegalHold
                                .mutateAsync({
                                  documentId: document.id,
                                  hold,
                                  reason: reason.trim(),
                                })
                                .then(() => toast.success(hold ? 'Legal hold set' : 'Legal hold released'))
                                .catch((e) =>
                                  toast.error(e instanceof Error ? e.message : 'Legal hold failed')
                                )
                            }}
                          >
                            {document.legalHold ? 'Release' : 'Set hold'}
                          </Button>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Lifecycle</dt>
                      <dd className="capitalize">
                        {(document.lifecycleStatus ?? 'active').replaceAll('_', ' ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">NAP category</dt>
                      <dd className="capitalize">
                        {(document.napCategory ?? '—').replaceAll('_', ' ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Retention due</dt>
                      <dd>{document.retentionDueAt ? formatDate(document.retentionDueAt) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Priority</dt>
                      <dd className="capitalize">{document.priority}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <StatusBadge status={document.status} />
                      </dd>
                    </div>
                    {document.approvedBy && (
                      <>
                        <div>
                          <dt className="text-muted-foreground">Approved by</dt>
                          <dd>{document.approvedBy.fullName ?? document.approvedBy.email}</dd>
                        </div>
                        {document.approvedBy.actedAt && (
                          <div>
                            <dt className="text-muted-foreground">Approved on</dt>
                            <dd>{formatDate(document.approvedBy.actedAt)}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>

                  {showWorkflowHint && (
                    <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Approval workflow was not started at submit time. Your action will activate the
                      default workflow automatically.
                    </p>
                  )}
                </CardContent>
              </Card>

              <DocumentRoutingPanel documentId={document.id} status={document.status} />

              <DocumentLifecyclePanel documentId={document.id} status={document.status} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">OCR / AI metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentMetadataCorrectionPanel
                    documentId={document.id}
                    canEdit={canEditMetadata}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content & versions</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentFilesPanel
                    documentId={document.id}
                    documentOwnerId={document.createdBy?.id}
                    contentHtml={document.contentHtml}
                    documentStatus={document.status}
                    canEdit={canModifyContent}
                    canSubmit={canSubmitVersions}
                    canDelete={canDeleteFiles}
                    canDownload={canDownloadFiles}
                    confidentiality={document.confidentiality}
                    canApprove={hasApprovePermission}
                    canActOnVersionApproval={canActOnVersionApproval}
                    approvalPending={approvalMutation.isPending}
                    showApprovalBlockedHint={showApprovalBlockedHint}
                    esignCompleted={esignCompleted}
                    esignRequiredForApprove={esignRequiredForApprove}
                    signedFileId={signedFileId}
                    onApproval={handleApproval}
                    highlightFileId={highlightFileId}
                    keyword={keyword}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  <DocumentActivityFeed activity={activity} loading={activityLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardContent className="pt-6">
                  <DocumentTimeline entries={timeline ?? []} loading={timelineLoading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" aria-hidden />
              Public tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentPrivacyControls
              visibility={document.visibility}
              canEdit={canEditMetadata}
              updateMutation={updateMutation}
            />

            {isPublic && document.qrCodeUrl ? (
              <img
                src={document.qrCodeUrl}
                alt={`QR code for ${document.trackingNumber}`}
                className="mx-auto h-48 w-48 rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                {isPublic ? 'QR code unavailable' : 'This document is private. Public tracking is disabled.'}
              </div>
            )}
            {isPublic && trackUrl ? (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open public track page
              </a>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
