import type { SearchEntityType } from '#modules/library/models/search_document'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import { enqueueSearchIndex } from '#modules/library/services/queue/search_index_queue'
import SearchIndexerService from '#modules/library/services/search/search_indexer_service'

async function indexNow(
  tenantId: string,
  entityType: SearchEntityType,
  entityId: string,
  action: 'upsert' | 'delete'
) {
  const indexer = new SearchIndexerService()
  if (action === 'delete') {
    await indexer.deleteEntity(tenantId, entityType, entityId)
    return
  }
  await indexer.indexEntity(tenantId, entityType, entityId)
}

export function scheduleSearchIndex(
  entityType: SearchEntityType,
  entityId: string,
  action: 'upsert' | 'delete' = 'upsert',
  tenantId?: string
) {
  const tid = tenantId ?? tenantContext.tryGet()?.id
  if (!tid) return

  void indexNow(tid, entityType, entityId, action).catch(() => {})
  enqueueSearchIndex({ tenantId: tid, entityType, entityId, action }).catch(() => {})
}

export function scheduleBookReindex(bookId: string, tenantId?: string) {
  scheduleSearchIndex('book', bookId, 'upsert', tenantId)
}

export function scheduleMemberReindex(memberId: string, tenantId?: string) {
  scheduleSearchIndex('member', memberId, 'upsert', tenantId)
}

export function scheduleTransactionReindex(borrowingId: string, tenantId?: string) {
  scheduleSearchIndex('transaction', borrowingId, 'upsert', tenantId)
}
