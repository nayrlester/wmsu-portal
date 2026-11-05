import type { SVGProps } from 'react'

type ActionId = 'borrow' | 'return' | 'account' | 'history'

const ACTIONS: Array<{
  id: ActionId
  index: string
  title: string
  desc: string
  accent: string
}> = [
  {
    id: 'borrow',
    index: '01',
    title: 'Borrow',
    desc: 'Scan library card, then item barcode',
    accent: 'var(--color-primary)',
  },
  {
    id: 'return',
    index: '02',
    title: 'Return',
    desc: 'Scan item barcode to check in',
    accent: 'var(--color-sidebar)',
  },
  {
    id: 'account',
    index: '03',
    title: 'Account',
    desc: 'Membership status and outstanding fines',
    accent: '#3d5a80',
  },
  {
    id: 'history',
    index: '04',
    title: 'History',
    desc: 'Recent loans and due dates',
    accent: '#5c4d7a',
  },
]

function Icon({
  id,
  ...props
}: SVGProps<SVGSVGElement> & { id: ActionId }) {
  const common = {
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
  if (id === 'borrow') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden {...common}>
        <path d="M4 19V5a1 1 0 0 1 1-1h9v16H5a1 1 0 0 1-1-1Z" />
        <path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
        <path d="M8 8h4M8 12h3" />
      </svg>
    )
  }
  if (id === 'return') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden {...common}>
        <path d="M9 10H4V5" />
        <path d="M4 10a8 8 0 1 0 2.3-5.7L4 10" />
        <path d="M12 8v5l3 2" />
      </svg>
    )
  }
  if (id === 'account') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden {...common}>
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...common}>
      <path d="M4 5h16v4H4zM4 11h16v8H4z" />
      <path d="M8 15h4" />
    </svg>
  )
}

export function KioskActionGrid({
  onSelect,
}: {
  onSelect: (id: ActionId) => void
}) {
  return (
    <div className="mt-10 grid flex-1 gap-4 sm:grid-cols-2 animate-fade-up animate-fade-up-delay-1">
      {ACTIONS.map((action, i) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelect(action.id)}
          className="group relative overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-white text-left transition duration-200 hover:-translate-y-0.5 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
          style={{ animationDelay: `${0.05 * i}s` }}
        >
          <span
            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-[0.08] transition group-hover:opacity-[0.14]"
            style={{ background: action.accent }}
            aria-hidden
          />
          <span className="flex min-h-[9.5rem] flex-col justify-between gap-6 p-6 sm:p-7">
            <span className="flex items-start justify-between gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-ink)]"
                style={{ background: 'var(--color-primary-soft)', color: action.accent }}
              >
                <Icon id={action.id} className="h-5 w-5" />
              </span>
              <span
                className="font-mono text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)]"
                style={{ color: action.accent }}
              >
                {action.index}
              </span>
            </span>
            <span>
              <span className="block text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {action.title}
              </span>
              <span className="mt-1.5 block max-w-[16rem] text-sm leading-snug text-[var(--color-muted-foreground)]">
                {action.desc}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] opacity-0 transition group-hover:opacity-100">
                Begin
                <span aria-hidden>→</span>
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export type { ActionId }
