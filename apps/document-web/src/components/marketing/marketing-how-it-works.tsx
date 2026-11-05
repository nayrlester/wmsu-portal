import { HOW_IT_WORKS } from '@/shared/constants/marketing'
import { MarketingSectionHeader } from '@/components/marketing/marketing-section-header'
import { Reveal, Stagger, StaggerItem } from '@/components/marketing/marketing-motion'

export function MarketingHowItWorks() {
  return (
    <section className="bg-muted/15 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <MarketingSectionHeader
          eyebrow="Rollout"
          title="Go live in days, not another six-month IT project"
          align="center"
          className="mx-auto max-w-2xl text-center"
        />

        <div className="mt-16 lg:grid lg:grid-cols-3 lg:gap-8">
          <Stagger className="space-y-0 lg:contents">
            {HOW_IT_WORKS.map((item, index) => (
              <StaggerItem key={item.step} className="relative lg:block">
                {index < HOW_IT_WORKS.length - 1 && (
                  <span
                    className="absolute left-5 top-14 hidden h-full w-px bg-border lg:left-1/2 lg:top-[4.5rem] lg:block lg:h-px lg:w-[calc(100%+2rem)] lg:-translate-x-1/2"
                    aria-hidden
                  />
                )}
                <article className="relative flex gap-5 rounded-2xl border border-border/70 bg-card p-6 lg:flex-col lg:items-center lg:text-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 font-mono text-sm font-semibold text-primary">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal delay={0.08} className="mx-auto mt-12 max-w-xl text-center">
          <p className="text-sm text-muted-foreground">
            Most teams start with one document type — memoranda or permits — then expand workflows per
            department.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
