import type { HttpContext } from '@adonisjs/core/http'
import { searchService } from '#modules/documents/services/search_service'
import { universalSearchValidator } from '#modules/documents/validators/search'
import type { SearchResultType } from '#modules/documents/domain/search/search_types'

export default class SearchController {
  async index({ request, auth, response }: HttpContext) {
    const { q, limit, types, minOcrConfidence } = await request.validateUsing(universalSearchValidator, {
      data: request.qs(),
    })

    const normalizedTypes = (types as string[] | undefined)?.filter((type): type is SearchResultType =>
      ['document', 'file', 'user', 'workflow'].includes(type)
    )

    const user = auth.user!
    const tenantId = user.tenantId!

    const permissions = await this.resolvePermissions(user, tenantId)

    const results = await searchService.search(
      {
        q,
        limit,
        types: normalizedTypes,
        minOcrConfidence,
      },
      { ...permissions, viewerUserId: user.id }
    )

    return response.ok(results)
  }

  async searchByImage({ request, auth, response }: HttpContext) {
    const uploadFile = request.file('file', {
      size: '10mb',
      extnames: ['png', 'jpg', 'jpeg'],
    })

    if (!uploadFile) {
      return response.badRequest({ error: 'Image file is required' })
    }

    const user = auth.user!
    const tenantId = user.tenantId!
    const permissions = await this.resolvePermissions(user, tenantId)

    if (!permissions.canViewDocuments) {
      return response.forbidden({ error: 'Insufficient permissions' })
    }

    try {
      const limit = Math.min(Number(request.input('limit') ?? 20), 50)
      const results = await searchService.searchByImage(uploadFile, {
        ...permissions,
        viewerUserId: user.id,
      }, limit)
      return response.ok(results)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image search failed'
      return response.badRequest({ error: message })
    }
  }

  private async resolvePermissions(
    user: NonNullable<HttpContext['auth']['user']>,
    tenantId: string
  ) {
    if (user.isSuperAdmin) {
      return {
        canViewDocuments: true,
        canViewUsers: true,
        canViewWorkflows: true,
      }
    }

    const [canViewDocuments, canViewUsers, canViewWorkflows] = await Promise.all([
      user.hasPermission('documents.view', tenantId),
      user.hasPermission('users.manage', tenantId),
      user.hasPermission('workflows.manage', tenantId),
    ])

    return { canViewDocuments, canViewUsers, canViewWorkflows }
  }
}
