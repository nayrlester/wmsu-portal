import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clock, Building2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicPageHeader } from '@/components/shared/public-page-header'
import { trackApi } from '@/lib/api'
import type { PublicTrackView } from '@/types/tracking'
import { cn, formatDate, statusColor } from '@/lib/utils'

export function PublicTrackPage() {
  const { trackingNumber: routeTrackingNumber } = useParams<{ trackingNumber?: string }>()
  const navigate = useNavigate()
  const [trackingNumber, setTrackingNumber] = useState(routeTrackingNumber ?? '')
  const [result, setResult] = useState<PublicTrackView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadTracking = async (number: string) => {
    const trimmed = number.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    try {
      const data = await trackApi.get(trimmed)
      if (!data?.trackingNumber || !data?.title) {
        throw new Error('Invalid tracking response')
      }
      setResult(data)
    } catch {
      setError('Document not found. Please check the tracking number.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTrack = () => {
    const trimmed = trackingNumber.trim()
    if (!trimmed) return
    navigate(`/track/${encodeURIComponent(trimmed)}`, { replace: true })
    void loadTracking(trimmed)
  }

  useEffect(() => {
    if (routeTrackingNumber) {
      const decoded = decodeURIComponent(routeTrackingNumber)
      setTrackingNumber(decoded)
      void loadTracking(decoded)
    }
  }, [routeTrackingNumber])

  return (
    <div className="min-h-screen overflow-x-clip bg-muted/30">
      <PublicPageHeader />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h1 className="text-center text-2xl font-bold sm:text-3xl">Track Your Document</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">
          Enter your tracking number or scan the QR code on your receipt
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="DTS-2026-0000001"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            className="min-w-0 flex-1 font-mono"
          />
          <Button onClick={handleTrack} disabled={loading} className="w-full shrink-0 sm:w-auto">
            <Search className="h-4 w-4" />
            Track
          </Button>
        </div>

        {error && <p className="mt-4 text-center text-destructive">{error}</p>}

        {loading && !result && (
          <p className="mt-8 text-center text-muted-foreground">Loading tracking information...</p>
        )}

        {result && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{result.title}</CardTitle>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">{result.trackingNumber}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-medium capitalize',
                    statusColor(result.status)
                  )}
                >
                  {result.status.replace(/_/g, ' ')}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {result.currentDepartment && (
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current department
                      </dt>
                      <dd className="font-medium">{result.currentDepartment.name}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</dt>
                    <dd className="font-medium">{formatDate(result.lastUpdated)}</dd>
                  </div>
                </div>
              </dl>

              <h3 className="mb-4 mt-8 font-semibold">Timeline</h3>
              {result.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {result.timeline.map((entry, index) => (
                    <div key={`${entry.action}-${entry.occurredAt}-${index}`} className="flex gap-4 border-l-2 border-primary pl-4">
                      <div>
                        <p className="font-medium">{entry.label}</p>
                        {entry.department && (
                          <p className="text-sm text-muted-foreground">{entry.department.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(entry.occurredAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
