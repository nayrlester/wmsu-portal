import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import env from '#start/env'
import type { StorageAdapter, UploadObjectInput } from '#modules/documents/infrastructure/storage/storage_adapter'

export class S3StorageAdapter implements StorageAdapter {
  readonly bucket: string
  private client: S3Client
  private readonly publicCdnUrl: string | null
  private readonly isR2: boolean

  constructor() {
    const bucket = env.get('AWS_S3_BUCKET')
    const endpoint = env.get('S3_ENDPOINT')
    const region = env.get('AWS_REGION') ?? (endpoint ? 'auto' : undefined)

    if (!bucket || !region) {
      throw new Error('Object storage is not configured (AWS_S3_BUCKET + AWS_REGION or S3_ENDPOINT)')
    }

    this.bucket = bucket
    this.isR2 = Boolean(endpoint?.includes('r2.cloudflarestorage.com'))
    this.publicCdnUrl = env.get('S3_PUBLIC_CDN_URL')?.replace(/\/$/, '') ?? null

    // AWS SDK v3.729+ sends flexible checksum headers that R2 does not implement yet.
    const r2ChecksumConfig = this.isR2
      ? {
          requestChecksumCalculation: 'WHEN_REQUIRED' as const,
          responseChecksumValidation: 'WHEN_REQUIRED' as const,
        }
      : {}

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY')!,
      },
      ...r2ChecksumConfig,
    })
  }

  async upload(input: UploadObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
        ...(this.isR2 ? {} : { ServerSideEncryption: 'AES256' }),
      })
    )
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
    fileName?: string,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): Promise<string> {
    // Public CDN objects (e.g. tenant logos) — bucket path must allow public read on the custom domain
    if (this.publicCdnUrl && key.startsWith('public/')) {
      const url = `${this.publicCdnUrl}/${key}`
      if (!fileName) return url
      const params = new URLSearchParams({
        'response-content-disposition': `${disposition}; filename="${fileName.replace(/"/g, '')}"`,
      })
      return `${url}?${params.toString()}`
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: fileName
        ? `${disposition}; filename="${fileName.replace(/"/g, '')}"`
        : undefined,
    })

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async read(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )

    const body = response.Body
    if (!body) {
      throw new Error('S3 object body is empty')
    }

    return Buffer.from(await body.transformToByteArray())
  }
}
