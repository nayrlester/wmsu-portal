import type { ReactNode } from 'react'
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress'
import { getOnboardingProgress } from '@/features/onboarding/utils/onboarding.machine'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'

interface OnboardingShellProps {
  children: ReactNode
  title: string
  description?: string
}

export function OnboardingShell({ children, title, description }: OnboardingShellProps) {
  const machine = useOnboardingStore((state) => state.machine)
  const progress = getOnboardingProgress(machine)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workspace setup · {progress}%
            </p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <OnboardingProgress
          currentStep={machine.currentStep}
          completedSteps={machine.completedSteps}
        />
      </header>
      <section className="desk-card p-6">{children}</section>
    </div>
  )
}
