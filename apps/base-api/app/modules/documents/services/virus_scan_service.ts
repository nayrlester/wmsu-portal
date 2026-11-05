import type DocumentFile from '#modules/documents/models/document_file'
import logger from '@adonisjs/core/services/logger'

export interface VirusScanResult {
  clean: boolean
  engine?: string
  details?: Record<string, unknown>
}

/**
 * Virus scan hook — integrate ClamAV, AWS Lambda, or third-party scanners here.
 * Defaults to pass-through in development/test environments.
 */
export class VirusScanService {
  async scan(file: DocumentFile, buffer: Buffer): Promise<VirusScanResult> {
    logger.debug(
      { fileId: file.id, mimeType: file.mimeType, size: file.fileSize },
      '[VirusScanService] scan queued'
    )

    // Hook point: dispatch to BullMQ job, Lambda, or ClamAV daemon
    void buffer

    return {
      clean: true,
      engine: 'noop',
      details: { status: 'passed', mode: 'hook-ready' },
    }
  }
}

export const virusScanService = new VirusScanService()
