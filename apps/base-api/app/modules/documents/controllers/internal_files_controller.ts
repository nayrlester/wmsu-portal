import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { mimeFromExtension } from '#modules/documents/domain/files/file_constants'
import { LocalStorageAdapter } from '#infrastructure/storage/local_storage_adapter'
import { getStorageAdapter } from '#infrastructure/storage/storage_factory'

export default class InternalFilesController {
  async download({ request, response }: HttpContext) {
    if (!app.inTest && !app.inDev) {
      return response.forbidden({ error: 'Direct download route is disabled in production' })
    }

    const key = request.input('key')
    const expires = Number(request.input('expires'))
    const fileName = request.input('filename')
    const disposition = request.input('disposition') === 'inline' ? 'inline' : 'attachment'

    if (!key || !expires || expires < Math.floor(Date.now() / 1000)) {
      return response.forbidden({ error: 'Download link expired or invalid' })
    }

    const adapter = getStorageAdapter()
    if (!(adapter instanceof LocalStorageAdapter)) {
      return response.badRequest({ error: 'Direct download is only available for local storage' })
    }

    if (disposition === 'inline') {
      const filePath = adapter.resolvePath(key)
      const buffer = await readFile(filePath)
      const extension = extname(String(fileName ?? key))
      const mimeType = mimeFromExtension(extension) ?? 'application/octet-stream'

      response.header('Content-Type', String(mimeType))
      if (fileName) {
        response.header(
          'Content-Disposition',
          `inline; filename="${String(fileName).replace(/"/g, '')}"`
        )
      }
      return response.send(buffer)
    }

    return response.download(adapter.resolvePath(key))
  }
}
