import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi, formatCurrency } from '@/lib/admin-api'

export function AdminBillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing'],
    queryFn: () => adminApi.billingOverview().then((r) => r.billing),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing Overview</h1>
        <p className="text-muted-foreground">Platform revenue and payment activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Revenue', value: data ? formatCurrency(data.totalRevenue) : '—' },
          { label: 'This Month', value: data ? formatCurrency(data.revenueThisMonth) : '—' },
          { label: 'Paid Invoices', value: data ? String(data.paidInvoices) : '—' },
          { label: 'Outstanding', value: data ? String(data.outstandingInvoices) : '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '…' : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 animate-pulse rounded bg-muted" />
            ) : (
              <div className="space-y-2">
                {data?.revenueByPlan.map((row) => (
                  <div key={row.planSlug} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      {row.planName} <span className="text-muted-foreground">({row.tenantCount})</span>
                    </span>
                    <span className="font-medium">{formatCurrency(row.mrr)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 animate-pulse rounded bg-muted" />
            ) : data?.recentPayments.length ? (
              <div className="space-y-2">
                {data.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{payment.tenantName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
