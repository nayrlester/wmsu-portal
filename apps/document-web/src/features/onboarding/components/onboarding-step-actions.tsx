import { Button } from '@/components/ui/button'
import { canGoBack, isSkippableStep } from '@/features/onboarding/utils/onboarding.machine'
import type { OnboardingStepId } from '@/features/onboarding/types/onboarding.types'

interface OnboardingStepActionsProps {
  step: OnboardingStepId
  onBack: () => void
  onNext: () => void
  onSkip?: () => void
  nextLabel?: string
  loading?: boolean
  disableNext?: boolean
}

export function OnboardingStepActions({
  step,
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  loading,
  disableNext,
}: OnboardingStepActionsProps) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      {canGoBack(step) ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2 sm:ml-auto">
        {isSkippableStep(step) && onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={loading}>
            Skip for now
          </Button>
        )}
        <Button type="button" onClick={onNext} disabled={loading || disableNext}>
          {loading ? 'Saving…' : nextLabel}
        </Button>
      </div>
    </div>
  )
}
