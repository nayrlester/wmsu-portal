import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SectionCard } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { getAlumni, alumniStanding, listAlumni, updateAlumni } from '../api/alumni-api'

export function AlumniPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [collegeCode, setCollegeCode] = useState('')
  const [programCode, setProgramCode] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [location, setLocation] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [edit, setEdit] = useState({
    email: '',
    mobile: '',
    location: '',
    employmentInfo: '',
    consentProfileUpdate: false,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [standingNumber, setStandingNumber] = useState('2026-PH-NEW001')
  const [standingText, setStandingText] = useState('')
  const [standingError, setStandingError] = useState('')

  const list = useQuery({
    queryKey: ['alumni', q, collegeCode, programCode, graduationYear, location],
    queryFn: () =>
      listAlumni({
        q: q || undefined,
        collegeCode: collegeCode || undefined,
        programCode: programCode || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        location: location || undefined,
        limit: 50,
      }),
  })

  const detail = useQuery({
    queryKey: ['alumni-detail', selected],
    queryFn: () => getAlumni(selected!),
    enabled: Boolean(selected),
  })

  const standing = useMutation({
    mutationFn: () => alumniStanding(standingNumber.trim()),
    onSuccess: (data) => {
      setStandingError('')
      setStandingText(data.message)
    },
    onError: (err: unknown) => {
      setStandingText('')
      const ax = err as { response?: { data?: { message?: string } } }
      setStandingError(ax.response?.data?.message ?? 'Alumni check failed')
    },
  })

  const save = useMutation({
    mutationFn: () =>
      updateAlumni(selected!, {
        email: edit.email || null,
        mobile: edit.mobile || null,
        location: edit.location || null,
        employmentInfo: edit.employmentInfo || null,
        consentProfileUpdate: edit.consentProfileUpdate,
      }),
    onSuccess: () => {
      setError(null)
      setMessage('Alumni profile updated (TORMS-owned fields only)')
      qc.invalidateQueries({ queryKey: ['alumni'] })
      qc.invalidateQueries({ queryKey: ['alumni-detail', selected] })
    },
    onError: (err: unknown) => {
      setMessage(null)
      const ax = err as { response?: { data?: { message?: string } } }
      setError(ax.response?.data?.message ?? 'Update failed')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumni"
        description="Search alumni profiles by college, program, year, and location (TOR-014). Academic SoR remains USiS."
      />

      <SectionCard title="Search">
        <div className="mb-4 space-y-2">
          <label className="block text-sm text-slate-600">
            Student number
            <Input
              className="mt-1 max-w-sm"
              aria-label="Alumni student number"
              value={standingNumber}
              onChange={(event) => setStandingNumber(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="whitespace-nowrap"
            disabled={standing.isPending || standingNumber.trim().length < 3}
            onClick={() => standing.mutate()}
          >
            Check alumni standing
          </Button>
          {standingError ? <p className="text-sm text-red-600">{standingError}</p> : null}
          {standingText ? (
            <p className="text-sm text-slate-700" data-testid="alumni-standing">
              {standingText}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Name / student / email</span>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">College code</span>
            <Input value={collegeCode} onChange={(e) => setCollegeCode(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Program code</span>
            <Input value={programCode} onChange={(e) => setProgramCode(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Graduation year</span>
            <Input
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="e.g. 2024"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Location</span>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Directory">
          {list.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (list.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="No alumni profiles"
              description="Profiles are created from USiS graduation events (INT-TOR-03)."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Student</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Program</th>
                    <th className="px-2 py-2">Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.data!.items.map((a) => (
                    <tr
                      key={a.id}
                      className="cursor-pointer hover:bg-slate-50/70"
                      onClick={() => {
                        setSelected(a.studentNumber)
                        setEdit({
                          email: a.email ?? '',
                          mobile: a.mobile ?? '',
                          location: a.location ?? '',
                          employmentInfo: a.employmentInfo ?? '',
                          consentProfileUpdate: Boolean(a.consentProfileUpdate),
                        })
                        setMessage(null)
                        setError(null)
                      }}
                    >
                      <td className="px-2 py-2 font-medium text-[var(--color-primary)]">
                        {a.studentNumber}
                      </td>
                      <td className="px-2 py-2">
                        {[a.firstName, a.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-2 py-2">{a.programCode ?? '—'}</td>
                      <td className="px-2 py-2">{a.graduationYear ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">
                Showing {list.data!.items.length} of {list.data!.meta.total}
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Profile">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a row to view TORMS-owned contact fields.</p>
          ) : detail.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : detail.isError || !detail.data ? (
            <p className="text-sm text-red-600">Failed to load profile.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">{detail.data.studentNumber}</span> ·{' '}
                {detail.data.collegeCode ?? '—'} · {detail.data.degreeTitle ?? detail.data.programCode}
              </p>
              <p className="text-xs text-amber-700">
                Academic history is owned by USiS. Tracer surveys, events, and donations are not in this
                stage (FC #17–19).
              </p>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Email</span>
                <Input
                  value={edit.email}
                  onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Mobile</span>
                <Input
                  value={edit.mobile}
                  onChange={(e) => setEdit((s) => ({ ...s, mobile: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Location</span>
                <Input
                  value={edit.location}
                  onChange={(e) => setEdit((s) => ({ ...s, location: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Employment info</span>
                <Input
                  value={edit.employmentInfo}
                  onChange={(e) => setEdit((s) => ({ ...s, employmentInfo: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={edit.consentProfileUpdate}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, consentProfileUpdate: e.target.checked }))
                  }
                />
                Consent to profile update (RA 10173 / TOR-013)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                  Save TORMS fields
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelected(null)
                    setMessage(null)
                    setError(null)
                  }}
                >
                  Clear
                </Button>
              </div>
              {message && <p className="text-sm text-emerald-700">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
