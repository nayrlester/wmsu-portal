import {
  ONBOARDING_STEPS,
  type OnboardingEvent,
  type OnboardingMachineState,
  type OnboardingStepId,
} from '@/features/onboarding/types/onboarding.types'

const STEP_ORDER = ONBOARDING_STEPS.map((step) => step.id)

export const ONBOARDING_INITIAL_STATE: OnboardingMachineState = {
  currentStep: 'account',
  completedSteps: [],
  isComplete: false,
}

function stepIndex(step: OnboardingStepId): number {
  return STEP_ORDER.indexOf(step)
}

function markCompleted(state: OnboardingMachineState, step: OnboardingStepId): OnboardingStepId[] {
  return state.completedSteps.includes(step)
    ? state.completedSteps
    : [...state.completedSteps, step]
}

export function onboardingTransition(
  state: OnboardingMachineState,
  event: OnboardingEvent
): OnboardingMachineState {
  switch (event.type) {
    case 'RESET':
      return ONBOARDING_INITIAL_STATE

    case 'COMPLETE':
      return {
        currentStep: 'document',
        completedSteps: STEP_ORDER,
        isComplete: true,
      }

    case 'GOTO': {
      const index = stepIndex(event.step)
      if (index < 0) return state
      return { ...state, currentStep: event.step }
    }

    case 'BACK': {
      const prev = STEP_ORDER[stepIndex(state.currentStep) - 1]
      if (!prev) return state
      return { ...state, currentStep: prev }
    }

    case 'SKIP':
    case 'NEXT': {
      const completed = markCompleted(state, state.currentStep)
      const next = STEP_ORDER[stepIndex(state.currentStep) + 1]
      if (!next) {
        return { currentStep: state.currentStep, completedSteps: completed, isComplete: true }
      }
      return { currentStep: next, completedSteps: completed, isComplete: false }
    }

    default:
      return state
  }
}

export function getOnboardingProgress(state: OnboardingMachineState): number {
  if (state.isComplete) return 100
  const index = stepIndex(state.currentStep)
  return Math.round(((index + 1) / STEP_ORDER.length) * 100)
}

export function canGoBack(step: OnboardingStepId): boolean {
  return stepIndex(step) > 0
}

export function isSkippableStep(step: OnboardingStepId): boolean {
  return step === 'team' || step === 'workflow'
}
