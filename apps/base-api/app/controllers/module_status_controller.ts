import type { HttpContext } from '@adonisjs/core/http'
import { enrollmentModuleMeta } from '../modules/enrollment/register_routes.js'
import { financeModuleMeta } from '../modules/finance/register_routes.js'
import { recordsModuleMeta } from '../modules/records/register_routes.js'
import { libraryModuleMeta } from '../modules/library/register_routes.js'
import { documentsModuleMeta } from '../modules/documents/register_routes.js'
import { inventoryModuleMeta } from '../modules/inventory/register_routes.js'

const META = {
  enrollment: enrollmentModuleMeta,
  finance: financeModuleMeta,
  records: recordsModuleMeta,
  library: libraryModuleMeta,
  documents: documentsModuleMeta,
  inventory: inventoryModuleMeta,
} as const

type ModuleName = keyof typeof META

function moduleFromUrl(url: string, kind: '_status' | '_health'): ModuleName | null {
  const match = url.match(new RegExp(`/api/v1/([^/]+)/\\${kind}`))
  const name = match?.[1] as ModuleName | undefined
  return name && name in META ? name : null
}

export default class ModuleStatusController {
  async status(ctx: HttpContext) {
    const name = moduleFromUrl(ctx.request.url(), '_status')
    if (!name) {
      return ctx.response.notFound({ success: false, message: 'Unknown module status route' })
    }
    const meta = META[name]
    return ctx.response.ok({
      success: true,
      message: `${meta.name} module status`,
      data: {
        ...meta,
        mode: 'in-process',
        note: 'Domain code absorbed into Base API app/modules; routes registered in-process.',
      },
    })
  }

  async health(ctx: HttpContext) {
    const name = moduleFromUrl(ctx.request.url(), '_health')
    if (!name) {
      return ctx.response.notFound({ success: false, message: 'Unknown module health route' })
    }
    const meta = META[name]
    return ctx.response.ok({
      success: true,
      message: `${meta.name} in-process healthy`,
      data: {
        ok: true,
        mode: 'in-process',
        prefix: meta.prefix,
        schema: meta.schema,
      },
    })
  }
}
