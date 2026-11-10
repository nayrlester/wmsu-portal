import logger from '@adonisjs/core/services/logger'
import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract'
import env from '#start/env'
import type { OcrExtractInput, OcrProvider } from '#modules/documents/domain/intelligence/ocr_provider'

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg'])

export class TextractOcrProvider implements OcrProvider {
  readonly name = 'textract'
  private client: TextractClient | null = null

  isConfigured(): boolean {
    return Boolean(
      env.get('AWS_ACCESS_KEY_ID') &&
        env.get('AWS_SECRET_ACCESS_KEY') &&
        env.get('AWS_REGION') &&
        env.get('AWS_S3_BUCKET')
    )
  }

  async extractText(input: OcrExtractInput) {
    if (!this.isConfigured()) {
      throw new Error('AWS Textract is not configured')
    }

    const client = this.getClient()
    const bucket = env.get('AWS_S3_BUCKET')!
    const useS3 = input.bucket === bucket || input.bucket === 'local-private'

    let command: DetectDocumentTextCommand

    if (useS3 && input.bucket === bucket) {
      command = new DetectDocumentTextCommand({
        Document: {
          S3Object: { Bucket: input.bucket, Name: input.key },
        },
      })
    } else if (input.fileBuffer && IMAGE_MIMES.has(input.mimeType)) {
      command = new DetectDocumentTextCommand({
        Document: { Bytes: input.fileBuffer },
      })
    } else if (input.bucket === bucket) {
      command = new DetectDocumentTextCommand({
        Document: {
          S3Object: { Bucket: bucket, Name: input.key },
        },
      })
    } else {
      throw new Error('Textract requires S3 storage or image bytes for OCR')
    }

    const response = await client.send(command)
    const lines =
      response.Blocks?.filter((block) => block.BlockType === 'LINE' && block.Text)
        .map((block) => block.Text!)
        .join('\n') ?? ''

    logger.info({ provider: this.name, charCount: lines.length }, '[OCR] Textract extraction complete')

    return {
      text: lines,
      provider: this.name,
      confidence: this.averageConfidence(response.Blocks ?? []),
    }
  }

  private getClient(): TextractClient {
    if (!this.client) {
      this.client = new TextractClient({
        region: env.get('AWS_REGION')!,
        credentials: {
          accessKeyId: env.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY')!,
        },
      })
    }
    return this.client
  }

  private averageConfidence(blocks: Array<{ Confidence?: number }>): number | undefined {
    const scores = blocks
      .map((block) => block.Confidence)
      .filter((value): value is number => typeof value === 'number')

    if (scores.length === 0) return undefined
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }
}

export const textractOcrProvider = new TextractOcrProvider()
