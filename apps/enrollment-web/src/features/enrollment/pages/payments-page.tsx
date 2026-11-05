import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import { formatCurrency } from '@/lib/utils'
import { fetchPayments } from '../api/enrollment-api'

type PaymentRow = Awaited<ReturnType<typeof fetchPayments>>[number]

const columns: Column<PaymentRow>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (p) => (p.student ? p.student.studentNumber : '—'),
  },
  { key: 'paymentType', header: 'Type' },
  {
    key: 'amount',
    header: 'Amount',
    className: 'text-right',
    render: (p) => formatCurrency(p.amount),
  },
  { key: 'orNumber', header: 'OR #', render: (p) => p.orNumber ?? '—' },
  {
    key: 'paidAt',
    header: 'Paid',
    render: (p) => new Date(p.paidAt).toLocaleString(),
  },
]

export function PaymentsPage() {
  const query = useQuery({ queryKey: ['enrollment', 'payments'], queryFn: fetchPayments })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Payments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tuition and fee receipts synced to UFMS when configured</p>
      </div>
      <DataTable
        columns={columns}
        data={query.data ?? []}
        keyExtractor={(p) => p.id}
        loading={query.isLoading}
        emptyTitle="No payments recorded"
      />
    </div>
  )
}
