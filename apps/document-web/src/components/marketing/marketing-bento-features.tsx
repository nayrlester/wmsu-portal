import { Reveal, Stagger, StaggerItem } from '@/components/marketing/marketing-motion'
import { MarketingSectionHeader } from '@/components/marketing/marketing-section-header'

const features = [
  {
    num: '01',
    title: 'Tracking numbers anyone can actually use',
    description:
      'DTS-formatted IDs, printable QR receipts, and a public status page — no account needed for external follow-up.',
  },
  {
    num: '02',
    title: 'Workflows that mirror your offices',
    description:
      'Route by department and role. Parallel legal review, sequential executive approval, SLA timers when papers sit too long.',
  },
  {
    num: '03',
    title: 'Audit trail by default',
    description:
      'Every forward, return, and approval is logged with timestamps. Tenant isolation and RBAC for sensitive records.',
  },
  {
    num: '04',
    title: 'Reports ops teams open daily',
    description:
      'Backlogs by office, overdue counts, and storage usage — so you fix bottlenecks before they become headlines.',
  },
  {
    num: '05',
    title: 'Notifications that reach the right desk',
    description:
      'In-app and email alerts when a document lands in your queue or breaches an SLA window.',
  },
] as const

export function MarketingBentoFeatures() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4 lg:pt-2">
            <MarketingSectionHeader
              eyebrow="Platform"
              title="Built around how government, companies, and offices actually move paper"
              description="Not another generic task board — routing, accountability, and public-facing status in one workspace."
            />
          </div>

          <Stagger className="space-y-3 lg:col-span-8">
            {features.map((feature) => (
              <StaggerItem key={feature.num}>
                <article className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-5 transition-premium hover:border-primary/30 hover:bg-card sm:p-6">
                  <div
                    className="absolute inset-y-0 left-0 w-1 scale-y-0 bg-primary transition-transform duration-300 group-hover:scale-y-100"
                    aria-hidden
                  />
                  <div className="flex gap-5 sm:gap-6">
                    <span className="mt-0.5 font-mono text-xs font-medium text-primary/80">{feature.num}</span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.1} className="mt-10">
          <div className="rounded-2xl border border-dashed border-border/90 bg-muted/20 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Demo workspace ready.</span> Log in as tenant owner
              and submit a memorandum in under two minutes.
            </p>
            <p className="mt-2 font-mono text-xs text-primary sm:mt-0">owner@gmail.com</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
