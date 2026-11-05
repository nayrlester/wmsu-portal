import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveBorrowing,
  checkoutBorrowing,
  directCheckout,
  fetchBorrowingDashboard,
  fetchBorrowings,
  markBorrowingLost,
  renewBorrowing,
  requestBorrow,
  returnBorrowing,
} from '@/lib/borrowings-api'
import { bookKeys } from '@/hooks/use-books'
import type { BorrowingListParams, DirectCheckoutPayload, RequestBorrowPayload } from '@/types/borrowings'

export function useBorrowingDashboard() {
  return useQuery({
    queryKey: ['borrowings', 'dashboard'],
    queryFn: fetchBorrowingDashboard,
  })
}

export function useBorrowings(params: BorrowingListParams) {
  return useQuery({
    queryKey: ['borrowings', params],
    queryFn: () => fetchBorrowings(params),
  })
}

export function useRequestBorrow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RequestBorrowPayload) => requestBorrow(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrowings'] })
    },
  })
}

export function useApproveBorrowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, copyId }: { id: string; copyId?: string }) => approveBorrowing(id, copyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borrowings'] }),
  })
}

export function useCheckoutBorrowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => checkoutBorrowing(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borrowings'] }),
  })
}

export function useDirectCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: DirectCheckoutPayload) => directCheckout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrowings'] })
      qc.invalidateQueries({ queryKey: bookKeys.all })
    },
  })
}

export function useReturnBorrowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => returnBorrowing(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrowings'] })
      qc.invalidateQueries({ queryKey: ['fines'] })
    },
  })
}

export function useMarkBorrowingLost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markBorrowingLost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrowings'] })
      qc.invalidateQueries({ queryKey: ['fines'] })
    },
  })
}

export function useRenewBorrowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => renewBorrowing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrowings'] })
      qc.invalidateQueries({ queryKey: ['portal'] })
    },
  })
}
