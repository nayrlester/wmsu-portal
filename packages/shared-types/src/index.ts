export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  meta?: Record<string, unknown>
}

export type HealthStatus = 'ok' | 'degraded' | 'down'

export type ComponentHealth = {
  name: string
  status: HealthStatus
  detail?: string
  latencyMs?: number
}

export type PlatformHealth = {
  service: 'wmsu-cis-api'
  status: HealthStatus
  version: string
  components: ComponentHealth[]
  checkedAt: string
}

export type PingResponse = {
  pong: true
  serverTime: string
}
