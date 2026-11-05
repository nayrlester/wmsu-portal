import { DateTime } from 'luxon'
import TenantDomain from '#modules/documents/models/tenant_domain'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { tokenService } from '#modules/documents/services/token_service'
import { auditService } from '#modules/documents/services/audit_service'
import { AuditAction } from '#modules/documents/domain/enums/index'

export class TenantDomainService {
  async list(): Promise<TenantDomain[]> {
    const tenantId = tenantContext.requireTenantId()
    return TenantDomain.query().where('tenant_id', tenantId).orderBy('created_at', 'desc')
  }

  async add(domain: string, userId: string): Promise<{ domain: TenantDomain; verificationToken: string }> {
    const tenantId = tenantContext.requireTenantId()
    const normalizedDomain = domain.toLowerCase().trim()

    const existing = await TenantDomain.query().where('domain', normalizedDomain).first()
    if (existing && existing.tenantId !== tenantId) {
      throw new Error('Domain is already registered to another organization')
    }

    if (existing?.isVerified) {
      throw new Error('Domain is already verified')
    }

    const rawToken = tokenService.generate(32)
    const verificationExpiresAt = DateTime.now().plus({ days: 7 })
    const tokenHash = tokenService.hash(rawToken)

    const record =
      existing ??
      (await TenantDomain.create({
        tenantId,
        domain: normalizedDomain,
        isPrimary: false,
        isVerified: false,
        verificationTokenHash: tokenHash,
        verificationExpiresAt,
      }))

    if (existing) {
      existing.verificationTokenHash = tokenHash
      existing.verificationExpiresAt = verificationExpiresAt
      await existing.save()
    }

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'tenant_domain',
      entityId: record.id,
      newValues: { domain: normalizedDomain },
    })

    return { domain: record, verificationToken: rawToken }
  }

  async verify(rawToken: string, userId: string): Promise<TenantDomain> {
    const tenantId = tenantContext.requireTenantId()
    const tokenHash = tokenService.hash(rawToken)

    const record = await TenantDomain.query()
      .where('tenant_id', tenantId)
      .where('verification_token_hash', tokenHash)
      .where('verification_expires_at', '>', DateTime.now().toSQL())
      .firstOrFail()

    record.isVerified = true
    record.verifiedAt = DateTime.now()
    record.verificationTokenHash = null
    record.verificationExpiresAt = null

    const domainCount = await TenantDomain.query()
      .where('tenant_id', tenantId)
      .where('is_verified', true)
      .count('* as total')

    if (Number(domainCount[0]?.$extras.total ?? 0) === 0) {
      record.isPrimary = true
    }

    await record.save()

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'tenant_domain',
      entityId: record.id,
      metadata: { action: 'verified' },
    })

    return record
  }

  async setPrimary(domainId: string, userId: string): Promise<TenantDomain> {
    const tenantId = tenantContext.requireTenantId()

    const record = await TenantDomain.query()
      .where('id', domainId)
      .where('tenant_id', tenantId)
      .where('is_verified', true)
      .firstOrFail()

    await TenantDomain.query().where('tenant_id', tenantId).update({ is_primary: false })
    record.isPrimary = true
    await record.save()

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'tenant_domain',
      entityId: record.id,
      metadata: { action: 'set_primary' },
    })

    return record
  }

  async remove(domainId: string, userId: string): Promise<void> {
    const tenantId = tenantContext.requireTenantId()
    const record = await TenantDomain.query()
      .where('id', domainId)
      .where('tenant_id', tenantId)
      .firstOrFail()

    await record.delete()

    await auditService.log({
      tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'tenant_domain',
      entityId: record.id,
    })
  }

  serialize(domain: TenantDomain) {
    return {
      id: domain.id,
      domain: domain.domain,
      isPrimary: domain.isPrimary,
      isVerified: domain.isVerified,
      verifiedAt: domain.verifiedAt,
      createdAt: domain.createdAt,
    }
  }
}

export const tenantDomainService = new TenantDomainService()
