import type { HttpContext } from '@adonisjs/core/http'
import { orgService } from '#modules/finance/services/org_service'
import {
  updateOrganizationValidator,
  createCampusValidator,
  updateCampusValidator,
  createOfficeValidator,
  updateOfficeValidator,
  createDepartmentValidator,
  updateDepartmentValidator,
} from '#modules/finance/validators/uims'

export default class OrgController {
  async show({ auth, response }: HttpContext) {
    const org = await orgService.getOrganization(auth.user!.organizationId)
    return response.ok({ data: org })
  }

  async update({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(updateOrganizationValidator)
    const org = await orgService.updateOrganization(auth.user!.organizationId, {
      name: data.name,
      address: data.address === undefined ? undefined : data.address || null,
      contactEmail: data.contactEmail === undefined ? undefined : data.contactEmail || null,
      contactPhone: data.contactPhone === undefined ? undefined : data.contactPhone || null,
    })
    return response.ok({ data: org })
  }

  // ── Campuses ──

  async listCampuses({ auth, response }: HttpContext) {
    const campuses = await orgService.listCampuses(auth.user!.organizationId)
    return response.ok({ data: campuses })
  }

  async createCampus({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createCampusValidator)
    const campus = await orgService.createCampus(auth.user!.organizationId, data)
    return response.created({ data: campus })
  }

  async getCampus({ auth, params, response }: HttpContext) {
    const campus = await orgService.getCampus(auth.user!.organizationId, params.id)
    return response.ok({ data: campus })
  }

  async updateCampus({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateCampusValidator)
    const campus = await orgService.updateCampus(auth.user!.organizationId, params.id, data)
    return response.ok({ data: campus })
  }

  async deleteCampus({ auth, params, response }: HttpContext) {
    await orgService.deleteCampus(auth.user!.organizationId, params.id)
    return response.noContent()
  }

  // ── Offices ──

  async listOffices({ auth, request, response }: HttpContext) {
    const campusId = request.input('campusId')
    const offices = await orgService.listOffices(auth.user!.organizationId, campusId)
    return response.ok({ data: offices })
  }

  async createOffice({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createOfficeValidator)
    const office = await orgService.createOffice(auth.user!.organizationId, data)
    return response.created({ data: office })
  }

  async getOffice({ auth, params, response }: HttpContext) {
    const office = await orgService.getOffice(auth.user!.organizationId, params.id)
    return response.ok({ data: office })
  }

  async updateOffice({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateOfficeValidator)
    const office = await orgService.updateOffice(auth.user!.organizationId, params.id, data)
    return response.ok({ data: office })
  }

  async deleteOffice({ auth, params, response }: HttpContext) {
    await orgService.deleteOffice(auth.user!.organizationId, params.id)
    return response.noContent()
  }

  // ── Departments ──

  async listDepartments({ auth, request, response }: HttpContext) {
    const campusId = request.input('campusId')
    const departments = await orgService.listDepartments(auth.user!.organizationId, campusId)
    return response.ok({ data: departments })
  }

  async createDepartment({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createDepartmentValidator)
    const department = await orgService.createDepartment(auth.user!.organizationId, data)
    return response.created({ data: department })
  }

  async getDepartment({ auth, params, response }: HttpContext) {
    const department = await orgService.getDepartment(auth.user!.organizationId, params.id)
    return response.ok({ data: department })
  }

  async updateDepartment({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateDepartmentValidator)
    const department = await orgService.updateDepartment(auth.user!.organizationId, params.id, data)
    return response.ok({ data: department })
  }

  async deleteDepartment({ auth, params, response }: HttpContext) {
    await orgService.deleteDepartment(auth.user!.organizationId, params.id)
    return response.noContent()
  }
}
