import { describe, expect, it } from 'vitest'
import {
  onboardingTransition,
  ONBOARDING_INITIAL_STATE,
  getOnboardingProgress,
} from '@/features/onboarding/utils/onboarding.machine'

describe('onboardingTransition', () => {
  it('advances through steps on NEXT', () => {
    const afterAccount = onboardingTransition(ONBOARDING_INITIAL_STATE, { type: 'NEXT' })
    expect(afterAccount.currentStep).toBe('organization')
    expect(afterAccount.completedSteps).toContain('account')

    const afterOrg = onboardingTransition(afterAccount, { type: 'NEXT' })
    expect(afterOrg.currentStep).toBe('plan')
  })

  it('goes back on BACK', () => {
    const state = { ...ONBOARDING_INITIAL_STATE, currentStep: 'plan' as const }
    const prev = onboardingTransition(state, { type: 'BACK' })
    expect(prev.currentStep).toBe('organization')
  })

  it('marks complete on COMPLETE', () => {
    const done = onboardingTransition(ONBOARDING_INITIAL_STATE, { type: 'COMPLETE' })
    expect(done.isComplete).toBe(true)
    expect(getOnboardingProgress(done)).toBe(100)
  })

  it('allows SKIP on skippable steps', () => {
    const team = onboardingTransition(
      { currentStep: 'team', completedSteps: ['account', 'organization', 'plan'], isComplete: false },
      { type: 'SKIP' }
    )
    expect(team.currentStep).toBe('workflow')
  })
})
