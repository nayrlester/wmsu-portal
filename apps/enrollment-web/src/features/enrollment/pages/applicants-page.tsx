import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import type { Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { getApiErrorMessage } from '@/lib/api-client'
import { admitApplicant, fetchApplicants, type Applicant } from '../api/enrollment-api'

const columns: Column<Applicant>[] = [
  {
    key: 'name',
    header: 'Applicant',
    render: (a) => (
      <span className="font-medium">
        {a.lastName}, {a.firstName}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (a) => (
      <Badge variant={a.status === 'admitted' ? 'success' : a.status === 'pending' ? 'warning' : 'default'}>
        {a.status}
      </Badge>
    ),
  },
  {
    key: 'appliedAt',
    header: 'Applied',
    render: (a) => (a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'),
  },
]

export function ApplicantsPage() {
  const queryClient = useQueryClient()
  const [admitTarget, setAdmitTarget] = useState<Applicant | null>(null)
  const [studentNumber, setStudentNumber] = useState('')
  const [error, setError] = useState('')

  const query = useQuery({ queryKey: ['enrollment', 'applicants'], queryFn: fetchApplicants })

  const admitMutation = useMutation({
    mutationFn: () => admitApplicant(admitTarget!.id, studentNumber.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] })
      setAdmitTarget(null)
      setStudentNumber('')
      setError('')
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Applicants</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Admission pipeline and student number assignment</p>
      </div>

      <DataTable
        columns={columns}
        data={query.data ?? []}
        keyExtractor={(a) => a.id}
        loading={query.isLoading}
        emptyTitle="No applicants yet"
        actions={(a) =>
          a.status === 'pending' ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => setAdmitTarget(a)}>
              Admit
            </Button>
          ) : null
        }
      />

      <Modal
        open={Boolean(admitTarget)}
        onClose={() => {
          setAdmitTarget(null)
          setError('')
        }}
        title="Admit applicant"
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Assign a student number. Identity provisioning runs on admit.
        </p>
        <Input
          label="Student number"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          placeholder="e.g. 2026-00042"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setAdmitTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!studentNumber.trim() || admitMutation.isPending}
            onClick={() => admitMutation.mutate()}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Admit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
