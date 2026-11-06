import router from '@adonisjs/core/services/router'
import { mw as middleware } from '#modules/records/middleware_registry'

const AuthController = () => import('#modules/records/controllers/auth_controller')
const TorController = () => import('#modules/records/controllers/tor_controller')
const CertificationController = () => import('#modules/records/controllers/certification_controller')
const InternalGradesController = () => import('#modules/records/controllers/internal_grades_controller')
const AlumniController = () => import('#modules/records/controllers/alumni_controller')
const TormsFoundationController = () => import('#modules/records/controllers/torms_foundation_controller')
const DocumentIssuanceController = () => import('#modules/records/controllers/document_issuance_controller')
const TormsAlumniController = () => import('#modules/records/controllers/torms_alumni_controller')
const TormsReportsController = () => import('#modules/records/controllers/torms_reports_controller')


router
  .post('/api/v1/public/verify', [DocumentIssuanceController, 'verifyPublic'])
  .use(middleware.rateLimit({ max: 60, windowMs: 60_000, prefix: 'public-verify' }))

router
  .group(() => {
    router.post('/auth/login', [AuthController, 'login'])
      .use(
        middleware.rateLimit({
          max: process.env.NODE_ENV === 'production' ? 10 : 120,
          windowMs: 15 * 60_000,
          prefix: 'login',
        })
      )
    router.post('/auth/refresh', [AuthController, 'refresh'])
      .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'refresh' }))
  })
  .prefix('/api/v1/records').as('records')

