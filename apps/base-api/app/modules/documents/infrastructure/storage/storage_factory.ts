import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import type { StorageAdapter } from '#modules/documents/infrastructure/storage/storage_adapter'
import { LocalStorageAdapter } from '#modules/documents/infrastructure/storage/local_storage_adapter'

let adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter

  adapter = new LocalStorageAdapter()

  if (!app.inTest) {
    logger.info({ mode: 'local', bucket: 'storage/private' }, 'Document storage adapter initialized')
  }

  return adapter
}

export function resetStorageAdapter(): void {
  adapter = null
}
