import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/shared/constants/env'
import { approvalsApi } from '@/api/modules/approvals.api'
import { documentsService } from '@/features/documents/services/documents.service'
import { useAuthStore } from '@/stores/auth-store'
import type { DocumentFilters } from '@/features/documents/types/document.types'
import type { ApprovalActionInput } from '@/api/modules/approvals.api'

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.documents, filters],
    queryFn: () => documentsService.list(filters),
    placeholderData: keepPreviousData,
  })
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.document, id],
    queryFn: () => documentsService.get(id!),
    enabled: Boolean(id),
  })
}

export function useDocumentTimeline(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['document-timeline', id],
    queryFn: () => documentsService.timeline(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => documentsService.departments(),
    staleTime: 15 * 60_000,
  })
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: () => documentsService.documentTypes(),
    staleTime: 15 * 60_000,
  })
}

export function useDocumentFiles(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-files', documentId],
    queryFn: () => documentsService.files(documentId!),
    enabled: Boolean(documentId),
  })
}

export function useDocumentActivity(documentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['document-activity', documentId],
    queryFn: () => documentsService.activity(documentId!),
    enabled: Boolean(documentId) && enabled,
  })
}

export function useDocumentWorkflow(documentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['document-workflow', documentId],
    queryFn: () => documentsService.workflow(documentId!),
    enabled: Boolean(documentId) && enabled,
  })
}

export function useDocumentVersions(documentId: string | undefined, enabled = true) {
  const currentUserId = useAuthStore((state) => state.user?.id)

  return useQuery({
    queryKey: ['document-versions', documentId, currentUserId],
    queryFn: () => documentsService.versions(documentId!),
    enabled: Boolean(documentId) && enabled,
  })
}

export function useUploadDocumentFile(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ versionId, file }: { versionId: string; file: File }) =>
      documentsService.uploadFile(documentId, versionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] })
    },
  })
}

export function useReplaceDocumentFile(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, file, changeNotes }: { fileId: string; file: File; changeNotes?: string }) =>
      documentsService.replaceFile(documentId, fileId, file, changeNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] })
    },
  })
}

export function useDeleteDocumentFile(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => documentsService.deleteFile(documentId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] })
    },
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: documentsService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] }),
  })
}

export function useSubmitDocumentVersion(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (versionId: string) => documentsService.submitVersion(documentId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.document, documentId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboardStats] })
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-timeline', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-workflow', documentId] })
    },
  })
}

export function useSubmitDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => documentsService.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.document, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboardStats] })
      queryClient.invalidateQueries({ queryKey: ['document-versions', id] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', id] })
      queryClient.invalidateQueries({ queryKey: ['document-timeline', id] })
    },
  })
}

export function useDocumentApproval(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ApprovalActionInput) => documentsService.approve(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.document, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] })
      queryClient.invalidateQueries({ queryKey: ['document-versions', id] })
      queryClient.invalidateQueries({ queryKey: ['document-activity', id] })
      queryClient.invalidateQueries({ queryKey: ['document-timeline', id] })
      queryClient.invalidateQueries({ queryKey: ['document-workflow', id] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
  })
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => approvalsApi.listPending(),
  })
}

export function useSaveDocumentContent(documentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contentHtml, changeNotes }: { contentHtml: string; changeNotes?: string }) =>
      documentsService.saveContent(documentId, contentHtml, changeNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.document, documentId] })
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] })
    },
  })
}

export function useLogDocumentView(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-view', documentId],
    queryFn: () => documentsService.logView(documentId!),
    enabled: Boolean(documentId),
    staleTime: Infinity,
    retry: false,
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => documentsService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.document, id] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documents] })
    },
  })
}
