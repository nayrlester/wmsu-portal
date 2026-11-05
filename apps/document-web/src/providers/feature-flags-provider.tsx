import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { FEATURE_FLAGS } from '@/shared/constants/env'

type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

interface FeatureFlagsContextValue {
  isEnabled: (flag: FeatureFlagKey) => boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null)

interface FeatureFlagsProviderProps {
  children: ReactNode
  /** Remote flags from tenant settings or LaunchDarkly — defaults to all enabled in dev */
  flags?: Partial<Record<FeatureFlagKey, boolean>>
}

export function FeatureFlagsProvider({ children, flags = {} }: FeatureFlagsProviderProps) {
  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      isEnabled: (flag) => flags[flag] ?? true,
    }),
    [flags]
  )

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
}

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const context = useContext(FeatureFlagsContext)
  if (!context) return true
  return context.isEnabled(flag)
}
