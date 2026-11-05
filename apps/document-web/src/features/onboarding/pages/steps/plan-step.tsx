import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api'
import { cn, formatCurrency } from '@/lib/utils'
import { MARKETING_PLANS } from '@/shared/constants/marketing'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { CardListSkeleton } from '@/components/desk-app/ux/list-skeleton'
import { Check } from 'lucide-react'

const fallbackPlans = MARKETING_PLANS.map((plan) => ({
  slug: plan.slug,
  name: plan.name,
  monthlyPrice: plan.monthlyPriceUsd,
  description: plan.description,
}))

export function OnboardingPlanStep() {
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-plans'],
    queryFn: () => billingApi.plans().then((response) => response.plans),
  })

  const plans = data?.length
    ? data.map((plan) => ({
        slug: plan.slug,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        description: plan.description ?? '',
      }))
    : fallbackPlans

  return (
    <OnboardingShell
      title="Choose your plan"
      description="Start with a 14-day trial. Upgrade or change plans anytime from Settings."
    >
      {isLoading ? (
        <CardListSkeleton count={3} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Subscription plan">
          {plans.map((plan) => {
            const selected = draft.selectedPlanSlug === plan.slug
            return (
              <button
                key={plan.slug}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateDraft({ selectedPlanSlug: plan.slug })}
                className={cn(
                  'desk-card p-4 text-left transition-all hover:shadow-md',
                  selected && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatCurrency(plan.monthlyPrice, 'PHP', { fromUsd: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">/ buwan · ₱ PHP</p>
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary" aria-hidden />}
                </div>
                {plan.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
      <OnboardingStepActions
        step="plan"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        nextLabel="Continue with trial"
      />
    </OnboardingShell>
  )
}
