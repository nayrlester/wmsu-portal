import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import {
  addDigitizationItemValidator,
  createDigitizationBatchValidator,
  listDigitizationBatchesValidator,
  qaDigitizationItemValidator,
} from '#modules/documents/validators/digitization_receiving'
import { digitizationService } from '#modules/documents/services/digitization_service'

export default class DigitizationController {
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listDigitizationBatchesValidator, {
      data: request.qs(),
    })
    return response.ok(await digitizationService.list(filters))
  }

  async show({ params, response }: HttpContext) {
    return response.ok({ data: await digitizationService.show(params.id) })
  }

  async store({ request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(createDigitizationBatchValidator)
    const data = await digitizationService.create(payload, auth.user!)
    return response.created({ data })
  }

  async addItem({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(addDigitizationItemValidator)
    const data = await digitizationService.addItem(params.id, payload, auth.user!)
    return response.created({ data })
  }

  async ingest({ params, request, auth, response }: HttpContext) {
    const maxSize = `${env.get('FILE_MAX_SIZE_MB') ?? 25}mb`
    const uploaded = [
      ...request.files('pages', { size: maxSize }),
      ...request.files('page', { size: maxSize }),
    ]
    const single = request.file('file', { size: maxSize })
    if (single) uploaded.push(single)

    if (!uploaded.length) {
      return response.badRequest({ error: 'Upload at least one page image or PDF (pages[] / file)' })
    }

    const pages: Array<{ buffer: Buffer; mimeType: string; fileName: string }> = []
    for (const file of uploaded) {
      if (!file.isValid || !file.tmpPath) {
        return response.badRequest({
          error: file.errors?.[0]?.message ?? `Invalid file: ${file.clientName}`,
        })
      }
      pages.push({
        buffer: await readFile(file.tmpPath),
        mimeType: file.type && file.subtype ? `${file.type}/${file.subtype}` : 'application/octet-stream',
        fileName: file.clientName,
      })
    }

    const data = await digitizationService.ingestPages(
      params.id,
      params.itemId,
      pages,
      auth.user!
    )
    return response.ok({ data })
  }

  async runOcr({ params, auth, response }: HttpContext) {
    const data = await digitizationService.markOcrRunning(
      params.id,
      params.itemId,
      auth.user!
    )
    return response.ok({ data })
  }

  async submitQa({ params, request, auth, response }: HttpContext) {
    const payload = await request.validateUsing(qaDigitizationItemValidator)
    const data = await digitizationService.submitQa(params.id, params.itemId, payload, auth.user!)
    return response.ok({ data })
  }

  async complete({ params, auth, response }: HttpContext) {
    const data = await digitizationService.complete(params.id, auth.user!)
    return response.ok({ data })
  }
}
