import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { fetchEnrollments, type EnrollmentRow } from '../api/enrollment-api'

const columns: Column<EnrollmentRow>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (e) => (e.student ? `${e.student.lastName}, ${e.student.firstName}` : '—'),
  },
  { key: 'yearLevel', header: 'Year', className: 'text-center' },
  { key: 'semester', header: 'Sem', className: 'text-center' },
  {
    key: 'status',
    header: 'Status',
    render: (e) => <Badge>{e.status}</Badge>,
  },
]

export function EnrollmentsPage() {
  const query = useQuery({ queryKey: ['enrollment', 'enrollments'], queryFn: fetchEnrollments })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Enrollments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Advising, assessment, and registration status
        </p>
      </div>
      <DataTable
        columns={columns}
        data={query.data ?? []}
        keyExtractor={(e) => e.id}
        loading={query.isLoading}
        emptyTitle="No enrollments"
      />
    </div>
  )
}
