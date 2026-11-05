import Campus from '#modules/records/models/campus'
import Office from '#modules/records/models/office'
import Department from '#modules/records/models/department'
import Organization from '#modules/records/models/organization'

export class OrgService {
  async getOrganization(orgId: string) {
    return Organization.findOrFail(orgId)
  }

  async updateOrganization(
    orgId: string,
    data: Partial<{ name: string; address: string | null; contactEmail: string | null; contactPhone: string | null }>
  ) {
    const org = await Organization.findOrFail(orgId)
    org.merge(data)
    await org.save()
    return org
  }

  // ── Campuses ──

  async listCampuses(orgId: string) {
    return Campus.query().where('organizationId', orgId).orderBy('name')
  }

  async createCampus(orgId: string, data: { name: string; code: string }) {
    return Campus.create({ organizationId: orgId, ...data })
  }

  async getCampus(orgId: string, id: string) {
    return Campus.query().where('organizationId', orgId).where('id', id).firstOrFail()
  }

  async updateCampus(orgId: string, id: string, data: Partial<{ name: string; code: string }>) {
    const campus = await this.getCampus(orgId, id)
    campus.merge(data)
    await campus.save()
    return campus
  }

  async deleteCampus(orgId: string, id: string) {
    const campus = await this.getCampus(orgId, id)
    await campus.delete()
  }

  // ── Offices ──

  async listOffices(orgId: string, campusId?: string) {
    const q = Office.query().where('organizationId', orgId).preload('campus')
    if (campusId) q.where('campusId', campusId)
    return q.orderBy('name')
  }

  async createOffice(orgId: string, data: { campusId: string; name: string; code: string }) {
    return Office.create({ organizationId: orgId, ...data })
  }

  async getOffice(orgId: string, id: string) {
    return Office.query().where('organizationId', orgId).where('id', id).preload('campus').firstOrFail()
  }

  async updateOffice(orgId: string, id: string, data: Partial<{ campusId: string; name: string; code: string }>) {
    const office = await Office.query().where('organizationId', orgId).where('id', id).firstOrFail()
    office.merge(data)
    await office.save()
    return office
  }

  async deleteOffice(orgId: string, id: string) {
    const office = await Office.query().where('organizationId', orgId).where('id', id).firstOrFail()
    await office.delete()
  }

  // ── Departments ──

  async listDepartments(orgId: string, campusId?: string) {
    const q = Department.query().where('organizationId', orgId).preload('campus').preload('office')
    if (campusId) q.where('campusId', campusId)
    return q.orderBy('name')
  }

  async createDepartment(
    orgId: string,
    data: { campusId: string; officeId?: string; name: string; code: string; headName?: string | null }
  ) {
    return Department.create({ organizationId: orgId, ...data })
  }

  async getDepartment(orgId: string, id: string) {
    return Department.query()
      .where('organizationId', orgId)
      .where('id', id)
      .preload('campus')
      .preload('office')
      .firstOrFail()
  }

  async updateDepartment(
    orgId: string,
    id: string,
    data: Partial<{
      campusId: string
      officeId: string | null
      name: string
      code: string
      headName: string | null
    }>
  ) {
    const dept = await Department.query().where('organizationId', orgId).where('id', id).firstOrFail()
    dept.merge(data)
    await dept.save()
    return dept
  }

  async deleteDepartment(orgId: string, id: string) {
    const dept = await Department.query().where('organizationId', orgId).where('id', id).firstOrFail()
    await dept.delete()
  }
}

export const orgService = new OrgService()
