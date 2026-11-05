import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { fetchStudents, type Student } from '../api/enrollment-api'

const columns: Column<Student>[] = [
  { key: 'studentNumber', header: 'Student #', className: 'font-mono text-xs' },
  {
    key: 'name',
    header: 'Name',
    render: (s) => (
      <span className="font-medium">
        {s.lastName}, {s.firstName}
      </span>
    ),
  },
  { key: 'email', header: 'Email' },
  {
    key: 'status',
    header: 'Status',
    render: (s) => <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge>,
  },
]

export function StudentsPage() {
  const query = useQuery({ queryKey: ['enrollment', 'students'], queryFn: fetchStudents })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Students</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Active student registry</p>
      </div>
      <DataTable
        columns={columns}
        data={query.data ?? []}
        keyExtractor={(s) => s.id}
        loading={query.isLoading}
        emptyTitle="No students"
      />
    </div>
  )
}
