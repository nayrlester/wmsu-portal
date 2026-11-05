import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'

const LOCAL_PREFIX = 'local:'

export function isLocalDigitalFileId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX)
}

function storageRoot() {
  return join(app.makePath('storage'), 'digital-files')
}

function pathForId(localId: string) {
  const relative = localId.slice(LOCAL_PREFIX.length)
  return join(storageRoot(), relative)
}

export async function saveLocalDigitalFile(
  tenantId: string,
  bookId: string,
  body: Buffer
): Promise<string> {
  const relative = join(tenantId, bookId, `${randomUUID()}.bin`)
  const fullPath = join(storageRoot(), relative)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, body)
  return `${LOCAL_PREFIX}${relative.replace(/\\/g, '/')}`
}

export async function readLocalDigitalFile(localId: string): Promise<Buffer> {
  return readFile(pathForId(localId))
}
