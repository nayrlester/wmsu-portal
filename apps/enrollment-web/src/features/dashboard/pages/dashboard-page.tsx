import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Users, ClipboardList, Wallet } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { fetchEnrollmentSummary } from '@/features/enrollment/api/enrollment-api'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | undefined
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="uims-card flex items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-ink">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['enrollment', 'summary'],
    queryFn: fetchEnrollmentSummary,
  })

  const summary = query.data

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1>USiS Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enrollment, advising, and clearance overview
        </p>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pending applicants" value={summary?.pendingApplicants} icon={ClipboardList} />
            <StatCard label="Students" value={summary?.totalStudents} icon={Users} />
            <StatCard label="Enrollments" value={summary?.activeEnrollments} icon={GraduationCap} />
            <StatCard label="Recent payments" value={summary?.recentPayments.length} icon={Wallet} />
          </div>

          <div className="uims-card">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">Recent payments</h2>
            </div>
            {!summary?.recentPayments.length ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No payments yet</p>
            ) : (
              <ul className="divide-y divide-border">
                {summary.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>{p.student?.studentNumber ?? 'Student'}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
