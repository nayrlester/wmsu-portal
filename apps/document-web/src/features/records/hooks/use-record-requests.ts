import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  recordRequestsApi,
  type CreateRecordRequestInput,
} from '@/api/modules/record-requests.api'

const KEY = 'record-requests'

export function useRecordRequests(params?: {
  status?: string
  mine?: boolean
  overdue?: boolean
  page?: number
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => recordRequestsApi.list(params),
  })
}

export function useRecordRequest(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => recordRequestsApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreateRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRecordRequestInput) => recordRequestsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useApproveRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recordRequestsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDenyRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      recordRequestsApi.deny(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useReleaseRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      itemIds?: string[]
      notes?: string
      dueAt?: string
    }) => recordRequestsApi.release(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useReturnRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      itemIds?: string[]
      notes?: string
    }) => recordRequestsApi.returnItems(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useCancelRecordRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      recordRequestsApi.cancel(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
