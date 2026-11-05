export type OnboardingStepId =
  | 'account'
  | 'organization'
  | 'plan'
  | 'team'
  | 'workflow'
  | 'document'

export interface OnboardingStepMeta {
  id: OnboardingStepId
  title: string
  description: string
  order: number
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { id: 'account', order: 1, title: 'Create account', description: 'Set up your profile and credentials' },
  { id: 'organization', order: 2, title: 'Organization', description: 'Name your tenant workspace' },
  { id: 'plan', order: 3, title: 'Choose plan', description: 'Select the right subscription tier' },
  { id: 'team', order: 4, title: 'Invite team', description: 'Add colleagues to your organization' },
  { id: 'workflow', order: 5, title: 'First workflow', description: 'Configure document routing' },
  { id: 'document', order: 6, title: 'First document', description: 'Upload and track your first file' },
]

export interface OnboardingDraft {
  fullName: string
  email: string
  organizationName: string
  selectedPlanSlug: string
  inviteEmails: string[]
  workflowName: string
  workflowDescription: string
  documentTitle: string
}

export type OnboardingEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; step: OnboardingStepId }
  | { type: 'SKIP' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }

export interface OnboardingMachineState {
  currentStep: OnboardingStepId
  completedSteps: OnboardingStepId[]
  isComplete: boolean
}
