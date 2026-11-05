import app from '@adonisjs/core/services/app'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import env from '#start/env'
import type { StorageAdapter, UploadObjectInput } from '#modules/documents/infrastructure/storage/storage_adapter'

export class LocalStorageAdapter implements StorageAdapter {
  readonly bucket = 'local-private'
  private root = app.makePath('storage/private')

  async upload(input: UploadObjectInput): Promise<void> {
    const filePath = this.resolvePath(input.key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, input.body)
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key)
    try {
      await unlink(filePath)
    } catch {
      // ignore missing files during cleanup
    }
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
    fileName?: string,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): Promise<string> {
    const baseUrl = env.get('APP_URL').replace(/\/$/, '')
    const params = new URLSearchParams({
      key,
      expires: String(Math.floor(Date.now() / 1000) + expiresInSeconds),
    })
    if (fileName) params.set('filename', fileName)
    if (disposition === 'inline') params.set('disposition', 'inline')
    return `${baseUrl}/api/v1/internal/files/download?${params.toString()}`
  }

  async exists(key: string): Promise<boolean> {
    try {
      await readFile(this.resolvePath(key))
      return true
    } catch {
      return false
    }
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key))
  }

  resolvePath(key: string): string {
    return join(this.root, key)
  }
}
