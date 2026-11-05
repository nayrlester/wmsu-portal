import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { digitizationApi, receivingApi } from '@/api/modules/digitization-receiving.api'

const DIG_KEY = 'digitization-batches'
const RCP_KEY = 'receiving-receipts'

export function useDigitizationBatches(params?: { status?: string }) {
  return useQuery({
    queryKey: [DIG_KEY, params],
    queryFn: () => digitizationApi.list(params),
  })
}

export function useDigitizationBatch(id: string | undefined) {
  return useQuery({
    queryKey: [DIG_KEY, id],
    queryFn: () => digitizationApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreateDigitizationBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; notes?: string }) => digitizationApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DIG_KEY] }),
  })
}

export function useDigitizationMutations(batchId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: [DIG_KEY, batchId] })

  return {
    addItem: useMutation({
      mutationFn: (payload: {
        label: string
        documentId?: string
        physicalBoxId?: string
        physicalFolderId?: string
      }) => digitizationApi.addItem(batchId, payload),
      onSuccess: invalidate,
    }),
    runOcr: useMutation({
      mutationFn: (itemId: string) => digitizationApi.runOcr(batchId, itemId),
      onSuccess: invalidate,
    }),
    ingest: useMutation({
      mutationFn: ({ itemId, files }: { itemId: string; files: File[] }) =>
        digitizationApi.ingest(batchId, itemId, files),
      onSuccess: invalidate,
    }),
    submitQa: useMutation({
      mutationFn: ({
        itemId,
        ...payload
      }: {
        itemId: string
        ocrQaStatus: string
        qaNotes?: string
        physicalBoxId?: string
        physicalFolderId?: string
        checklist?: Array<{ key: string; done: boolean }>
      }) => digitizationApi.submitQa(batchId, itemId, payload),
      onSuccess: invalidate,
    }),
    complete: useMutation({
      mutationFn: () => digitizationApi.complete(batchId),
      onSuccess: () => {
        invalidate()
        qc.invalidateQueries({ queryKey: [DIG_KEY] })
      },
    }),
  }
}

export function useReceivingReceipts(params?: { date?: string; channel?: string }) {
  return useQuery({
    queryKey: [RCP_KEY, params],
    queryFn: () => receivingApi.list(params),
  })
}

export function useReceivingReceipt(id: string | undefined) {
  return useQuery({
    queryKey: [RCP_KEY, id],
    queryFn: () => receivingApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreateReceivingReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => receivingApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RCP_KEY] }),
  })
}

export function useRegisterReceivingReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; documentId?: string; createDocument?: boolean }) =>
      receivingApi.register(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [RCP_KEY] })
      qc.invalidateQueries({ queryKey: [RCP_KEY, vars.id] })
    },
  })
}
