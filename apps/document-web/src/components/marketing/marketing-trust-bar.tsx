import { Reveal } from '@/components/marketing/marketing-motion'
import { TRUST_INDUSTRIES } from '@/shared/constants/marketing'

export function MarketingTrustBar() {
  return (
    <section className="border-b border-border/60 bg-muted/15 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Deployed across
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm text-foreground/75 sm:justify-end">
              {TRUST_INDUSTRIES.map((industry, index) => (
                <li key={industry} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="hidden text-border sm:inline" aria-hidden>
                      /
                    </span>
                  )}
                  <span className="transition-premium hover:text-foreground">{industry}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
