import { toast } from '@/shared/store/toast-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function OnboardingWorkflowStep() {
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)

  const handleNext = () => {
    toast.success(
      'Default workflow ready',
      'A published approval workflow was created with your organization. Customize it anytime under Workflows.'
    )
    dispatch({ type: 'NEXT' })
  }

  return (
    <OnboardingShell
      title="Set up your first workflow"
      description="Your workspace already includes a default approval flow. You can rename it here for your team."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow-name">Workflow name</Label>
          <Input
            id="workflow-name"
            value={draft.workflowName}
            onChange={(event) => updateDraft({ workflowName: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-desc">Description</Label>
          <Textarea
            id="workflow-desc"
            rows={3}
            value={draft.workflowDescription}
            onChange={(event) => updateDraft({ workflowDescription: event.target.value })}
          />
        </div>
      </div>
      <OnboardingStepActions
        step="workflow"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={handleNext}
        onSkip={() => dispatch({ type: 'SKIP' })}
        disableNext={draft.workflowName.trim().length < 3}
      />
    </OnboardingShell>
  )
}
