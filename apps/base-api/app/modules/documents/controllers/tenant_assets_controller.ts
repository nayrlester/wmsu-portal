import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export default class TenantAssetsController {
  async show({ params, response }: HttpContext) {
    const filePath = join(app.makePath('storage/tenants'), params.tenantId, params.filename)

    if (!existsSync(filePath)) {
      return response.notFound({ error: 'File not found' })
    }

    return response.download(filePath)
  }
}
