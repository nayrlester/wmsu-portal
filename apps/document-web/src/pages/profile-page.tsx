import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useAuthStore((s) => s.permissions)

  const roles = user?.roles ?? []
  const displayName = user?.fullName?.trim() || user?.email || 'User'

  return (
    <PageContainer title="Profile" breadcrumb="Home / Profile" description="Your account details for this workspace.">
      <ContentWrapper className="mx-auto max-w-2xl space-y-4">
        <WidgetCard title="Account">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{displayName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium break-all">{user?.email ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Roles</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {user?.isSuperAdmin ? <Badge>Super Admin</Badge> : null}
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role.id} variant="secondary">
                      {role.name}
                    </Badge>
                  ))
                ) : !user?.isSuperAdmin ? (
                  <span className="text-sm text-muted-foreground">No roles assigned</span>
                ) : null}
              </dd>
            </div>
          </dl>
        </WidgetCard>

        <WidgetCard title="Permissions">
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {user?.isSuperAdmin ? 'Super admins have full access.' : 'No permissions loaded for this account.'}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <li key={permission}>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {permission}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}
