import env from '#start/env'

export type PandadocRecipient = {
  email: string
  first_name?: string
  last_name?: string
  role?: string
}

export type PandadocCreateDocumentResult = {
  id: string
  status: string
  name?: string
}

export type PandadocDocumentDetails = {
  id: string
  status: string
  name?: string
  recipients?: Array<{
    id: string
    email: string
    first_name?: string
    last_name?: string
    role?: string
  }>
  // Some payloads nest page count under version_info / content
  version_info?: { number_of_pages?: number }
}

export type PandadocSessionResult = {
  id: string
  expires_at?: string
}

export type PandadocEditingSessionResult = {
  id: string
  email?: string
  expires_at?: string
  token: string
  document_id?: string
}

export type PandadocDocumentFieldsResult = {
  fields?: Array<{
    uuid?: string
    name?: string
    type?: string
    assignee?: string
    [key: string]: unknown
  }>
}

export class PandadocClientError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly body?: unknown
  ) {
    super(message)
    this.name = 'PandadocClientError'
  }
}

export class PandadocClient {
  private get apiKey(): string {
    return env.get('PANDADOC_API_KEY')?.trim() ?? ''
  }

  private get baseUrl(): string {
    return (env.get('PANDADOC_API_BASE_URL') ?? 'https://api.pandadoc.com').replace(/\/$/, '')
  }

  isConfigured(): boolean {
    const enabled = env.get('PANDADOC_ENABLED')
    if (enabled === false) return false
    return Boolean(this.apiKey)
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `API-Key ${this.apiKey}`,
      ...extra,
    }
  }

  async createDocumentFromFile(input: {
    name: string
    fileName: string
    fileBuffer: Buffer
    mimeType: string
    recipients: PandadocRecipient[]
    metadata?: Record<string, string>
  }): Promise<PandadocCreateDocumentResult> {
    const form = new FormData()
    const bytes = new Uint8Array(input.fileBuffer)
    const blob = new Blob([bytes], { type: input.mimeType })
    form.append('file', blob, input.fileName)
    form.append(
      'data',
      JSON.stringify({
        name: input.name,
        recipients: input.recipients.map((r) => ({
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          role: r.role ?? 'Signer',
        })),
        parse_form_fields: false,
        metadata: input.metadata ?? {},
      })
    )

    const response = await fetch(`${this.baseUrl}/public/v1/documents`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
    })

    return this.parseJson(response)
  }

  async getDocument(documentId: string): Promise<PandadocCreateDocumentResult> {
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}`, {
      method: 'GET',
      headers: this.headers({ 'Content-Type': 'application/json' }),
    })
    return this.parseJson(response)
  }

  async getDocumentDetails(documentId: string): Promise<PandadocDocumentDetails> {
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}/details`, {
      method: 'GET',
      headers: this.headers({ 'Content-Type': 'application/json' }),
    })
    return this.parseJson(response)
  }

  /**
   * Place a required signature field for a recipient on a draft document.
   * Uploaded PDFs have no fields by default — without this, recipients cannot complete signing.
   * Anchored to the bottom of the last page so it does not sit over mid-page body text.
   */
  async createSignatureField(
    documentId: string,
    input: { recipientId: string; page?: number }
  ): Promise<unknown> {
    const page = Math.max(1, input.page ?? 1)
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}/fields`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        fields: [
          {
            type: 'signature',
            field_id: 'doctrack_signature',
            assigned_to: input.recipientId,
            settings: { required: true },
            layout: {
              page,
              position: {
                // From bottom-left — keeps the box in the page footer area
                offset_x: 72,
                offset_y: 36,
                anchor_point: 'bottomleft',
              },
              style: {
                width: 220,
                height: 56,
              },
            },
          },
          {
            type: 'date',
            field_id: 'doctrack_signed_date',
            assigned_to: input.recipientId,
            settings: { required: false },
            layout: {
              page,
              position: {
                offset_x: 320,
                offset_y: 48,
                anchor_point: 'bottomleft',
              },
              style: {
                width: 140,
                height: 28,
              },
            },
          },
        ],
      }),
    })
    return this.parseJson(response)
  }

  async waitUntilDraft(documentId: string, options?: { timeoutMs?: number; intervalMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 90_000
    const intervalMs = options?.intervalMs ?? 1_000
    const started = Date.now()

    while (Date.now() - started < timeoutMs) {
      const doc = await this.getDocument(documentId)
      if (doc.status === 'document.draft') {
        return doc
      }
      if (doc.status === 'document.error') {
        throw new PandadocClientError(`PandaDoc document entered error state: ${documentId}`)
      }
      // document.uploaded / document.draft.processing — keep polling
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new PandadocClientError(`Timed out waiting for PandaDoc document.draft: ${documentId}`)
  }

  async sendDocument(
    documentId: string,
    options?: { silent?: boolean; subject?: string; message?: string }
  ): Promise<PandadocCreateDocumentResult> {
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}/send`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        silent: options?.silent ?? true,
        subject: options?.subject,
        message: options?.message,
      }),
    })
    return this.parseJson(response)
  }

  async createSession(documentId: string, recipientEmail: string): Promise<PandadocSessionResult> {
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}/session`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        recipient: recipientEmail,
        lifetime: 86_400,
      }),
    })
    return this.parseJson(response)
  }

  /**
   * E-Token for Embedded Editor / Embedded Sending (field placement before send).
   * Email should be a PandaDoc workspace member (see PANDADOC_EDITOR_EMAIL).
   */
  async createEditingSession(
    documentId: string,
    email: string,
    lifetimeSeconds = 3_600
  ): Promise<PandadocEditingSessionResult> {
    const response = await fetch(
      `${this.baseUrl}/public/v1/documents/${documentId}/editing-sessions`,
      {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email,
          lifetime: lifetimeSeconds,
        }),
      }
    )
    return this.parseJson(response)
  }

  /** List fields on a document (used to ensure a signature was placed before send). */
  async listFields(documentId: string): Promise<PandadocDocumentFieldsResult> {
    const response = await fetch(`${this.baseUrl}/public/v1/documents/${documentId}/fields`, {
      method: 'GET',
      headers: this.headers({ 'Content-Type': 'application/json' }),
    })
    return this.parseJson(response)
  }

  async downloadCompletedPdf(documentId: string): Promise<Buffer> {
    const response = await fetch(
      `${this.baseUrl}/public/v1/documents/${documentId}/download`,
      {
        method: 'GET',
        headers: this.headers(),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw new PandadocClientError(`PandaDoc download failed (${response.status})`, response.status, text)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  verifyWebhookAuthorization(authorizationHeader: string | undefined): boolean {
    const secret = env.get('PANDADOC_WEBHOOKS_SECRET')
    if (!secret) {
      return false
    }
    if (!authorizationHeader) {
      return false
    }
    const value = authorizationHeader.replace(/^Bearer\s+/i, '').trim()
    return value === secret
  }

  private formatErrorDetail(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return typeof body === 'string' && body.trim() ? body.trim() : null
    }
    const record = body as Record<string, unknown>
    if (typeof record.info_message === 'string' && record.info_message.trim()) {
      return record.info_message.trim()
    }
    if (typeof record.detail === 'string' && record.detail.trim()) {
      return record.detail.trim()
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim()
    }
    return null
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }

    if (!response.ok) {
      const detail = this.formatErrorDetail(body)
      throw new PandadocClientError(
        detail
          ? `PandaDoc API error (${response.status}): ${detail}`
          : `PandaDoc API error (${response.status})`,
        response.status,
        body
      )
    }

    return body as T
  }
}

export const pandadocClient = new PandadocClient()
