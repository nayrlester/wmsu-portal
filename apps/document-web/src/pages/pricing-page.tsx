import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { billingApi } from '@/lib/api'
import { formatBytes, formatCurrency } from '@/lib/utils'
import { MARKETING_PLANS } from '@/shared/constants/marketing'
import { useQuery } from '@tanstack/react-query'

const fallbackPlans = MARKETING_PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  monthlyPrice: plan.monthlyPriceUsd,
  maxUsers: plan.maxUsers,
  maxDocuments: plan.maxDocuments,
  maxStorageBytes:
    plan.slug === 'starter'
      ? 5_368_709_120
      : plan.slug === 'business'
        ? 53_687_091_200
        : null,
  features: { ocr: plan.slug !== 'starter' },
}))

export function PricingPage() {
  const { data: apiPlans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => billingApi.plans().then((r) => r.plans),
    retry: false,
  })

  const plans = apiPlans?.length ? apiPlans : fallbackPlans

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h1>
        <p className="mt-4 text-muted-foreground">
          14-day free trial on all plans · Prices in Philippine Peso (₱)
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {isLoading && !apiPlans
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="mt-4 h-10 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))
          : plans.map((plan, index) => (
              <Card
                key={plan.id}
                className={index === 1 ? 'relative border-primary shadow-lg ring-1 ring-primary/20' : 'shadow-sm'}
              >
                {index === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold tabular-nums">
                      {formatCurrency(plan.monthlyPrice, 'PHP', { fromUsd: true })}
                    </span>
                    <span className="text-muted-foreground"> / buwan</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-left text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {plan.maxUsers === null ? 'Unlimited users' : `${plan.maxUsers} users`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {plan.maxDocuments === null
                        ? 'Unlimited documents'
                        : `${plan.maxDocuments.toLocaleString()} documents`}
                    </li>
                    {plan.maxStorageBytes !== null && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {formatBytes(plan.maxStorageBytes)} storage
                      </li>
                    )}
                    {Boolean(plan.features?.ocr) && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        OCR & AI
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link to="/register" className="w-full">
                    <Button className="w-full" variant={index === 1 ? 'default' : 'outline'}>
                      Start free trial
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
      </div>
    </section>
  )
}
