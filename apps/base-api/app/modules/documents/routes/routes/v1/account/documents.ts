import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'
import { uploadThrottle } from '#start/limiter'

const DocumentsController = () => import('#modules/documents/controllers/documents_controller')
const DocumentVersionsController = () => import('#modules/documents/controllers/document_versions_controller')
const DocumentFilesController = () => import('#modules/documents/controllers/document_files_controller')
const DocumentIntelligenceController = () => import('#modules/documents/controllers/document_intelligence_controller')
const DocumentApprovalsController = () => import('#modules/documents/controllers/document_approvals_controller')
const DocumentContentController = () => import('#modules/documents/controllers/document_content_controller')
const DocumentViewsController = () => import('#modules/documents/controllers/document_views_controller')
const DocumentEsignController = () => import('#modules/documents/controllers/document_esign_controller')

const view = () => middleware.permission(['documents.view'])
const create = () => middleware.permission(['documents.create'])
const update = () => middleware.permission(['documents.update'])
const destroy = () => middleware.permission(['documents.delete'])
const download = () => middleware.permission(['documents.download'])
const approve = () => middleware.permission(['documents.approve'])
const esign = () => middleware.permission(['documents.esign'])

export function registerAccountDocumentRoutes() {
  router.get('documents/search', [DocumentsController, 'search']).use(view())
  router.get('documents/departments', [DocumentsController, 'departments']).use(view())
  router.get('documents/document-types', [DocumentsController, 'documentTypes']).use(view())

  router.get('documents/:documentId/versions', [DocumentVersionsController, 'index']).use(view())
  router.post('documents/:documentId/versions', [DocumentVersionsController, 'store']).use(update())
  router
    .post('documents/:documentId/versions/:versionId/submit', [DocumentVersionsController, 'submit'])
    .use(update())

  router.get('documents/:documentId/files', [DocumentFilesController, 'index']).use(view())
  router
    .post('documents/:documentId/versions/:versionId/files', [DocumentFilesController, 'store'])
    .use(update())
    .use(uploadThrottle)
  router
    .post('documents/:documentId/versions/:versionId/files/presign', [DocumentFilesController, 'presign'])
    .use(update())
  router
    .post('documents/:documentId/versions/:versionId/files/complete', [DocumentFilesController, 'completePresigned'])
    .use(update())
  router
    .post('documents/:documentId/files/:fileId/replace', [DocumentFilesController, 'replace'])
    .use(update())
  router
    .get('documents/:documentId/files/:fileId/edit', [DocumentFilesController, 'edit'])
    .use(view())
  router
    .put('documents/:documentId/files/:fileId/edit', [DocumentFilesController, 'saveEdit'])
    .use(update())
  router
    .get('documents/:documentId/files/:fileId/download', [DocumentFilesController, 'download'])
    .use(download())
  router
    .get('documents/:documentId/files/:fileId/view', [DocumentFilesController, 'view'])
    .use(view())
  router
    .get('documents/:documentId/files/:fileId/preview-html', [DocumentFilesController, 'previewHtml'])
    .use(view())
  router.delete('documents/:documentId/files/:fileId', [DocumentFilesController, 'destroy']).use(destroy())

  router.get('documents/:documentId/intelligence', [DocumentIntelligenceController, 'show']).use(view())
  router
    .post('documents/:documentId/intelligence/analyze', [DocumentIntelligenceController, 'analyze'])
    .use(update())
  router
    .put('documents/:documentId/intelligence/metadata', [DocumentIntelligenceController, 'correctMetadata'])
    .use(update())
  router
    .get('documents/:documentId/intelligence/jobs/:jobId', [DocumentIntelligenceController, 'jobStatus'])
    .use(view())

  router.get('documents/:documentId/content', [DocumentContentController, 'show']).use(view())
  router.put('documents/:documentId/content', [DocumentContentController, 'update']).use(update())
  router.post('documents/:documentId/views', [DocumentViewsController, 'store']).use(view())

  router.get('documents', [DocumentsController, 'index']).use(view())
  router.post('documents', [DocumentsController, 'store']).use(create())
  router.get('documents/:id', [DocumentsController, 'show']).use(view())
  router.put('documents/:id', [DocumentsController, 'update']).use(update())
  router.delete('documents/:id', [DocumentsController, 'destroy']).use(destroy())
  router.post('documents/:id/archive', [DocumentsController, 'archive']).use(update())
  router.post('documents/:id/submit', [DocumentsController, 'submit']).use(update())

  router.get('documents/:id/esign', [DocumentEsignController, 'show']).use(view())
  router.post('documents/:id/esign', [DocumentEsignController, 'store']).use(esign())
  router.post('documents/:id/esign/start', [DocumentEsignController, 'start']).use(esign())
  router.post('documents/:id/esign/place-session', [DocumentEsignController, 'placeSession']).use(esign())
  router.post('documents/:id/esign/finalize', [DocumentEsignController, 'finalize']).use(esign())
  router.post('documents/:id/esign/session', [DocumentEsignController, 'session']).use(esign())
  router.post('documents/:id/esign/sync', [DocumentEsignController, 'sync']).use(esign())

  router
    .get('documents/:documentId/workflow', [DocumentApprovalsController, 'workflowState'])
    .use(view())
  router.get('documents/:documentId/timeline', [DocumentApprovalsController, 'timeline']).use(view())
  router.get('documents/:documentId/approvals', [DocumentApprovalsController, 'approvals']).use(view())
  router.get('documents/:documentId/activity', [DocumentApprovalsController, 'activity']).use(view())
  router.post('approvals/bulk', [DocumentApprovalsController, 'bulkAct']).use(approve())
  router.post('documents/:documentId/approvals', [DocumentApprovalsController, 'act']).use(approve())
}
