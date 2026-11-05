import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAppName } from '@librastack/client-config'
import { Card, CardContent } from '@/components/ui/card'
import { fetchQueueBoard } from '@/lib/opac-api'

export function QueueBoardPage() {
  const { data = [], isError } = useQuery({
    queryKey: ['public-queue-board'],
    queryFn: fetchQueueBoard,
    refetchInterval: 3000,
  })

  const called = data.filter((t) => t.status === 'called')
  const waiting = data.filter((t) => t.status === 'waiting')

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-canvas)] px-6 py-10 sm:px-10">
      <div className="pointer-events-none absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[#b8b3ff]/55" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-white/70" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img
                src="/wmsu-seal.png"
                alt="WMSU"
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-primary)]/20"
              />
              <span className="text-xl font-bold tracking-tight text-[var(--color-ink)]">WMSU</span>
            </div>
            <p className="text-4xl font-bold tracking-tight text-[var(--color-ink)] md:text-5xl">
              {getAppName(undefined, 'University Library')}
            </p>
            <p className="mt-2 text-lg text-[var(--color-muted-foreground)]">Service queue</p>
            <Link
              to="/"
              className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Back to OPAC
            </Link>
          </div>
          <p className="font-mono text-sm text-[var(--color-muted-foreground)]">
            {new Date().toLocaleString()}
          </p>
        </header>

        {isError && (
          <p className="mb-6 text-rose-600">Unable to load queue board. Check network and tenant.</p>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Now serving
            </h2>
            <div className="space-y-4">
              {called.map((t) => (
                <Card key={t.id} className="bg-[var(--color-primary)] text-white">
                  <CardContent className="px-6 py-8">
                    <p className="text-6xl font-bold tracking-tight">{t.ticketNumber}</p>
                    <p className="mt-2 text-lg uppercase tracking-wide text-white/85">
                      {t.serviceType}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {!called.length && (
                <Card>
                  <CardContent className="px-6 py-10 text-[var(--color-muted-foreground)]">
                    No ticket called
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Waiting
            </h2>
            <div className="space-y-3">
              {waiting.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between px-5 py-4">
                    <p className="text-3xl font-semibold text-[var(--color-ink)]">{t.ticketNumber}</p>
                    <p className="text-[var(--color-muted-foreground)]">{t.serviceType}</p>
                  </CardContent>
                </Card>
              ))}
              {!waiting.length && (
                <p className="text-[var(--color-muted-foreground)]">Queue is empty</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
