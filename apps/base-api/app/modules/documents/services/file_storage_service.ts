import app from '@adonisjs/core/services/app'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import env from '#start/env'
import { planLimitService } from '#modules/documents/services/plan_limit_service'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_LOGO_BYTES = 2 * 1024 * 1024

export class FileStorageService {
  private tenantStorageRoot(): string {
    return app.makePath('storage/tenants')
  }

  async storeTenantLogo(tenantId: string, file: MultipartFile): Promise<string> {
    if (!file.isValid) {
      throw new Error(`Invalid file: ${file.errors.map((e) => e.message).join(', ')}`)
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type ?? '')) {
      throw new Error('Logo must be PNG, JPEG, WebP, or SVG')
    }

    if ((file.size ?? 0) > MAX_LOGO_BYTES) {
      throw new Error('Logo must be 2MB or smaller')
    }

    await planLimitService.assertCanUploadBytes(tenantId, file.size ?? 0)

    const ext = file.extname ?? 'png'
    const filename = `logo-${randomUUID()}.${ext}`
    const tenantDir = join(this.tenantStorageRoot(), tenantId)
    await mkdir(tenantDir, { recursive: true })

    await file.move(tenantDir, { name: filename, overwrite: true })

    const relativePath = `/uploads/tenants/${tenantId}/${filename}`
    const baseUrl = env.get('APP_URL').replace(/\/$/, '')
    return `${baseUrl}${relativePath}`
  }
}

export const fileStorageService = new FileStorageService()
