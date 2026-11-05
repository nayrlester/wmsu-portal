import { Reveal, Stagger, StaggerItem } from '@/components/marketing/marketing-motion'
import { MARKETING_STATS } from '@/shared/constants/marketing'

export function MarketingStats() {
  return (
    <section className="relative overflow-hidden border-y border-border/80 bg-foreground py-16 text-background sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
        aria-hidden
      />
      <Stagger className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-8">
        {MARKETING_STATS.map((stat) => (
          <StaggerItem key={stat.label}>
            <div className="border-l border-background/15 pl-5 lg:pl-6">
              <p className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{stat.value}</p>
              <p className="mt-2 max-w-[12rem] text-sm leading-snug text-background/65">{stat.label}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="relative mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs text-background/45 lg:text-left">
          Aggregate metrics from pilot deployments · Updated quarterly
        </p>
      </Reveal>
    </section>
  )
}
