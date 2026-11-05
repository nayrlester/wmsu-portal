import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useReceivingReceipt,
  useRegisterReceivingReceipt,
} from '@/features/records/hooks/use-digitization-receiving'
import { receivingApi } from '@/api/modules/digitization-receiving.api'
import { formatDate } from '@/lib/utils'
import { toast } from '@/shared/store/toast-store'

export function ReceivingReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const autoPrint = params.get('print') === '1'
  const { data, isLoading } = useReceivingReceipt(id)
  const register = useRegisterReceivingReceipt()

  useEffect(() => {
    if (autoPrint && data?.data) {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [autoPrint, data?.data?.id])

  if (isLoading || !data?.data) {
    return (
      <PageContainer title="Receiving receipt" breadcrumb="Home / Records / Receiving">
        <ContentWrapper>
          <Skeleton className="h-40 w-full" />
        </ContentWrapper>
      </PageContainer>
    )
  }

  const receipt = data.data

  async function onRegister() {
    try {
      await register.mutateAsync({ id: receipt.id, createDocument: true })
      toast.success('Registered to document registry')
    } catch (err) {
      toast.error('Register failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function onPrint() {
    try {
      await receivingApi.acknowledgment(receipt.id)
      window.print()
    } catch (err) {
      toast.error('Print failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <PageContainer
      title={receipt.receiptNumber}
      breadcrumb="Home / Records / Receiving / Detail"
      description={receipt.title}
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row print:hidden">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/app/records/receiving')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button className="w-full sm:w-auto" onClick={onPrint}>
            <Printer className="mr-1 h-4 w-4" />
            Print acknowledgment
          </Button>
        </div>
      }
    >
      <ContentWrapper>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-2">
          <Meta label="Channel" value={receipt.channel.replaceAll('_', ' ')} />
          <Meta label="Status" value={receipt.status} />
          <Meta label="Received" value={formatDate(receipt.receivedAt)} />
          <Meta label="Sender" value={receipt.senderName ?? '—'} />
        </div>

        <WidgetCard title="Acknowledgment">
          <div className="space-y-2 text-sm" id="receiving-ack">
            <p className="text-base font-semibold">
              {receipt.acknowledgment?.heading ?? 'Official Receiving Acknowledgment'}
            </p>
            <p className="text-muted-foreground">
              {receipt.acknowledgment?.body ??
                `Acknowledges receipt of "${receipt.title}" under ${receipt.receiptNumber}.`}
            </p>
            <dl className="grid gap-2 sm:grid-cols-2 pt-2">
              <div>
                <dt className="text-xs text-muted-foreground">Receipt #</dt>
                <dd className="font-mono">{receipt.receiptNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Channel</dt>
                <dd className="capitalize">{receipt.channel.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Box / folder</dt>
                <dd>
                  {receipt.physicalBoxId ?? '—'} / {receipt.physicalFolderId ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Received by</dt>
                <dd>{receipt.receivedBy?.fullName ?? receipt.receivedBy?.email ?? '—'}</dd>
              </div>
            </dl>
            {receipt.acknowledgmentNotes && (
              <p className="pt-2 text-muted-foreground">{receipt.acknowledgmentNotes}</p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard title="Registration">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{receipt.status}</Badge>
              {receipt.document?.trackingNumber && (
                <Link
                  to={`/app/documents/${receipt.document.id}`}
                  className="text-sm font-mono text-primary hover:underline"
                >
                  {receipt.document.trackingNumber}
                </Link>
              )}
            </div>
            {receipt.status === 'logged' && (
              <Button
                className="w-full sm:w-auto print:hidden"
                disabled={register.isPending}
                onClick={onRegister}
              >
                Register as document
              </Button>
            )}
          </div>
        </WidgetCard>
      </ContentWrapper>
    </PageContainer>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize break-words">{value}</p>
    </div>
  )
}
