import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type RegistrarJourneyStepId =
  | 'enrollments'
  | 'catalog'
  | 'scheduling'
  | 'advising'
  | 'registration'

const STEPS: Array<{
  id: RegistrarJourneyStepId
  step: number
  label: string
  path: string
  hint: string
}> = [
  {
    id: 'catalog',
    step: 1,
    label: 'Academic catalog',
    path: '/registrar/academic',
    hint: 'Years, courses, and section codes',
  },
  {
    id: 'scheduling',
    step: 2,
    label: 'Scheduling & seating',
    path: '/registrar/scheduling',
    hint: 'Advising period, open sections, assign classes',
  },
  {
    id: 'enrollments',
    step: 3,
    label: 'Enrollment records',
    path: '/registrar/enrollments',
    hint: 'Confirm the student is enrolled for the term',
  },
  {
    id: 'advising',
    step: 4,
    label: 'Faculty advising',
    path: '/faculty/advising',
    hint: 'Regular flow: faculty picks sections',
  },
  {
    id: 'registration',
    step: 5,
    label: 'Registration approval',
    path: '/registrar/registration',
    hint: 'Assess, verify payment, register',
  },
]

export function RegistrarEnrollmentJourneyNav({
  activeStep,
}: {
  activeStep: RegistrarJourneyStepId
}) {
  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      data-testid="registrar-enrollment-journey"
    >
      <p className="text-sm font-semibold">Enrollment term workflow</p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Follow these steps to set up sections and seat students. Registrar desk seating (step 2) is
        for block or irregular students; most students use faculty advising (step 4) then
        registration (step 5).
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((item) => {
          const active = item.id === activeStep
          return (
            <li key={item.id}>
              <Link
                to={item.path}
                className={cn(
                  'flex h-full flex-col rounded-lg border px-3 py-2 text-sm transition-colors',
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]/40'
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                  Step {item.step}
                </span>
                <span className="font-semibold">{item.label}</span>
                <span className="mt-1 text-xs text-[var(--color-muted-foreground)]">{item.hint}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
