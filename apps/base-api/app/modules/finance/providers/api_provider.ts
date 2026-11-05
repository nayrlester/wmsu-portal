import type { ApplicationService } from '@adonisjs/core/types'

export default class ApiProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {}

  async ready() {}

  async shutdown() {}
}
