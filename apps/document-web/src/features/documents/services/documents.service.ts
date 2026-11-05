import { documentsApi } from '@/api/modules/documents.api'
import { udmsApi } from '@/api/modules/udms.api'
import { approvalsApi } from '@/api/modules/approvals.api'
import type {
  CreateDocumentInput,
  DocumentApprovalInput,
  DocumentFilters,
} from '@/features/documents/types/document.types'

export const documentsService = {
  list: (filters?: DocumentFilters) =>
    documentsApi.list(filters as Record<string, string | number | undefined>),
  get: (id: string) => documentsApi.get(id),
  create: (input: CreateDocumentInput) =>
    udmsApi.register(input as unknown as Record<string, unknown>),
  createDraft: (input: Record<string, unknown>) => documentsApi.create(input),
  submit: (id: string) => documentsApi.submit(id),

  submitVersion: (documentId: string, versionId: string) =>
    documentsApi.submitVersion(documentId, versionId),
  approve: (id: string, input: DocumentApprovalInput) => approvalsApi.act(id, input),
  timeline: (id: string) => documentsApi.timeline(id).then((r) => r.timeline),
  departments: () => documentsApi.departments().then((r) => r.departments),
  documentTypes: () => documentsApi.documentTypes().then((r) => r.documentTypes),
  files: (documentId: string) => documentsApi.files(documentId).then((r) => r.files),
  activity: (documentId: string) => documentsApi.activity(documentId).then((r) => r.activity),
  workflow: (documentId: string) => documentsApi.workflow(documentId),
  versions: (documentId: string, page = 1, limit = 25) =>
    documentsApi.versions(documentId, page, limit),
  createVersion: (documentId: string, changeNotes?: string) =>
    documentsApi.createVersion(documentId, changeNotes ? { changeNotes } : undefined),
  uploadFile: (documentId: string, versionId: string, file: File) =>
    documentsApi.uploadFile(documentId, versionId, file),
  downloadFile: (documentId: string, fileId: string) =>
    documentsApi.downloadFile(documentId, fileId),

  viewFile: (documentId: string, fileId: string) =>
    documentsApi.viewFile(documentId, fileId),
  deleteFile: (documentId: string, fileId: string) =>
    documentsApi.deleteFile(documentId, fileId),
  replaceFile: (documentId: string, fileId: string, file: File, changeNotes?: string) =>
    documentsApi.replaceFile(documentId, fileId, file, changeNotes),
  getContent: (documentId: string) => documentsApi.getContent(documentId),
  saveContent: (documentId: string, contentHtml: string, changeNotes?: string) =>
    documentsApi.saveContent(documentId, { contentHtml, changeNotes }),
  logView: (documentId: string) => documentsApi.logView(documentId),
  update: (id: string, input: Record<string, unknown>) => documentsApi.update(id, input),
}
