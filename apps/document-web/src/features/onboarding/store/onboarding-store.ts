import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/shared/store/auth-store'
import type { AuthUser } from '@/shared/types/auth.types'
import {
  onboardingTransition,
  ONBOARDING_INITIAL_STATE,
} from '@/features/onboarding/utils/onboarding.machine'
import type {
  OnboardingDraft,
  OnboardingEvent,
  OnboardingMachineState,
} from '@/features/onboarding/types/onboarding.types'

interface OnboardingStore {
  machine: OnboardingMachineState
  draft: OnboardingDraft
  /** User who just registered and must finish setup before using the app */
  pendingOnboardingUserId: string | null
  dispatch: (event: OnboardingEvent) => void
  updateDraft: (patch: Partial<OnboardingDraft>) => void
  beginOnboarding: (user: AuthUser) => void
  needsOnboarding: () => boolean
}

const emptyDraft: OnboardingDraft = {
  fullName: '',
  email: '',
  organizationName: '',
  selectedPlanSlug: 'business',
  inviteEmails: [],
  workflowName: 'Default approval flow',
  workflowDescription: 'Route documents for manager approval',
  documentTitle: '',
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      machine: ONBOARDING_INITIAL_STATE,
      draft: emptyDraft,
      pendingOnboardingUserId: null,
      dispatch: (event) =>
        set((state) => {
          const machine = onboardingTransition(state.machine, event)
          if (event.type === 'COMPLETE' || event.type === 'RESET') {
            return {
              machine,
              pendingOnboardingUserId: null,
              ...(event.type === 'RESET' ? { draft: emptyDraft } : {}),
            }
          }
          return { machine }
        }),
      updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      beginOnboarding: (user) => {
        set({
          pendingOnboardingUserId: user.id,
          machine: ONBOARDING_INITIAL_STATE,
          draft: emptyDraft,
        })
      },
      needsOnboarding: () => {
        const user = useAuthStore.getState().user
        if (!user?.tenantId || user.isSuperAdmin) return false

        const { machine, pendingOnboardingUserId } = get()
        return pendingOnboardingUserId === user.id && !machine.isComplete
      },
    }),
    { name: 'cdts-onboarding' }
  )
)
