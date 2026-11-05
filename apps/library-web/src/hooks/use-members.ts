import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMembers,
  fetchMember,
  fetchPendingMembers,
  createMember,
  updateMember,
  deleteMember,
  approveMember,
  rejectMember,
  fetchMemberCard,
} from '@/lib/members-api'
import type { CreateMemberPayload, MemberListParams, UpdateMemberPayload } from '@/types/members'

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: MemberListParams) => [...memberKeys.lists(), params] as const,
  pending: () => [...memberKeys.all, 'pending'] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  card: (id: string) => [...memberKeys.all, 'card', id] as const,
}

export function useMembers(params: MemberListParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => fetchMembers(params),
  })
}

export function usePendingMembers() {
  return useQuery({
    queryKey: memberKeys.pending(),
    queryFn: fetchPendingMembers,
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => fetchMember(id),
    enabled: !!id,
  })
}

export function useMemberCard(id: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.card(id),
    queryFn: () => fetchMemberCard(id),
    enabled: !!id && enabled,
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMemberPayload) => createMember(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      qc.invalidateQueries({ queryKey: memberKeys.pending() })
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMemberPayload }) =>
      updateMember(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      qc.invalidateQueries({ queryKey: memberKeys.detail(id) })
      qc.invalidateQueries({ queryKey: memberKeys.pending() })
    },
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      qc.invalidateQueries({ queryKey: memberKeys.pending() })
    },
  })
}

export function useApproveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveMember(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      qc.invalidateQueries({ queryKey: memberKeys.detail(id) })
      qc.invalidateQueries({ queryKey: memberKeys.pending() })
    },
  })
}

export function useRejectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectMember(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() })
      qc.invalidateQueries({ queryKey: memberKeys.detail(id) })
      qc.invalidateQueries({ queryKey: memberKeys.pending() })
    },
  })
}
