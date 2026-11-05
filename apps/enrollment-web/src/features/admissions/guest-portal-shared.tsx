import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@wmsu/ui'
import type { ApplicantJourneyStep } from '@/lib/usis-api'

export const GUEST_ORG_CODE = 'UNI'

export type SecondaryBackground = 'shs_academic' | 'shs_other' | 'not_shs' | 'undecided'
export type AcademicStrand = 'ABM' | 'STEM' | 'HUMSS' | 'GAS'

export const SECONDARY_BACKGROUND_OPTIONS: Array<{
  value: SecondaryBackground
  label: string
  hint: string
}> = [
  {
    value: 'shs_academic',
    label: 'SHS — Academic Track',
    hint: 'Then choose ABM, STEM, HUMSS, or GAS',
  },
  {
    value: 'shs_other',
    label: 'SHS — other track (TVL / Sports / Arts & Design)',
    hint: 'Strand picker is skipped; program list stays open',
  },
  {
    value: 'not_shs',
    label: 'Not SHS / other secondary background',
    hint: 'ALS, old high school, foreign, adult learner, etc.',
  },
  {
    value: 'undecided',
    label: 'Prefer not to say / still clarifying',
    hint: 'Optional — you can update this later on Status',
  },
]

export const ACADEMIC_STRAND_OPTIONS: Array<{
  value: AcademicStrand
  label: string
  name: string
  interests: string[]
}> = [
  {
    value: 'ABM',
    label: 'ABM',
    name: 'Accountancy, Business, and Management',
    interests: [
      'Accountancy and Finance',
      'Business Administration',
      'Entrepreneurship',
      'Marketing and Management',
    ],
  },
  {
    value: 'STEM',
    label: 'STEM',
    name: 'Science, Technology, Engineering, and Mathematics',
    interests: [
      'Engineering',
      'Medicine and Nursing',
      'Information Technology',
      'Computer Science',
      'Architecture',
    ],
  },
  {
    value: 'HUMSS',
    label: 'HUMSS',
    name: 'Humanities and Social Sciences',
    interests: [
      'Psychology',
      'Political Science',
      'Education',
      'Communication',
      'Law',
      'Journalism',
    ],
  },
  {
    value: 'GAS',
    label: 'GAS',
    name: 'General Academic Strand',
    interests: [
      'Still exploring college courses',
      'Exposure across academic fields',
      'General academic preparation',
    ],
  },
]

export const GUEST_REQUIREMENTS_NEW = [
  'Form 138 / SF9',
  'PSA Birth Certificate',
  'Certificate of Good Moral Character',
  '2x2 ID photos',
  'Medical certificate / health clearance',
]

export const GUEST_REQUIREMENTS_NOT_SHS = [
  'Secondary credentials / equivalent (ALS, Form 137, foreign, etc.)',
  'PSA Birth Certificate',
  'Certificate of Good Moral Character',
  '2x2 ID photos',
  'Medical certificate / health clearance',
]

export const GUEST_REQUIREMENTS_TRANSFER = [
  ...GUEST_REQUIREMENTS_NEW,
  'Honorable Dismissal',
  'Transcript of Records (TOR)',
]

export const GUEST_REQUIREMENTS_RETURNING = [
  ...GUEST_REQUIREMENTS_NEW,
  'Re-admission / clearance from prior enrollment',
]

export function requirementsForClassification(
  classification: string | null | undefined,
  secondaryBackground?: SecondaryBackground | null
) {
  if (classification === 'transferee') return GUEST_REQUIREMENTS_TRANSFER
  if (classification === 'returning') return GUEST_REQUIREMENTS_RETURNING
  if (secondaryBackground === 'not_shs') return GUEST_REQUIREMENTS_NOT_SHS
  return GUEST_REQUIREMENTS_NEW
}

export function GuestPortalShell({
  title,
  subtitle,
  children,
  brandBackdrop = true,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  brandBackdrop?: boolean
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f4f7fb_0%,#eef3f8_45%,#f8fafc_100%)] px-4 py-8">
      {brandBackdrop ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="/wmsu-seal.png"
            alt=""
            decoding="async"
            className="absolute left-1/2 top-[36%] h-[min(96vh,46rem)] w-[min(96vh,46rem)] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.42] blur-[1px] sm:opacity-[0.48] sm:blur-[1.5px]"
            style={{
              maskImage:
                'radial-gradient(ellipse 80% 76% at 50% 46%, #000 40%, rgba(0,0,0,0.65) 68%, transparent 82%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 80% 76% at 50% 46%, #000 40%, rgba(0,0,0,0.65) 68%, transparent 82%)',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_36%,transparent_58%,rgba(244,247,251,0.18)_86%,#eef3f8_100%)]" />
        </div>
      ) : null}
      <div className="relative z-10 mx-auto max-w-4xl space-y-6">
        <header className="space-y-3 border-b border-[var(--color-border)] pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              WMSU USiS · Guest admissions portal
            </p>
            <nav className="flex flex-wrap gap-3 text-sm">
              <Link className="underline underline-offset-4" to="/apply">
                Overview
              </Link>
              <Link className="underline underline-offset-4" to="/apply/start">
                Apply
              </Link>
              <Link className="underline underline-offset-4" to="/apply/status">
                Status / results
              </Link>
              <Link className="underline underline-offset-4" to="/login">
                Staff / student sign-in
              </Link>
            </nav>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
          {subtitle ? (
            <p className="max-w-3xl text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  )
}

export function JourneyStepper({ steps }: { steps: ApplicantJourneyStep[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`rounded-xl border px-3 py-3 text-sm ${
            step.status === 'done'
              ? 'border-emerald-300 bg-emerald-50'
              : step.status === 'current'
                ? 'border-sky-400 bg-sky-50'
                : 'border-[var(--color-border)] bg-white/70'
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">Step {index + 1}</span>
            <Badge>
              {step.status === 'done' ? 'Done' : step.status === 'current' ? 'Now' : 'Next'}
            </Badge>
          </div>
          <p className="font-medium text-[var(--color-ink)]">{step.label}</p>
        </li>
      ))}
    </ol>
  )
}

export function persistGuestReceipt(applicationNumber: string, email: string) {
  try {
    sessionStorage.setItem(
      'usis.guest.application',
      JSON.stringify({ applicationNumber, email, savedAt: Date.now() })
    )
  } catch {
    /* ignore */
  }
}

export function readGuestReceipt(): { applicationNumber: string; email: string } | null {
  try {
    const raw = sessionStorage.getItem('usis.guest.application')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { applicationNumber?: string; email?: string }
    if (!parsed.applicationNumber || !parsed.email) return null
    return { applicationNumber: parsed.applicationNumber, email: parsed.email }
  } catch {
    return null
  }
}
