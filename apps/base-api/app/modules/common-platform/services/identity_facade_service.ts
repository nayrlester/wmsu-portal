function identityBaseUrl(): string {
  return (
    process.env.GATEWAY_IDENTITY_URL ||
    process.env.PLATFORM_IDENTITY_URL ||
    'http://127.0.0.1:3411'
  ).replace(/\/$/, '')
}

export type ProxyResult = {
  status: number
  contentType: string
  body: Buffer
  upstream: string
}

export class IdentityFacadeService {
  upstream() {
    return identityBaseUrl()
  }

  status() {
    return {
      phase: 'phase1-identity-facade',
      module: 'common-platform',
      schemaTarget: 'common',
      identityUpstream: this.upstream(),
      note: 'Base API exposes identity contracts; engine remains wmsu-api until common absorb.',
      entrypoints: {
        auth: '/api/v1/auth',
        admin: '/api/v1/admin',
        integrations: '/api/v1/integrations',
        jwks: '/.well-known/jwks.json',
        status: '/api/v1/platform/status',
        launcher: '/api/v1/platform/launcher',
      },
    }
  }

  async proxy(input: {
    absolutePath: string
    method: string
    queryString?: string
    headers: Record<string, string | undefined>
    body?: Buffer | null
  }): Promise<ProxyResult> {
    const qs = input.queryString ? `?${input.queryString}` : ''
    const url = `${this.upstream()}${input.absolutePath}${qs}`

    const headers: Record<string, string> = {}
    for (const name of [
      'authorization',
      'content-type',
      'x-service-api-key',
      'idempotency-key',
      'accept',
    ]) {
      const value = input.headers[name]
      if (value) headers[name] = value
    }

    const init: RequestInit = { method: input.method, headers }
    if (input.body && !['GET', 'HEAD'].includes(input.method.toUpperCase())) {
      init.body = input.body
    }

    const response = await fetch(url, init)
    return {
      status: response.status,
      contentType: response.headers.get('content-type') || 'application/json',
      body: Buffer.from(await response.arrayBuffer()),
      upstream: this.upstream(),
    }
  }
}

export const identityFacadeService = new IdentityFacadeService()
