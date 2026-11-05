import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingAccountStep } from '@/features/onboarding/pages/steps/account-step'
import { OnboardingOrganizationStep } from '@/features/onboarding/pages/steps/organization-step'
import { OnboardingPlanStep } from '@/features/onboarding/pages/steps/plan-step'
import { OnboardingTeamStep } from '@/features/onboarding/pages/steps/team-step'
import { OnboardingWorkflowStep } from '@/features/onboarding/pages/steps/workflow-step'
import { OnboardingDocumentStep } from '@/features/onboarding/pages/steps/document-step'
import { SuccessAnimation } from '@/components/desk-app/ux/success-animation'
import { Button } from '@/components/ui/button'

export function OnboardingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const machine = useOnboardingStore((state) => state.machine)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)

  useEffect(() => {
    if (!user) return
    updateDraft({
      fullName: user.fullName ?? '',
      email: user.email,
    })
  }, [user, updateDraft])

  if (!isAuthenticated) {
    return <Navigate to="/register" replace />
  }

  if (user?.isSuperAdmin) {
    // return <Navigate to="/admin" replace />
    return <Navigate to="/app/dashboard" replace />
  }

  if (machine.isComplete) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <SuccessAnimation label="Your workspace is ready!" />
        <p className="mt-2 text-sm text-muted-foreground">
          You can invite more teammates and refine workflows anytime from Settings.
        </p>
        <Button className="mt-6" onClick={() => navigate('/app/dashboard')}>
          Go to dashboard
        </Button>
      </div>
    )
  }

  switch (machine.currentStep) {
    case 'account':
      return <OnboardingAccountStep />
    case 'organization':
      return <OnboardingOrganizationStep />
    case 'plan':
      return <OnboardingPlanStep />
    case 'team':
      return <OnboardingTeamStep />
    case 'workflow':
      return <OnboardingWorkflowStep />
    case 'document':
      return <OnboardingDocumentStep />
    default:
      return <Navigate to="/app/dashboard" replace />
  }
}
