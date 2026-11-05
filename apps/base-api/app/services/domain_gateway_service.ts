import env from '#start/env'

export type DomainSystem =
  | 'enrollment'
  | 'records'
  | 'finance'
  | 'library'
  | 'inventory'
  | 'documents'
  | 'identity'

const DEFAULT_UPSTREAMS: Record<DomainSystem, string> = {
  identity: 'http://127.0.0.1:3411',
  enrollment: 'http://127.0.0.1:3340',
  library: 'http://127.0.0.1:3341',
  finance: 'http://127.0.0.1:3342',
  documents: 'http://127.0.0.1:3343',
  inventory: 'http://127.0.0.1:3344',
  records: 'http://127.0.0.1:3345',
}

function upstreamFor(system: DomainSystem): string {
  const fromProcess = process.env[`GATEWAY_${system.toUpperCase()}_URL`]
  if (fromProcess?.trim()) return fromProcess.replace(/\/$/, '')
  try {
    const key = `GATEWAY_${system.toUpperCase()}_URL`
    const fromEnv = env.get(key as never) as string | undefined
    if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '')
  } catch {
    // optional keys may throw when unset depending on Env config
  }
  return DEFAULT_UPSTREAMS[system]
}

export class DomainGatewayService {
  catalog() {
    return {
      mode: 'phase1-gateway',
      note: 'Proxies to satellite APIs until modules are absorbed. Identity also exposed as first-class façade under /api/v1/auth|admin|integrations.',
      systems: (Object.keys(DEFAULT_UPSTREAMS) as DomainSystem[]).map((system) => ({
        system,
        upstream: upstreamFor(system),
        modulePath: `app/modules/${system === 'identity' ? 'common-platform' : system}`,
      })),
    }
  }

  async proxy(input: {
    system: DomainSystem
    method: string
    pathSuffix: string
    queryString?: string
    headers: Record<string, string | undefined>
    body?: ArrayBuffer | null
  }) {
    const base = upstreamFor(input.system).replace(/\/$/, '')
    const suffix = input.pathSuffix.replace(/^\//, '')
    const qs = input.queryString ? `?${input.queryString}` : ''
    const url = `${base}/api/v1/${suffix}${qs}`

    const headers: Record<string, string> = {}
    for (const name of ['authorization', 'content-type', 'x-service-api-key', 'idempotency-key']) {
      const value = input.headers[name] ?? input.headers[name.replace(/-/g, '')]
      if (value) headers[name] = value
    }

    const init: RequestInit = {
      method: input.method,
      headers,
    }
    if (input.body && !['GET', 'HEAD'].includes(input.method.toUpperCase())) {
      init.body = Buffer.from(input.body)
    }

    const response = await fetch(url, init)
    const contentType = response.headers.get('content-type') ?? 'application/json'
    const buffer = Buffer.from(await response.arrayBuffer())
    return {
      status: response.status,
      contentType,
      body: buffer,
      upstream: url,
    }
  }
}

export const domainGatewayService = new DomainGatewayService()
