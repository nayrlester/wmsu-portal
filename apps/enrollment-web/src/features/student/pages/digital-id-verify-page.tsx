import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Alert, Badge, Card, CardContent, LoadingState, PageHeader } from '@wmsu/ui'
import { fetchDigitalStudentIdVerify } from '@/lib/usis-api'
import { formatDateTime } from '@/lib/utils'

export function StudentDigitalIdVerifyPage() {
  const { token = '' } = useParams()
  const verify = useQuery({
    queryKey: ['student-id', 'verify', token],
    queryFn: () => fetchDigitalStudentIdVerify(token),
    enabled: !!token,
  })

  if (verify.isLoading) return <LoadingState label="Validating digital student ID" />

  const data = verify.data
  if (!data?.valid) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <Alert variant="danger" title="Invalid or unknown document">
          This QR code does not match an active provisional digital student ID.
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-8">
      <PageHeader
        title="Digital student ID verification"
        description="Public validation for provisional PDF+QR credentials"
      />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm">{data.studentNumber}</p>
            <Badge variant="success">Provisional</Badge>
          </div>
          <p className="text-sm">{data.studentName}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {data.requestType} · {data.status}
          </p>
          <Alert variant={data.checksumMatches ? 'success' : 'warning'} title="Document integrity">
            {data.checksumMatches
              ? 'Checksum matches stored snapshot.'
              : 'Checksum mismatch — treat as invalid.'}
          </Alert>
          {data.note ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">{data.note}</p>
          ) : null}
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Issued {formatDateTime(data.issuedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
