import { DateTime } from 'luxon'
import DigitalRepositoryItem from '#modules/library/models/digital_repository_item'
import ElectronicResource from '#modules/library/models/electronic_resource'
import { borrowingTenantId } from '#modules/library/services/borrowing/borrowing_helpers'
import BusinessRuleException from '#modules/library/exceptions/business_rule_exception'

export default class DigitalService {
  async listRepository(filters: { q?: string; resourceType?: string; page?: number; perPage?: number }) {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 25, 100)
    const query = DigitalRepositoryItem.query()
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')

    if (filters.resourceType) query.where('resource_type', filters.resourceType)
    if (filters.q) {
      const term = `%${filters.q}%`
      query.where((q) => {
        q.whereILike('title', term).orWhereILike('authors', term).orWhereILike('subjects', term)
      })
    }

    return query.orderBy('created_at', 'desc').paginate(page, perPage)
  }

  async createRepositoryItem(input: {
    title: string
    resourceType: DigitalRepositoryItem['resourceType']
    authors?: string
    subjects?: string
    publicationYear?: number
    abstract?: string
    accessLevel?: string
    fileUrl?: string
  }) {
    return DigitalRepositoryItem.create({
      tenantId: borrowingTenantId(),
      title: input.title,
      resourceType: input.resourceType,
      authors: input.authors ?? null,
      subjects: input.subjects ?? null,
      publicationYear: input.publicationYear ?? null,
      abstract: input.abstract ?? null,
      accessLevel: input.accessLevel ?? 'public',
      fileUrl: input.fileUrl ?? null,
      downloadCount: 0,
      viewCount: 0,
      metadata: null,
      createdAt: DateTime.now(),
    })
  }

  async accessRepositoryItem(id: string, mode: 'view' | 'download') {
    const item = await DigitalRepositoryItem.query()
      .where('id', id)
      .where('tenant_id', borrowingTenantId())
      .whereNull('deleted_at')
      .firstOrFail()

    if (item.accessLevel === 'restricted') {
      throw new BusinessRuleException('This digital item requires elevated access')
    }

    if (mode === 'download') item.downloadCount += 1
    else item.viewCount += 1
    await item.save()

    return item
  }

  async listElectronicResources() {
    return ElectronicResource.query()
      .where('tenant_id', borrowingTenantId())
      .where('is_active', true)
      .orderBy('title', 'asc')
  }

  async createElectronicResource(input: {
    title: string
    resourceKind: string
    provider?: string
    accessUrl?: string
    authMethod?: string
  }) {
    return ElectronicResource.create({
      tenantId: borrowingTenantId(),
      title: input.title,
      resourceKind: input.resourceKind,
      provider: input.provider ?? null,
      accessUrl: input.accessUrl ?? null,
      authMethod: input.authMethod ?? 'sso',
      ipRanges: null,
      metadata: null,
      isActive: true,
      viewCount: 0,
      createdAt: DateTime.now(),
    })
  }

  async unifiedSearch(q: string) {
    const tid = borrowingTenantId()
    const term = `%${q}%`

    const [repo, eresources] = await Promise.all([
      DigitalRepositoryItem.query()
        .where('tenant_id', tid)
        .whereNull('deleted_at')
        .where((builder) => {
          builder.whereILike('title', term).orWhereILike('authors', term).orWhereILike('subjects', term)
        })
        .limit(20),
      ElectronicResource.query()
        .where('tenant_id', tid)
        .where('is_active', true)
        .whereILike('title', term)
        .limit(20),
    ])

    return {
      repository: repo.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.resourceType,
        source: 'repository' as const,
        authors: r.authors,
        year: r.publicationYear,
      })),
      electronic: eresources.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.resourceKind,
        source: 'electronic' as const,
        provider: r.provider,
        accessUrl: r.accessUrl,
      })),
    }
  }

  serializeRepo(item: DigitalRepositoryItem) {
    return {
      id: item.id,
      title: item.title,
      resourceType: item.resourceType,
      authors: item.authors,
      subjects: item.subjects,
      publicationYear: item.publicationYear,
      abstract: item.abstract,
      accessLevel: item.accessLevel,
      fileUrl: item.fileUrl,
      downloadCount: item.downloadCount,
      viewCount: item.viewCount,
      createdAt: item.createdAt.toISO(),
    }
  }

  serializeEresource(item: ElectronicResource) {
    return {
      id: item.id,
      title: item.title,
      resourceKind: item.resourceKind,
      provider: item.provider,
      accessUrl: item.accessUrl,
      authMethod: item.authMethod,
      viewCount: item.viewCount,
      isActive: item.isActive,
    }
  }
}
