import type { HttpContext } from '@adonisjs/core/http'
import { itemService } from '#modules/records/services/item_service'
import { createItemCategoryValidator } from '#modules/records/validators/uims'

export default class ItemCategoriesController {
  async index({ auth, response }: HttpContext) {
    const categories = await itemService.listCategories(auth.user!.organizationId)
    return response.ok({ data: categories })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createItemCategoryValidator)
    const category = await itemService.createCategory(auth.user!.organizationId, data)
    return response.created({ data: category })
  }

  async show({ auth, params, response }: HttpContext) {
    const category = await itemService.getCategory(auth.user!.organizationId, params.id)
    return response.ok({ data: category })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createItemCategoryValidator)
    const category = await itemService.updateCategory(auth.user!.organizationId, params.id, data)
    return response.ok({ data: category })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await itemService.deleteCategory(auth.user!.organizationId, params.id)
    return response.noContent()
  }
}
