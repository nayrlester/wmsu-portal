export interface UploadObjectInput {
  key: string
  body: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export interface StorageAdapter {
  readonly bucket: string
  upload(input: UploadObjectInput): Promise<void>
  delete(key: string): Promise<void>
  getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
    fileName?: string,
    disposition?: 'inline' | 'attachment'
  ): Promise<string>
  exists(key: string): Promise<boolean>
  read(key: string): Promise<Buffer>
}
