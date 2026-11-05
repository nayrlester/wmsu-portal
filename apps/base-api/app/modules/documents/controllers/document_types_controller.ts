import type { HttpContext } from '@adonisjs/core/http'
import { documentTypeService } from '#modules/documents/services/document_type_service'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { TenantPolicy } from '#modules/documents/domain/policies/tenant_policy'
import { createDocumentTypeValidator, updateDocumentTypeValidator } from '#modules/documents/validators/document_type'

export default class DocumentTypesController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const documentTypes = await documentTypeService.list()
    return response.ok({
      documentTypes: documentTypes.map((documentType) => documentTypeService.serialize(documentType)),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(createDocumentTypeValidator)
    const documentType = await documentTypeService.create(payload, user.id)

    return response.created({ documentType: documentTypeService.serialize(documentType) })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    const payload = await request.validateUsing(updateDocumentTypeValidator)
    const documentType = await documentTypeService.update(params.id, payload, user.id)

    return response.ok({ documentType: documentTypeService.serialize(documentType) })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const tenantId = tenantContext.requireTenantId()
    await TenantPolicy.assertTenantSettings(user, tenantId)

    await documentTypeService.deactivate(params.id, user.id)
    return response.ok({ message: 'Document type deactivated successfully' })
  }
}
