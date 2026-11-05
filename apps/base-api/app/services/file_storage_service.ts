import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { writePlatformAudit } from '#services/platform_audit_service'

function storageRoot() {
  return env.get('FILE_STORAGE_ROOT') ?? path.resolve(process.cwd(), 'tmp/storage')
}

export async function storeFile(input: {
  buffer: Buffer
  originalName: string
  contentType?: string | null
  bucket?: string
  ownerType?: string | null
  ownerId?: string | null
  metadata?: Record<string, unknown>
  actorId?: string | null
}) {
  const bucket = input.bucket ?? 'default'
  const id = randomUUID()
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const objectKey = `${new Date().toISOString().slice(0, 10)}/${id}-${safeName}`
  const dir = path.join(storageRoot(), bucket, path.dirname(objectKey))
  await mkdir(dir, { recursive: true })
  const absolute = path.join(storageRoot(), bucket, objectKey)
  await writeFile(absolute, input.buffer)

  const row = {
    id,
    bucket,
    object_key: objectKey,
    original_name: input.originalName,
    content_type: input.contentType ?? null,
    byte_size: input.buffer.byteLength,
    checksum_sha256: createHash('sha256').update(input.buffer).digest('hex'),
    owner_type: input.ownerType ?? null,
    owner_id: input.ownerId ?? null,
    storage_driver: 'local',
    metadata: input.metadata ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.table('cis_stored_files').insert(row)
  await writePlatformAudit({
    actorId: input.actorId ?? null,
    action: 'file.store',
    entityType: 'cis_stored_files',
    entityId: id,
    afterData: { bucket, objectKey, byteSize: row.byte_size },
  })
  return row
}

export async function getStoredFile(id: string) {
  return db.from('cis_stored_files').where('id', id).first()
}

export function resolveStoredFilePath(file: { bucket: string; object_key: string }) {
  return path.join(storageRoot(), file.bucket, file.object_key)
}
