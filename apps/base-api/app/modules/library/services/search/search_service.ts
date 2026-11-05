import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import RecentSearch from '#modules/library/models/recent_search'
import SavedSearch, { type SearchFiltersPayload } from '#modules/library/models/saved_search'
import type { SearchEntityType, SearchPreset } from '#modules/library/services/search/search_helpers'
import { searchTenantId } from '#modules/library/services/search/search_helpers'

export interface SearchQueryInput {
  q?: string
  types?: SearchEntityType[]
  preset?: SearchPreset
  genre?: string
  categoryId?: string
  memberType?: string
  status?: string
  page?: number
  perPage?: number
  userId?: string
}

export interface SearchResultItem {
  id: string
  entityType: SearchEntityType
  entityId: string
  label: string
  subtitle: string | null
  metadata: Record<string, unknown>
  rank: number
  url: string
}

export interface SearchFacets {
  entityTypes: Array<{ value: string; count: number }>
  genres: Array<{ value: string; count: number }>
  categories: Array<{ id: string; name: string; count: number }>
  memberTypes: Array<{ value: string; count: number }>
  borrowingStatuses: Array<{ value: string; count: number }>
}

const MAX_RECENT = 20

export default class SearchService {
  async search(input: SearchQueryInput) {
    const tenantId = searchTenantId()
    const page = input.page ?? 1
    const perPage = Math.min(input.perPage ?? 20, 50)
    const offset = (page - 1) * perPage
    const query = (input.q ?? '').trim()

    const { sql, bindings, countSql, countBindings } = this.buildSearchQuery(
      tenantId,
      query,
      input,
      perPage,
      offset
    )

    const countResult = await db.rawQuery(countSql, countBindings)
    const total = Number(countResult.rows[0]?.total ?? 0)

    const result = await db.rawQuery(sql, bindings)
    const items: SearchResultItem[] = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      entityType: row.entity_type as SearchEntityType,
      entityId: row.entity_id as string,
      label: row.label as string,
      subtitle: (row.subtitle as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      rank: Number(row.rank ?? 0),
      url: this.buildResultUrl(row.entity_type as string, row.entity_id as string),
    }))

    const facets = await this.computeFacets(tenantId, query)

    if (input.userId && (query.length > 0 || input.preset)) {
      await this.trackRecentSearch(tenantId, input.userId, query, this.filtersSnapshot(input))
    }

    return {
      items,
      facets,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage) || 0,
        query,
        preset: input.preset ?? null,
      },
    }
  }

  private buildSearchQuery(
    tenantId: string,
    query: string,
    input: SearchQueryInput,
    perPage: number,
    offset: number
  ) {
    const conditions: string[] = ['sd.tenant_id = ?']
    const bindings: unknown[] = [tenantId]

    if (query.length > 0) {
      conditions.push(`sd.search_vector @@ websearch_to_tsquery('english', ?)`)
      bindings.push(query)
    }

    const types = this.resolveEntityTypes(input)
    if (types.length > 0) {
      conditions.push(`sd.entity_type = ANY(?)`)
      bindings.push(types)
    }

    if (input.preset === 'available') {
      conditions.push(`sd.entity_type = 'book'`)
      conditions.push(`COALESCE((sd.metadata->>'availableCopies')::int, 0) > 0`)
    }

    if (input.preset === 'overdue') {
      conditions.push(`sd.entity_type = 'transaction'`)
      conditions.push(`sd.metadata->>'borrowingStatus' = 'overdue'`)
    }

    if (input.preset === 'most_borrowed') {
      conditions.push(`sd.entity_type = 'book'`)
    }

    if (input.preset === 'new_arrivals') {
      conditions.push(`sd.entity_type = 'book'`)
      conditions.push(`sd.created_at >= NOW() - INTERVAL '90 days'`)
    }

    if (input.genre) {
      conditions.push(`sd.metadata->>'genre' = ?`)
      bindings.push(input.genre)
    }

    if (input.categoryId) {
      conditions.push(`sd.metadata->>'categoryId' = ?`)
      bindings.push(input.categoryId)
    }

    if (input.memberType) {
      conditions.push(`sd.entity_type = 'member'`)
      conditions.push(`sd.metadata->>'memberType' = ?`)
      bindings.push(input.memberType)
    }

    if (input.status) {
      conditions.push(
        `(sd.metadata->>'borrowingStatus' = ? OR sd.metadata->>'membershipStatus' = ?)`
      )
      bindings.push(input.status, input.status)
    }

    const whereClause = conditions.join(' AND ')
    const rankExpr =
      query.length > 0
        ? `ts_rank_cd(sd.search_vector, websearch_to_tsquery('english', ?), 32)`
        : '0'
    const rankBindings = query.length > 0 ? [query] : []

    let orderBy = 'sd.label ASC'
    if (input.preset === 'most_borrowed') {
      orderBy = `COALESCE((sd.metadata->>'borrowCount')::int, 0) DESC, sd.label ASC`
    } else if (input.preset === 'new_arrivals') {
      orderBy = `sd.created_at DESC, sd.label ASC`
    } else if (query.length > 0) {
      orderBy = 'rank DESC, sd.label ASC'
    }

    const sql = `
      SELECT sd.id, sd.entity_type, sd.entity_id, sd.label, sd.subtitle, sd.metadata,
        ${rankExpr} AS rank
      FROM search_documents sd
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM search_documents sd
      WHERE ${whereClause}
    `

    return {
      sql,
      bindings: [...rankBindings, ...bindings, perPage, offset],
      countSql,
      countBindings: [...bindings],
    }
  }

  private resolveEntityTypes(input: SearchQueryInput): SearchEntityType[] {
    if (input.preset === 'available' || input.preset === 'most_borrowed' || input.preset === 'new_arrivals') {
      return ['book']
    }
    if (input.preset === 'overdue') {
      return ['transaction']
    }
    if (input.types?.length) {
      return input.types
    }
    return []
  }

  private async computeFacets(tenantId: string, query: string): Promise<SearchFacets> {
    const baseConditions = ['tenant_id = ?']
    const bindings: unknown[] = [tenantId]

    if (query.length > 0) {
      baseConditions.push(`search_vector @@ websearch_to_tsquery('english', ?)`)
      bindings.push(query)
    }

    const where = baseConditions.join(' AND ')

    const entityTypesResult = await db.rawQuery(
      `
      SELECT entity_type AS value, COUNT(*)::int AS count
      FROM search_documents
      WHERE ${where}
      GROUP BY entity_type
      ORDER BY count DESC
      `,
      bindings
    )

    const genresResult = await db.rawQuery(
      `
      SELECT metadata->>'genre' AS value, COUNT(*)::int AS count
      FROM search_documents
      WHERE ${where} AND entity_type = 'book' AND metadata->>'genre' IS NOT NULL
      GROUP BY metadata->>'genre'
      ORDER BY count DESC
      LIMIT 15
      `,
      bindings
    )

    const categoriesResult = await db.rawQuery(
      `
      SELECT metadata->>'categoryId' AS id, metadata->>'categoryName' AS name, COUNT(*)::int AS count
      FROM search_documents
      WHERE ${where} AND entity_type = 'book' AND metadata->>'categoryId' IS NOT NULL
      GROUP BY metadata->>'categoryId', metadata->>'categoryName'
      ORDER BY count DESC
      LIMIT 15
      `,
      bindings
    )

    const memberTypesResult = await db.rawQuery(
      `
      SELECT metadata->>'memberType' AS value, COUNT(*)::int AS count
      FROM search_documents
      WHERE ${where} AND entity_type = 'member' AND metadata->>'memberType' IS NOT NULL
      GROUP BY metadata->>'memberType'
      ORDER BY count DESC
      `,
      bindings
    )

    const statusesResult = await db.rawQuery(
      `
      SELECT metadata->>'borrowingStatus' AS value, COUNT(*)::int AS count
      FROM search_documents
      WHERE ${where} AND entity_type = 'transaction' AND metadata->>'borrowingStatus' IS NOT NULL
      GROUP BY metadata->>'borrowingStatus'
      ORDER BY count DESC
      `,
      bindings
    )

    return {
      entityTypes: entityTypesResult.rows.map((r: Record<string, unknown>) => ({
        value: r.value as string,
        count: Number(r.count),
      })),
      genres: genresResult.rows
        .filter((r: Record<string, unknown>) => r.value)
        .map((r: Record<string, unknown>) => ({
          value: r.value as string,
          count: Number(r.count),
        })),
      categories: categoriesResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: (r.name as string) ?? 'Uncategorized',
        count: Number(r.count),
      })),
      memberTypes: memberTypesResult.rows.map((r: Record<string, unknown>) => ({
        value: r.value as string,
        count: Number(r.count),
      })),
      borrowingStatuses: statusesResult.rows.map((r: Record<string, unknown>) => ({
        value: r.value as string,
        count: Number(r.count),
      })),
    }
  }

  private buildResultUrl(entityType: string, entityId: string): string {
    switch (entityType) {
      case 'book':
        return `/books/${entityId}`
      case 'member':
        return `/members/${entityId}`
      case 'transaction':
        return `/circulation`
      default:
        return '/search'
    }
  }

  private filtersSnapshot(input: SearchQueryInput): SearchFiltersPayload {
    return {
      types: input.types,
      preset: input.preset,
      genre: input.genre,
      categoryId: input.categoryId,
      memberType: input.memberType,
      status: input.status,
    }
  }

  async trackRecentSearch(
    tenantId: string,
    userId: string,
    query: string,
    filters: SearchFiltersPayload
  ) {
    const now = DateTime.now()
    const filtersJson = JSON.stringify(filters)

    const existing = await RecentSearch.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .where('query', query)
      .whereRaw(`filters = ?::jsonb`, [filtersJson])
      .first()

    if (existing) {
      existing.searchedAt = now
      await existing.save()
    } else {
      await RecentSearch.create({
        tenantId,
        userId,
        query,
        filters,
        searchedAt: now,
      })
    }

    const all = await RecentSearch.query()
      .where('tenant_id', tenantId)
      .where('user_id', userId)
      .orderBy('searched_at', 'desc')

    if (all.length > MAX_RECENT) {
      const toDelete = all.slice(MAX_RECENT)
      for (const row of toDelete) {
        await row.delete()
      }
    }
  }

  async listRecent(userId: string) {
    const rows = await RecentSearch.query()
      .where('tenant_id', searchTenantId())
      .where('user_id', userId)
      .orderBy('searched_at', 'desc')
      .limit(MAX_RECENT)

    return rows.map((r) => ({
      id: r.id,
      query: r.query,
      filters: r.filters,
      searchedAt: r.searchedAt.toISO(),
    }))
  }

  async listSaved(userId: string) {
    const rows = await SavedSearch.query()
      .where('tenant_id', searchTenantId())
      .where('user_id', userId)
      .orderBy('created_at', 'desc')

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      query: r.query,
      filters: r.filters,
      createdAt: r.createdAt.toISO(),
    }))
  }

  async createSaved(userId: string, name: string, query: string, filters: SearchFiltersPayload) {
    const saved = await SavedSearch.create({
      tenantId: searchTenantId(),
      userId,
      name,
      query,
      filters,
    })

    return {
      id: saved.id,
      name: saved.name,
      query: saved.query,
      filters: saved.filters,
      createdAt: saved.createdAt.toISO(),
    }
  }

  async deleteSaved(userId: string, savedId: string) {
    const saved = await SavedSearch.query()
      .where('id', savedId)
      .where('tenant_id', searchTenantId())
      .where('user_id', userId)
      .firstOrFail()

    await saved.delete()
  }
}
