import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { fetchClearance } from '../api/enrollment-api'

export function ClearancePage() {
  const [studentNumber, setStudentNumber] = useState('')
  const [lookup, setLookup] = useState('')

  const query = useQuery({
    queryKey: ['enrollment', 'clearance', lookup],
    queryFn: () => fetchClearance(lookup),
    enabled: Boolean(lookup),
  })

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1>Clearance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Cross-system holds (finance, library, inventory)</p>
      </div>

      <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Student number"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          placeholder="2026-00042"
        />
        <Button type="button" onClick={() => setLookup(studentNumber.trim())} disabled={!studentNumber.trim()}>
          Check
        </Button>
      </div>

      {query.isFetching ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}

      {query.data ? (
        <div className="uims-card max-w-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-ink">{lookup}</p>
            <Badge variant={query.data.cleared ? 'success' : 'danger'}>
              {query.data.cleared ? 'Cleared' : 'On hold'}
            </Badge>
          </div>
          {!query.data.cleared && query.data.holds?.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {query.data.holds.map((h, i) => (
                <li key={`${h.source}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-medium">{h.source}</span>: {h.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
