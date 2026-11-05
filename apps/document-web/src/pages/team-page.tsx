import { useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserPlus, Users } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usersApi } from '@/api/modules/users.api'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'
import { useSubscriptionUsage } from '@/hooks/use-api'
import { formatDate } from '@/lib/utils'

const createSchema = z.object({
  email: z.string().email('Enter a valid email'),
  fullName: z.string().min(2, 'Name is required'),
  roleId: z.string().min(1, 'Select a role'),
  password: z.string().min(8, 'At least 8 characters').optional().or(z.literal('')),
})

type CreateFormData = z.infer<typeof createSchema>

export function TeamPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [showCreate, setShowCreate] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  const { data: usage } = useSubscriptionUsage()
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['team-users', debouncedSearch],
    queryFn: () => usersApi.list(debouncedSearch || undefined),
  })
  const { data: rolesData } = useQuery({
    queryKey: ['assignable-roles'],
    queryFn: () => usersApi.assignableRoles(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormData>({ resolver: zodResolver(createSchema) })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
      setCreatedPassword(result.temporaryPassword ?? null)
      reset()
      setShowCreate(false)
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
    },
  })

  const onCreate = async (form: CreateFormData) => {
    setCreatedPassword(null)
    await createMutation.mutateAsync({
      email: form.email,
      fullName: form.fullName,
      roleId: form.roleId,
      password: form.password?.trim() || undefined,
    })
  }

  const users = usersData?.users ?? []
  const roles = rolesData?.roles ?? []
  const maxUsers = usage?.limits.maxUsers
  const usedUsers = usage?.usage.users ?? 0

  return (
    <PageContainer
      title="Team"
      breadcrumb="Home / Team"
      description="Invite teammates and manage workspace access"
      action={
        <Button onClick={() => setShowCreate((value) => !value)}>
          <UserPlus className="h-4 w-4" aria-hidden />
          Add user
        </Button>
      }
    >
      <ContentWrapper className="space-y-4">
        {maxUsers !== null && maxUsers !== undefined && (
          <WidgetCard title="Plan usage">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{usedUsers}</span> of{' '}
              <span className="font-medium text-foreground">{maxUsers}</span> users on your plan
            </p>
          </WidgetCard>
        )}

        {createdPassword && (
          <div
            className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
            role="status"
          >
            <p className="font-medium">User created</p>
            <p className="mt-1 text-muted-foreground">
              Temporary password (share securely):{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{createdPassword}</code>
            </p>
          </div>
        )}

        {createMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            Could not create user. Check the email is unique and you are within plan limits.
          </p>
        )}

        {showCreate && (
          <WidgetCard title="Add team member">
            <form onSubmit={handleSubmit(onCreate)} className="grid max-w-lg gap-4">
              <div className="space-y-2">
                <Label htmlFor="team-email">Email</Label>
                <Input id="team-email" type="email" autoComplete="off" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-name">Full name</Label>
                <Input id="team-name" {...register('fullName')} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-role">Role</Label>
                <Select id="team-role" {...register('roleId')} defaultValue="">
                  <option value="" disabled>
                    Select role…
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
                {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-password">Password (optional)</Label>
                <Input
                  id="team-password"
                  type="password"
                  placeholder="Leave blank to auto-generate"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create user'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </WidgetCard>
        )}

        <WidgetCard title="Team members">
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Users className="h-8 w-8 opacity-50" aria-hidden />
              <p>No team members found.</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add your first user
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Role</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Last login</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/60">
                      <td className="px-2 py-3 font-medium">{user.fullName ?? '—'}</td>
                      <td className="px-2 py-3 font-mono text-xs">{user.email}</td>
                      <td className="px-2 py-3">
                        {user.roles.map((role) => role.name).join(', ') || '—'}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {user.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deactivateMutation.isPending}
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'Deactivate user',
                                description: `Deactivate ${user.fullName ?? user.email}? They will no longer be able to sign in.`,
                                confirmLabel: 'Deactivate',
                                variant: 'destructive',
                              })
                              if (confirmed) {
                                deactivateMutation.mutate(user.id)
                              }
                            }}
                          >
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
