import type { AxiosResponse } from 'axios'
import { normalizeAxiosError } from '@/api/errors/api-error'

/** Unwrap Axios response — errors are normalized by interceptors */
export async function apiRequest<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await promise
    return response.data
  } catch (error) {
    throw normalizeAxiosError(error)
  }
}

/** React Query-friendly void mutation helper */
export async function apiRequestVoid(promise: Promise<AxiosResponse<unknown>>): Promise<void> {
  await apiRequest(promise)
}
