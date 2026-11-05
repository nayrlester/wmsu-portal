import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS } from '@/features/onboarding/types/onboarding.types'
import type { OnboardingStepId } from '@/features/onboarding/types/onboarding.types'

interface OnboardingProgressProps {
  currentStep: OnboardingStepId
  completedSteps: OnboardingStepId[]
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {ONBOARDING_STEPS.map((step) => {
          const done = completedSteps.includes(step.id)
          const active = step.id === currentStep
          return (
            <li key={step.id} className="flex items-center gap-2 sm:flex-1 sm:flex-col sm:text-center">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  done && 'bg-emerald-500 text-white',
                  active && !done && 'bg-primary text-primary-foreground',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {step.order}
              </span>
              <div className="min-w-0 sm:mt-2">
                <p className={cn('truncate text-xs font-medium', active && 'text-primary')}>
                  {step.title}
                </p>
                <p className="hidden text-[10px] text-muted-foreground sm:block">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
