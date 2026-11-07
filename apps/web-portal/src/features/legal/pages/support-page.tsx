import {
  ArrowUpRight,
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  LayoutGrid,
  Shield,
  Sparkles,
  Terminal,
  UserCog,
} from 'lucide-react'
import { LegalPageShell } from '@/features/legal/components/legal-page-shell'
import {
  systemDocumentation,
  type DocResource,
} from '@/features/legal/data/system-documentation'
import clsx from 'clsx'

const topics = [
  {
    icon: LayoutGrid,
    title: 'Platform access',
    body: 'Missing a tile? An identity admin must assign that platform (enrollment, records, library, finance, docstrack, inventory).',
  },
  {
    icon: UserCog,
    title: 'Roles inside apps',
    body: 'Opening USiS or ULMIS is not full staff access. Identity roles (student, registrar, employee, …) control menus and APIs inside each system.',
  },
  {
    icon: Shield,
    title: 'Sign-in & MFA',
    body: 'Use your Identity email and password (show/hide with the eye icon). Enter your authenticator code when MFA is on.',
  },
  {
    icon: HelpCircle,
    title: 'SSO launch issues',
    body: 'Sign out, sign back in, then retry the platform card. Confirm Identity (3411) and Base API (3500) are running locally.',
  },
] as const

const resourceMeta: Record<
  DocResource['kind'],
  { icon: typeof BookOpen; accent: string; badge: string }
> = {
  guide: {
    icon: BookOpen,
    accent: 'bg-[#eef0ff] text-[#635bff]',
    badge: 'Guide',
  },
  api: {
    icon: Code2,
    accent: 'bg-[#ecfdf5] text-[#0f766e]',
    badge: 'Specs',
  },
  swagger: {
    icon: Terminal,
    accent: 'bg-[#fff7ed] text-[#c2410c]',
    badge: 'Live',
  },
  srs: {
    icon: FileText,
    accent: 'bg-[#f5f3ff] text-[#5b21b6]',
    badge: 'SRS',
  },
  pdf: {
    icon: FileText,
    accent: 'bg-[#fef2f2] text-[#b91c1c]',
    badge: 'PDF',
  },
  markdown: {
    icon: FileText,
    accent: 'bg-[#f8fafc] text-[#334155]',
    badge: 'MD',
  },
}

function ResourceRow({ resource }: { resource: DocResource }) {
  const meta = resourceMeta[resource.kind]
  const Icon = meta.icon
  const external = resource.href.startsWith('http')

  return (
    <a
      href={resource.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-[#f3f4ff] sm:items-center"
    >
      <span
        className={clsx(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:mt-0',
          meta.accent
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#12122a] transition group-hover:text-[#635bff]">
            {resource.label}
          </span>
          <span className="rounded-full bg-[#f3f4ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b6f8c]">
            {resource.badge ?? meta.badge}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-[#6b6f8c] sm:text-sm">{resource.description}</span>
      </span>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#9aa0c3] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#635bff] sm:mt-0" />
      <span className="sr-only">{external ? '(opens externally)' : '(opens in new tab)'}</span>
    </a>
  )
}

export function SupportPage() {
  return (
    <LegalPageShell
      variant="hub"
      title="Support center"
      subtitle="Guides, API references, and quick answers for every platform connected to Unified Access."
    >
      {/* Documentation hub */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#12122a]">
              Product documentation
            </h2>
            <p className="mt-1 text-sm text-[#6b6f8c]">
              Pick a system, then open the guide or API resource you need.
            </p>
          </div>
          <p className="text-xs font-medium text-[#9aa0c3]">{systemDocumentation.length} systems</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {systemDocumentation.map((system, index) => (
            <article
              key={system.id}
              className={clsx(
                'ui-card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(47,42,107,0.45)]',
                'animate-fade-up',
                index === 1 && 'animate-fade-up-delay-1',
                index === 2 && 'animate-fade-up-delay-2'
              )}
            >
              <header className="flex items-center gap-3 border-b border-[#dde1f5] px-5 py-4">
                <div
                  className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl',
                    system.logoTone
                  )}
                >
                  <img
                    src={system.logoSrc}
                    alt=""
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[#12122a]">{system.name}</h3>
                  <p className="truncate text-sm text-[#6b6f8c]">{system.description}</p>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-0.5 p-2 sm:p-3">
                {system.resources.map((resource) => (
                  <ResourceRow key={`${resource.kind}:${resource.href}`} resource={resource} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Quick answers */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#12122a]">Quick answers</h2>
          <p className="mt-1 text-sm text-[#6b6f8c]">Common issues before you open a support ticket.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic) => (
            <div key={topic.title} className="ui-card px-5 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f4ff] text-[#635bff]">
                <topic.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#12122a]">{topic.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6b6f8c]">{topic.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact — after self-serve help */}
      <section className="ui-card flex flex-col gap-4 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#635bff] to-[#7a63ff] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#12122a]">Need personal help?</p>
            <p className="mt-0.5 text-sm text-[#6b6f8c]">
              Account unlocks, role changes, and access requests — include your name and email.
            </p>
            <p className="mt-2 font-mono text-sm font-medium text-[#12122a]">
              Contact Support Administrator
            </p>
          </div>
        </div>
      </section>
    </LegalPageShell>
  )
}
