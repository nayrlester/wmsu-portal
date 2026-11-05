import type { ApiEnvelope, PingResponse, PlatformHealth } from '@wmsu/types'

export type ApiClientOptions = {
  baseUrl: string
  fetchImpl?: typeof fetch
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getHealth(): Promise<ApiEnvelope<PlatformHealth>> {
    return this.getJson('/api/v1/health')
  }

  async getLive(): Promise<ApiEnvelope<{ status: 'alive' }>> {
    return this.getJson('/api/v1/health/live')
  }

  async getPing(): Promise<ApiEnvelope<PingResponse>> {
    return this.getJson('/api/v1/ping')
  }

  private async getJson<T>(path: string): Promise<ApiEnvelope<T>> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`API ${path} failed with HTTP ${response.status}`)
    }
    return (await response.json()) as ApiEnvelope<T>
  }
}

export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient({ baseUrl })
}
