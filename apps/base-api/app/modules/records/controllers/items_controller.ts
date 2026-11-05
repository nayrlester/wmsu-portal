import type { HttpContext } from '@adonisjs/core/http'
import { itemService } from '#modules/records/services/item_service'
import { createItemValidator, updateItemValidator, importItemsValidator } from '#modules/records/validators/uims'

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]!).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

export default class ItemsController {
  async index({ auth, request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 25)
    const categoryId = request.input('categoryId')
    const items = await itemService.listItems(auth.user!.organizationId, page, limit, categoryId)
    return response.ok({ data: items.all(), meta: items.getMeta() })
  }

  async show({ auth, params, response }: HttpContext) {
    const item = await itemService.getItem(auth.user!.organizationId, params.id)
    return response.ok({ data: item })
  }

  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createItemValidator)
    const item = await itemService.createItem(auth.user!.organizationId, data)
    return response.created({ data: item })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateItemValidator)
    const item = await itemService.updateItem(auth.user!.organizationId, params.id, data)
    return response.ok({ data: item })
  }

  async destroy({ auth, params, response }: HttpContext) {
    await itemService.deleteItem(auth.user!.organizationId, params.id)
    return response.noContent()
  }

  async importCsv({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(importItemsValidator)
    const rows = parseCsv(data.csv)
    if (!rows.length) {
      return response.badRequest({ error: 'CSV must include a header row and at least one data row' })
    }
    if (rows.length > 2000) {
      return response.badRequest({ error: 'CSV import limited to 2000 rows per request' })
    }
    const result = await itemService.importCsv(auth.user!.organizationId, rows)
    return response.ok({ data: result })
  }
}
