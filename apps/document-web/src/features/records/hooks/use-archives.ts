import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archivesApi } from '@/api/modules/archives.api'

const TRANSFER_KEY = 'archival-transfers'
const DISPOSAL_KEY = 'disposal-requests'

export function useArchivalTransfers(params?: { status?: string }) {
  return useQuery({
    queryKey: [TRANSFER_KEY, params],
    queryFn: () => archivesApi.listTransfers(params),
  })
}

export function useDisposalRequests(params?: { status?: string }) {
  return useQuery({
    queryKey: [DISPOSAL_KEY, params],
    queryFn: () => archivesApi.listDisposals(params),
  })
}

export function useArchivesMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [TRANSFER_KEY] })
    qc.invalidateQueries({ queryKey: [DISPOSAL_KEY] })
  }

  return {
    createTransfer: useMutation({
      mutationFn: archivesApi.createTransfer,
      onSuccess: invalidate,
    }),
    approveTransfer: useMutation({
      mutationFn: (id: string) => archivesApi.approveTransfer(id),
      onSuccess: invalidate,
    }),
    completeTransfer: useMutation({
      mutationFn: (id: string) => archivesApi.completeTransfer(id),
      onSuccess: invalidate,
    }),
    createDisposal: useMutation({
      mutationFn: archivesApi.createDisposal,
      onSuccess: invalidate,
    }),
    approveDisposal: useMutation({
      mutationFn: (id: string) => archivesApi.approveDisposal(id),
      onSuccess: invalidate,
    }),
    executeDisposal: useMutation({
      mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
        archivesApi.executeDisposal(id, notes),
      onSuccess: invalidate,
    }),
    setLegalHold: useMutation({
      mutationFn: ({
        documentId,
        ...payload
      }: {
        documentId: string
        hold: boolean
        reason: string
      }) => archivesApi.setLegalHold(documentId, payload),
      onSuccess: (_data, vars) => {
        qc.invalidateQueries({ queryKey: ['documents'] })
        qc.invalidateQueries({ queryKey: ['document', vars.documentId] })
      },
    }),
  }
}
