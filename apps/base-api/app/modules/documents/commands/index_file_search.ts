import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentFile from '#modules/documents/models/document_file'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { fileSearchIndexService } from '#modules/documents/services/file_search_index_service'

export default class IndexFileSearch extends BaseCommand {
  static commandName = 'index:file-search'
  static description = 'Extract searchable text from uploaded document files (backfill for content search)'

  @args.string({ description: 'Optional tenant ID to limit indexing', required: false })
  declare tenantId?: string

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const query = DocumentFile.query().whereNull('deleted_at').orderBy('created_at', 'asc')

    if (this.tenantId) {
      query.where('tenant_id', this.tenantId)
    }

    const files = await query
    let indexed = 0
    let skipped = 0
    let failed = 0

    for (const file of files) {
      const metadata = file.extractedMetadata as { searchText?: string } | null
      if (metadata?.searchText?.trim()) {
        skipped++
        continue
      }

      try {
        const result = await tenantContext.run({ tenantId: file.tenantId }, async () =>
          fileSearchIndexService.indexFromStorage(file)
        )

        if (result.indexed) {
          indexed++
          this.logger.info(`Indexed ${file.originalName} (${result.textLength} chars)`)
        } else {
          skipped++
        }
      } catch (error) {
        failed++
        const message = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed ${file.originalName}: ${message}`)
      }
    }

    this.logger.info(`Done. Indexed=${indexed}, skipped=${skipped}, failed=${failed}`)
  }
}
