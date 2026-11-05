import client from 'prom-client'

let registry: client.Registry | null = null
let httpRequestDuration: client.Histogram<string> | null = null
let httpRequestTotal: client.Counter<string> | null = null

export function getMetricsRegistry(): client.Registry {
  if (!registry) {
    registry = new client.Registry()
    client.collectDefaultMetrics({ register: registry, prefix: 'cdts_' })

    httpRequestDuration = new client.Histogram({
      name: 'cdts_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [registry],
    })

    httpRequestTotal = new client.Counter({
      name: 'cdts_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [registry],
    })
  }

  return registry
}

export function recordHttpRequest(method: string, route: string, status: number, durationSec: number) {
  getMetricsRegistry()
  const labels = { method, route, status: String(status) }
  httpRequestDuration?.observe(labels, durationSec)
  httpRequestTotal?.inc(labels)
}

/** @internal Test-only reset for isolated metrics assertions */
export function resetMetricsRegistryForTests(): void {
  registry = null
  httpRequestDuration = null
  httpRequestTotal = null
}
