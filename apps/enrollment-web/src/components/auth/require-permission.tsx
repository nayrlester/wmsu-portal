import { Navigate } from 'react-router-dom'
import { Alert } from '@wmsu/ui'
import { useHasPermission, resolveHomePath } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'

export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: string[]
  children: React.ReactNode
}) {
  const allowed = useHasPermission(...anyOf)
  const user = useAuthStore((s) => s.user)

  if (!anyOf.length) return <>{children}</>
  if (allowed) return <>{children}</>

  return (
    <div className="space-y-4">
      <Alert variant="danger" title="Access denied">
        You do not have permission to view this page. Required: {anyOf.join(' or ')}.
      </Alert>
      <Navigate to={resolveHomePath(user?.permissions ?? [], user?.roles ?? [])} replace />
    </div>
  )
}
