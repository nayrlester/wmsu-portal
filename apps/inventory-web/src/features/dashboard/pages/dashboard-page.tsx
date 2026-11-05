import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Warehouse,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  fetchDashboardSummary,
  fetchRecentMovements,
} from '../api/dashboard-api'
import type { RecentMovement, LowStockAlert, NearExpiryAlert } from '../api/dashboard-api'

function StatCard({
  label,
  value,
  icon: Icon,
  format = 'number',
}: {
  label: string
  value: number | undefined
  icon: React.ComponentType<{ className?: string }>
  format?: 'number' | 'currency'
}) {
  const display = value === undefined ? '—' : format === 'currency' ? formatCurrency(value) : formatNumber(value)
  return (
    <div className="uims-card flex items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-ink">{display}</p>
      </div>
    </div>
  )
}

function MovementTypeIcon({ type }: { type: string }) {
  if (type === 'IN') return <ArrowDownRight className="h-4 w-4 text-emerald-600" />
  if (type === 'OUT') return <ArrowUpRight className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-amber-500" />
}

function RecentMovementsTable({ movements, isLoading }: { movements: RecentMovement[]; isLoading: boolean }) {
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="uims-card">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">Recent Stock Movements</h2>
      </div>
      {movements.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No recent movements</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80">
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <MovementTypeIcon type={m.type} />
                      <span className="font-medium">{m.type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">{m.itemName}</td>
                  <td className="px-5 py-2.5">{m.warehouseName}</td>
                  <td className="px-5 py-2.5 text-right font-medium">{formatNumber(m.quantity)}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{m.reference || '—'}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LowStockPanel({ alerts, isLoading }: { alerts: LowStockAlert[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-live="polite">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="uims-card" aria-label="Low stock alerts">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Low Stock Alerts
        </h2>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No low stock alerts</p>
      ) : (
        <ul className="divide-y divide-border" aria-live="polite">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{a.itemName}</p>
                <p className="text-xs text-muted-foreground">{a.sku}</p>
              </div>
              <div className="text-right">
                <Badge variant={a.currentStock === 0 ? 'danger' : 'warning'}>
                  {a.currentStock} / {a.reorderLevel}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NearExpiryPanel({ alerts, isLoading }: { alerts: NearExpiryAlert[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-live="polite">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="uims-card" aria-label="Near-expiry alerts">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          Near-Expiry (30 days)
        </h2>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No near-expiry stock</p>
      ) : (
        <ul className="divide-y divide-border" aria-live="polite">
          {alerts.map((a) => (
            <li key={`${a.id}-${a.expiresAt}`} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{a.itemName}</p>
                <p className="text-xs text-muted-foreground">{a.sku}</p>
              </div>
              <div className="text-right text-xs text-rose-600">
                <div>Qty {a.currentStock}</div>
                <div>{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : '—'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })

  const movementsQuery = useQuery({
    queryKey: ['dashboard', 'recent-movements'],
    queryFn: fetchRecentMovements,
  })

  const stats = summaryQuery.data?.stats
  const summaryLoading = summaryQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Items" value={stats?.totalItems} icon={Package} />
        <StatCard label="Warehouses" value={stats?.totalWarehouses} icon={Warehouse} />
        <StatCard label="Assets" value={stats?.totalAssets} icon={HardDrive} />
        <StatCard label="Stock Value" value={stats?.totalStockValue} icon={TrendingUp} format="currency" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentMovementsTable
            movements={movementsQuery.data ?? []}
            isLoading={movementsQuery.isLoading}
          />
        </div>
        <div className="space-y-6">
          <LowStockPanel
            alerts={summaryQuery.data?.lowStock ?? []}
            isLoading={summaryLoading}
          />
          <NearExpiryPanel
            alerts={summaryQuery.data?.nearExpiry ?? []}
            isLoading={summaryLoading}
          />
        </div>
      </div>
    </div>
  )
}
