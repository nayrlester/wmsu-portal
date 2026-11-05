import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CloudUpload, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useBooksStore } from '@/stores/books-store'
import { useAnalyticsDashboard } from '@/hooks/use-analytics'
import { useFineSummary } from '@/hooks/use-fines'
import { formatCents } from '@/types/fines'
import { cn } from '@/lib/utils'

const shortcuts = [
  { to: '/circulation', label: 'Circulation desk', tone: 'bg-[#efeefe] text-[#4338ca]' },
  { to: '/reservations', label: 'Hold queue', tone: 'bg-[#f3f4ff] text-[#635bff]' },
  { to: '/reports', label: 'Mandated reports', tone: 'bg-[#ecebff] text-[#2f2a6b]' },
  { to: '/kiosk-platform', label: 'Kiosk platform', tone: 'bg-[#e8e7ff] text-[#5249f0]' },
]

export function UtilityPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const openCreateForm = useBooksStore((s) => s.openCreateForm)
  const canCreateBook = user?.permissions.includes('books:create')
  const canAnalytics = user?.permissions.includes('analytics:read')
  const canFines = user?.permissions.includes('fines:read')
  const { data } = useAnalyticsDashboard(30, canAnalytics)
  const { data: fines } = useFineSummary(Boolean(canFines))

  const total = data?.overview.totalCopies ?? 0
  const available = data?.overview.availableCopies ?? 0
  const usedPct = total > 0 ? Math.round(((total - available) / total) * 100) : 0
  const leftPct = Math.max(0, 100 - usedPct)

  function handleAddToCatalog() {
    if (!canCreateBook) {
      navigate('/books')
      return
    }
    openCreateForm()
    if (!location.pathname.startsWith('/books')) {
      navigate('/books')
    }
  }

  return (
    <aside className="hidden w-[300px] shrink-0 xl:block">
      <div className="sticky top-6 space-y-5">
        <div className="ui-card animate-fade-up space-y-4 p-5">
          <button
            type="button"
            onClick={handleAddToCatalog}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#cfd3f5]',
              'bg-[var(--color-primary-soft)] px-4 py-8 text-center transition hover:border-[var(--color-primary)]/40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35'
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
              <CloudUpload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-ink)]">Add to catalog</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Register titles and copies
              </p>
            </div>
          </button>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Collection capacity</p>
              <p className="text-xs font-medium text-[var(--color-primary)]">{leftPct}% free</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              {total - available} of {total || '—'} copies checked out or unavailable
            </p>
          </div>

          {canFines && (
            <div className="rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#9aa0c3]">
                Outstanding fines
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
                {formatCents(fines?.totalOutstandingCents ?? 0)}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {fines?.pendingCount ?? 0} pending · PHP
              </p>
            </div>
          )}
        </div>

        <div className="ui-card animate-fade-up animate-fade-up-delay-1 p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Quick modules</p>
          <div className="space-y-2">
            {shortcuts.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition hover:brightness-[0.98]',
                  item.tone
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/digital"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] px-3 py-3 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary-soft)]"
            >
              <Plus className="h-4 w-4" />
              Open digital library
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
