import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collectFine,
  createManualFine,
  fetchFineSummary,
  fetchFines,
  waiveFine,
} from '@/lib/fines-api'
import type { CollectFinePayload, CreateManualFinePayload, FineListParams, WaiveFinePayload } from '@/types/fines'

export function useFineSummary(enabled = true) {
  return useQuery({
    queryKey: ['fines', 'summary'],
    queryFn: fetchFineSummary,
    enabled,
  })
}

export function useFines(params: FineListParams) {
  return useQuery({
    queryKey: ['fines', params],
    queryFn: () => fetchFines(params),
  })
}

export function useCreateManualFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateManualFinePayload) => createManualFine(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
  })
}

export function useWaiveFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WaiveFinePayload }) => waiveFine(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
  })
}

export function useCollectFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CollectFinePayload }) =>
      collectFine(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
  })
}
