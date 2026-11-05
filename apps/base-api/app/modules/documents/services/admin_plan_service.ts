import Plan from '#modules/documents/models/plan'
import { AuditAction } from '#modules/documents/domain/enums/index'
import { auditService } from '#modules/documents/services/audit_service'

export interface AdminPlanDto {
  name: string
  slug: string
  description?: string | null
  monthlyPrice: number
  annualPrice: number
  currency?: string
  maxUsers?: number | null
  maxDocuments?: number | null
  maxStorageBytes?: number | null
  features?: Record<string, unknown> | null
  isActive?: boolean
  sortOrder?: number
  stripePriceIdMonthly?: string | null
  stripePriceIdAnnual?: string | null
  paymongoPlanIdMonthly?: string | null
  paymongoPlanIdAnnual?: string | null
}

export class AdminPlanService {
  async list(includeInactive = true) {
    const query = Plan.query().orderBy('sort_order', 'asc').orderBy('monthly_price', 'asc')
    if (!includeInactive) query.where('is_active', true)
    const plans = await query
    return plans.map((p) => this.serialize(p))
  }

  async findById(id: string) {
    const plan = await Plan.findOrFail(id)
    return this.serialize(plan)
  }

  async create(dto: AdminPlanDto, actorId?: string) {
    const plan = await Plan.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      monthlyPrice: dto.monthlyPrice,
      annualPrice: dto.annualPrice,
      currency: dto.currency ?? 'USD',
      maxUsers: dto.maxUsers ?? null,
      maxDocuments: dto.maxDocuments ?? null,
      maxStorageBytes: dto.maxStorageBytes ?? null,
      features: dto.features ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      stripePriceIdMonthly: dto.stripePriceIdMonthly ?? null,
      stripePriceIdAnnual: dto.stripePriceIdAnnual ?? null,
      paymongoPlanIdMonthly: dto.paymongoPlanIdMonthly ?? null,
      paymongoPlanIdAnnual: dto.paymongoPlanIdAnnual ?? null,
    })

    await auditService.log({
      tenantId: null,
      userId: actorId ?? null,
      action: AuditAction.CREATE,
      entityType: 'plan',
      entityId: plan.id,
      metadata: { slug: plan.slug },
    })

    return this.serialize(plan)
  }

  async update(id: string, dto: Partial<AdminPlanDto>, actorId?: string) {
    const plan = await Plan.findOrFail(id)

    plan.merge({
      name: dto.name ?? plan.name,
      slug: dto.slug ?? plan.slug,
      description: dto.description !== undefined ? dto.description : plan.description,
      monthlyPrice: dto.monthlyPrice ?? plan.monthlyPrice,
      annualPrice: dto.annualPrice ?? plan.annualPrice,
      currency: dto.currency ?? plan.currency,
      maxUsers: dto.maxUsers !== undefined ? dto.maxUsers : plan.maxUsers,
      maxDocuments: dto.maxDocuments !== undefined ? dto.maxDocuments : plan.maxDocuments,
      maxStorageBytes: dto.maxStorageBytes !== undefined ? dto.maxStorageBytes : plan.maxStorageBytes,
      features: dto.features !== undefined ? dto.features : plan.features,
      isActive: dto.isActive !== undefined ? dto.isActive : plan.isActive,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : plan.sortOrder,
      stripePriceIdMonthly:
        dto.stripePriceIdMonthly !== undefined ? dto.stripePriceIdMonthly : plan.stripePriceIdMonthly,
      stripePriceIdAnnual:
        dto.stripePriceIdAnnual !== undefined ? dto.stripePriceIdAnnual : plan.stripePriceIdAnnual,
      paymongoPlanIdMonthly:
        dto.paymongoPlanIdMonthly !== undefined ? dto.paymongoPlanIdMonthly : plan.paymongoPlanIdMonthly,
      paymongoPlanIdAnnual:
        dto.paymongoPlanIdAnnual !== undefined ? dto.paymongoPlanIdAnnual : plan.paymongoPlanIdAnnual,
    })

    await plan.save()

    await auditService.log({
      tenantId: null,
      userId: actorId ?? null,
      action: AuditAction.UPDATE,
      entityType: 'plan',
      entityId: plan.id,
    })

    return this.serialize(plan)
  }

  serialize(plan: Plan) {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      currency: plan.currency,
      maxUsers: plan.maxUsers,
      maxDocuments: plan.maxDocuments,
      maxStorageBytes: plan.maxStorageBytes,
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      stripePriceIdMonthly: plan.stripePriceIdMonthly,
      stripePriceIdAnnual: plan.stripePriceIdAnnual,
      paymongoPlanIdMonthly: plan.paymongoPlanIdMonthly,
      paymongoPlanIdAnnual: plan.paymongoPlanIdAnnual,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  }
}

export const adminPlanService = new AdminPlanService()
