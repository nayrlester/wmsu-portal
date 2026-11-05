import logger from '@adonisjs/core/services/logger'
import Tenant from '#modules/documents/models/tenant'
import User from '#modules/documents/models/user'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import {
  documentHubService,
  type PlatformDocumentDto,
} from '#modules/documents/services/document_hub_service'
import type { PlatformDocumentPrefix } from '#modules/documents/models/platform_document'

/**
 * Browser-facing platform documents — reads the local CDTS hub catalog.
 * (No outbound PLATFORM_DOCUMENTS_URL dual-write.)
 */
export class PlatformDocumentsService {
  private async resolveOrgId(userId?: string): Promise<{ orgId: string; uploadedBy: string }> {
    const tenantId = tenantContext.requireTenantId()
    const tenant = await Tenant.findOrFail(tenantId)
    if (!tenant.platformOrganizationId) {
      throw new Error('Tenant is not linked to a platform organization')
    }
    let uploadedBy = 'system'
    if (userId) {
      const user = await User.find(userId)
      uploadedBy = user?.platformUserId ?? `doctrack-user:${userId}`
    }
    return { orgId: tenant.platformOrganizationId, uploadedBy }
  }

  async list(input: {
    userId: string
    platformPrefix?: PlatformDocumentPrefix
    limit?: number
    offset?: number
  }) {
    const { orgId } = await this.resolveOrgId(input.userId)
    return documentHubService.list({
      orgId,
      platformPrefix: input.platformPrefix,
      limit: input.limit,
      offset: input.offset,
    })
  }

  async download(input: { userId: string; id: string }) {
    const { orgId } = await this.resolveOrgId(input.userId)
    return documentHubService.getDownload({ orgId, id: input.id })
  }

  /**
   * Record a native DocTrack upload into the local hub catalog (canonical store).
   * Replaces the old outbound dual-write to an external document service.
   */
  async dualWriteUpload(input: {
    userId: string
    documentId: string
    fileName: string
    contentType: string
    body: Buffer
  }): Promise<PlatformDocumentDto | null> {
    try {
      const { orgId, uploadedBy } = await this.resolveOrgId(input.userId)
      return await documentHubService.recordDoctrackUpload({
        orgId,
        uploadedBy,
        documentId: input.documentId,
        fileName: input.fileName,
        contentType: input.contentType,
        body: input.body,
      })
    } catch (error) {
      logger.error(
        { err: error, documentId: input.documentId },
        'Platform hub catalog write failed (DocTrack local file kept)'
      )
      return null
    }
  }
}

export const platformDocumentsService = new PlatformDocumentsService()
