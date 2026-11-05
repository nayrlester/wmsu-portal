export type HttpJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number | null; error: string; unavailable: boolean }

export async function fetchJson<T>(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
    timeoutMs?: number
  } = {}
): Promise<HttpJsonResult<T>> {
  const timeoutMs = options.timeoutMs ?? 8_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        return {
          ok: false,
          status: res.status,
          error: 'Invalid JSON response from external service',
          unavailable: false,
        }
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `External service returned HTTP ${res.status}`,
        unavailable: res.status >= 500 || res.status === 408 || res.status === 429,
      }
    }

    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'External request failed'
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      status: null,
      error: aborted ? `External service timeout after ${timeoutMs}ms` : message,
      unavailable: true,
    }
  } finally {
    clearTimeout(timer)
  }
}
