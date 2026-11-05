import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/documents/middleware_registry'

const ArchivesController = () => import('#modules/documents/controllers/archives_controller')

const archives = () => middleware.permission(['records.archives.manage'])

export function registerAccountArchivesRoutes() {
  router
    .post('documents/:documentId/legal-hold', [ArchivesController, 'setLegalHold'])
    .use(archives())

  router.get('archives/transfers', [ArchivesController, 'listTransfers']).use(archives())
  router.post('archives/transfers', [ArchivesController, 'createTransfer']).use(archives())
  router.get('archives/transfers/:id', [ArchivesController, 'showTransfer']).use(archives())
  router
    .post('archives/transfers/:id/approve', [ArchivesController, 'approveTransfer'])
    .use(archives())
  router
    .post('archives/transfers/:id/complete', [ArchivesController, 'completeTransfer'])
    .use(archives())

  router.get('archives/disposals', [ArchivesController, 'listDisposals']).use(archives())
  router.post('archives/disposals', [ArchivesController, 'createDisposal']).use(archives())
  router.get('archives/disposals/:id', [ArchivesController, 'showDisposal']).use(archives())
  router
    .post('archives/disposals/:id/approve', [ArchivesController, 'approveDisposal'])
    .use(archives())
  router
    .post('archives/disposals/:id/execute', [ArchivesController, 'executeDisposal'])
    .use(archives())
}