router
  .group(() => {
    router.post('/auth/logout', [AuthController, 'logout'])
    router.get('/auth/me', [AuthController, 'me'])

    router
      .group(() => {
        router
          .post('/requests', [TorController, 'submit'])
          .as('tor.requests.submit')
          .use(middleware.permission(['torms.requests.write']))
          .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'tor-submit' }))
        router
          .get('/requests', [TorController, 'index'])
          .as('tor.requests.index')
          .use(middleware.permission(['torms.requests.read']))
        router
          .get('/requests/:idOrNumber', [TorController, 'show'])
          .as('tor.requests.show')
          .use(middleware.permission(['torms.requests.read']))
        router
          .get('/requests/:idOrNumber/academic-records', [TorController, 'academicRecords'])
          .as('tor.requests.academic')
          .use(middleware.permission(['torms.requests.read']))
        router
          .post('/requests/:idOrNumber/transition', [TorController, 'transition'])
          .as('tor.requests.transition')
          .use(middleware.permission(['torms.requests.process']))
        router
          .post('/requests/:idOrNumber/confirm-physical', [TorController, 'confirmPhysical'])
          .as('tor.requests.confirm_physical')
          .use(middleware.permission(['torms.requests.process']))
        router
          .post('/requests/:idOrNumber/attachments', [TorController, 'addAttachmentRef'])
          .as('tor.requests.attachments')
          .use(middleware.permission(['torms.requests.write']))
        router
          .post('/requests/:idOrNumber/verify-payment', [TorController, 'verifyPayment'])
          .as('tor.requests.verify_payment')
          .use(middleware.permission(['torms.requests.process']))
        router
          .post('/requests/:idOrNumber/generate', [DocumentIssuanceController, 'generateTor'])
          .as('tor.requests.generate')
          .use(middleware.permission(['torms.issuance.write']))
        router
          .get('/requests/:idOrNumber/issuances', [DocumentIssuanceController, 'listTorIssuances'])
          .as('tor.requests.issuances')
          .use(middleware.permission(['torms.issuance.read']))
        router
          .get('/preview/:studentNumber', [TorController, 'preview'])
          .as('tor.requests.preview')
          .use(middleware.permission(['records.read']))
      })
      .prefix('/tor')

    router
      .post('/tor/issuances/:issuanceId/issue', [DocumentIssuanceController, 'issueTor'])
      .as('tor.issuances.issue')
      .use(middleware.permission(['torms.issuance.write']))
    router
      .post('/tor/issuances/:issuanceId/print-log', [DocumentIssuanceController, 'logPrint'])
      .as('tor.issuances.print')
      .use(middleware.permission(['torms.issuance.write']))

    router
      .post('/tor/request', [TorController, 'submit'])
      .as('tor.request_legacy')
      .use(middleware.permission(['torms.requests.write']))
    router
      .get('/tor/:studentNumber/preview', [TorController, 'preview'])
      .as('tor.preview_legacy')
      .use(middleware.permission(['records.read']))

    router
      .group(() => {
        router
          .get('/types', [CertificationController, 'listTypes'])
          .as('cert.types.index')
          .use(middleware.permission(['torms.requests.read']))
        router
          .put('/types/:code', [CertificationController, 'updateType'])
          .as('cert.types.update')
          .use(middleware.permission(['torms.foundation.admin']))
        router
          .post('/requests', [CertificationController, 'submit'])
          .as('cert.requests.submit')
          .use(middleware.permission(['torms.requests.write']))
          .use(middleware.rateLimit({ max: 30, windowMs: 60_000, prefix: 'cert-submit' }))
        router
          .get('/requests', [CertificationController, 'index'])
          .as('cert.requests.index')
          .use(middleware.permission(['torms.requests.read']))
        router
          .get('/requests/:idOrNumber', [CertificationController, 'show'])
          .as('cert.requests.show')
          .use(middleware.permission(['torms.requests.read']))
        router
          .get('/requests/:idOrNumber/academic-records', [CertificationController, 'academicRecords'])
          .as('cert.requests.academic')
          .use(middleware.permission(['torms.requests.read']))
        router
          .post('/requests/:idOrNumber/transition', [CertificationController, 'transition'])
          .as('cert.requests.transition')
          .use(middleware.permission(['torms.requests.process']))
        router
          .post('/requests/:idOrNumber/attachments', [CertificationController, 'addAttachmentRef'])
          .as('cert.requests.attachments')
          .use(middleware.permission(['torms.requests.write']))
        router
          .post('/requests/:idOrNumber/verify-payment', [CertificationController, 'verifyPayment'])
          .as('cert.requests.verify_payment')
          .use(middleware.permission(['torms.requests.process']))
        router
          .post('/requests/:idOrNumber/generate', [DocumentIssuanceController, 'generateCert'])
          .as('cert.requests.generate')
          .use(middleware.permission(['torms.issuance.write']))
        router
          .get('/requests/:idOrNumber/issuances', [DocumentIssuanceController, 'listCertIssuances'])
          .as('cert.requests.issuances')
          .use(middleware.permission(['torms.issuance.read']))
      })
      .prefix('/certifications')

    router
      .post('/certifications/issuances/:issuanceId/issue', [DocumentIssuanceController, 'issueCert'])
      .as('cert.issuances.issue')
      .use(middleware.permission(['torms.issuance.write']))
    router
      .post('/certifications/issuances/:issuanceId/print-log', [DocumentIssuanceController, 'logPrint'])
      .as('cert.issuances.print')
      .use(middleware.permission(['torms.issuance.write']))

    router
      .get('/certifications', [CertificationController, 'index'])
      .as('cert.index_legacy')
      .use(middleware.permission(['torms.requests.read']))
    router
      .post('/certifications', [CertificationController, 'store'])
      .as('cert.store_legacy')
      .use(middleware.permission(['torms.requests.write']))

    router
      .group(() => {
        router.get('/foundation/status', [TormsFoundationController, 'status']).use(
          middleware.permission(['torms.foundation.read'])
        )
        router.get('/integrations/contracts', [TormsFoundationController, 'listContracts']).use(
          middleware.permission(['torms.foundation.read'])
        )
        router.get('/integrations/outbox', [TormsFoundationController, 'listOutbox']).use(
          middleware.permission(['torms.foundation.read'])
        )
        router.post('/integrations/probe', [TormsFoundationController, 'probeIntegrations']).use(
          middleware.permission(['torms.foundation.admin'])
        )
        router.get('/integrations/archive-readiness', [TormsFoundationController, 'archiveReadiness']).use(
          middleware.permission(['torms.sync.write'])
        )
        router.post('/integrations/archive-reference', [TormsFoundationController, 'archiveReference']).use(
          middleware.permission(['torms.sync.write'])
        )
        router.post('/integrations/archive-route', [TormsFoundationController, 'archiveRoute']).use(
          middleware.permission(['torms.sync.write'])
        )
        router.get('/settings', [TormsFoundationController, 'listSettings']).use(
          middleware.permission(['torms.foundation.read'])
        )
        router.put('/settings', [TormsFoundationController, 'upsertSetting']).use(
          middleware.permission(['torms.foundation.admin'])
        )
        router.get('/requests/:requestNumber', [TormsFoundationController, 'lookupRequest']).use(
          middleware.permission(['torms.requests.read'])
        )
        router.get('/sync/runs', [TormsFoundationController, 'listSyncRuns']).use(
          middleware.permission(['torms.sync.read'])
        )
        router.get('/sync/discrepancies', [TormsFoundationController, 'listDiscrepancies']).use(
          middleware.permission(['torms.sync.read'])
        )
        router.post('/sync/usis/pull', [TormsFoundationController, 'pullUsisGrades']).use(
          middleware.permission(['torms.sync.write'])
        )
        router.get('/sync/ledger/:studentNumber', [TorController, 'preview']).use(
          middleware.permission(['torms.sync.write'])
        )

        router
          .get('/alumni', [TormsAlumniController, 'index'])
          .use(middleware.permission(['torms.alumni.read']))
        router
          .get('/alumni/me', [TormsAlumniController, 'me'])
          .use(middleware.permission(['torms.alumni.read']))
        router
          .get('/alumni/standing/:studentNumber', [TormsAlumniController, 'standing'])
          .use(middleware.permission(['torms.alumni.read']))
        router
          .get('/alumni/:idOrStudent', [TormsAlumniController, 'show'])
          .use(middleware.permission(['torms.alumni.read']))
        router
          .put('/alumni/:idOrStudent', [TormsAlumniController, 'update'])
          .use(middleware.permission(['torms.alumni.write']))

        router
          .get('/dashboard/summary', [TormsReportsController, 'dashboard'])
          .use(middleware.permission(['torms.dashboard.read']))
        router
          .get('/reports/requests', [TormsReportsController, 'requests'])
          .use(middleware.permission(['torms.reports.read']))
        router
          .get('/reports/issuances', [TormsReportsController, 'issuances'])
          .use(middleware.permission(['torms.reports.read']))
      })
      .prefix('/torms')
  })
  .prefix('/api/v1/records').as('records')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/grades/sync', [InternalGradesController, 'syncGrades'])
    router.post('/alumni/from-graduation', [AlumniController, 'createFromGraduation'])
  })
  .prefix('/api/v1/records/internal').as('records.internal')
  .use(middleware.serviceApiKey())

router
  .group(() => {
    router.post('/grades/sync', [InternalGradesController, 'syncGrades'])
    router.post('/alumni/from-graduation', [AlumniController, 'createFromGraduation'])
  })
  .prefix('/api/v1/internal').as('records.internal.legacy')
  .use(middleware.serviceApiKey())
