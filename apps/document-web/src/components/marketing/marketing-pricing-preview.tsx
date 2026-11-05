import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MARKETING_PLANS } from '@/shared/constants/marketing'
import { cn } from '@/lib/utils'
import { MarketingSectionHeader } from '@/components/marketing/marketing-section-header'
import { Stagger, StaggerItem } from '@/components/marketing/marketing-motion'

export function MarketingPricingPreview() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <MarketingSectionHeader
          eyebrow="Pricing"
          title="PHP pricing that matches local budget cycles"
          description="14-day trial on every plan. Upgrade when your offices are ready — no surprise per-document fees."
          align="center"
          className="mx-auto max-w-2xl text-center"
        />

        <Stagger className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {MARKETING_PLANS.map((plan) => (
            <StaggerItem key={plan.id}>
              <article
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-premium',
                  plan.popular
                    ? 'border-primary/35 shadow-[0_20px_60px_-40px_rgba(37,99,235,0.55)]'
                    : 'border-border/80 hover:border-border'
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-md bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Recommended
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tabular-nums tracking-tight">
                      {formatCurrency(plan.monthlyPricePhp)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border/60 pt-6">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {plan.maxUsers === null ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}
                  </li>
                </ul>

                <Link to="/register" className="mt-8 block">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    Start free trial
                  </Button>
                </Link>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Procurement-friendly annual quotes available.{' '}
          <Link to="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
            Compare full plan details
          </Link>
        </p>
      </div>
    </section>
  )
}
