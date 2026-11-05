import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, inviteUser, updateUser } from '@/lib/users-api'
import type { InviteUserPayload, UpdateUserPayload } from '@/types/users'

export const userKeys = {
  all: ['staff-users'] as const,
  list: (params: { page?: number; perPage?: number }) => [...userKeys.all, 'list', params] as const,
}

export function useUsers(params: { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => fetchUsers(params),
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteUserPayload) => inviteUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}
