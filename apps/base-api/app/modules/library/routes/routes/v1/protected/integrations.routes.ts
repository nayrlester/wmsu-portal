import router from '@adonisjs/core/services/router'

const IntegrationsController = () => import('#modules/library/controllers/integrations_controller')

export function registerIntegrationRoutes() {
  router.get('integrations/status', [IntegrationsController, 'status'])
  router.post('integrations/aris/sync', [IntegrationsController, 'syncAris'])
  router.post('integrations/hris/sync', [IntegrationsController, 'syncHris'])
  router.post('integrations/ldap/authenticate', [IntegrationsController, 'ldapAuth'])
  router.post('integrations/smart-campus/sso', [IntegrationsController, 'smartCampusSso'])
}
