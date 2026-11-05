import { Alert, Button } from '@wmsu/ui'
import { useLocation, useNavigate } from 'react-router-dom'
import { portalHomeUrl } from '@/lib/portal'

export function AccessDeniedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof (location.state as { from?: string }).from === 'string'
      ? (location.state as { from: string }).from
      : null

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6">
      <Alert variant="warning" title="No USiS access for this area">
        <p className="text-sm">
          Your account can open USiS but does not have permission for this page
          {from ? ` (${from})` : ''}. Ask an administrator to assign a USiS role (student, faculty,
          registrar, or office staff) in Platform Access.
        </p>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button type="button" onClick={() => window.location.assign(portalHomeUrl())}>
          Open Platform Access
        </Button>
      </div>
    </div>
  )
}
