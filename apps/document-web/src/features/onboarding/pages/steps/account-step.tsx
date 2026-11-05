import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OnboardingAccountStep() {
  const user = useAuthStore((state) => state.user)
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)

  return (
    <OnboardingShell
      title="Confirm your account"
      description="Your profile is used across approvals, audit logs, and notifications."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="onboard-name">Full name</Label>
          <Input
            id="onboard-name"
            value={draft.fullName || user?.fullName || ''}
            onChange={(event) => updateDraft({ fullName: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="onboard-email">Work email</Label>
          <Input id="onboard-email" value={draft.email || user?.email || ''} readOnly aria-readonly />
        </div>
      </div>
      <OnboardingStepActions
        step="account"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={() => dispatch({ type: 'NEXT' })}
        disableNext={!draft.fullName && !user?.fullName}
      />
    </OnboardingShell>
  )
}
