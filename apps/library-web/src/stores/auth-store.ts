import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthTokens, AuthUser, TenantInfo } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  tenant: TenantInfo | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  setSession: (user: AuthUser, tenant: TenantInfo, tokens: AuthTokens) => void
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      tokens: null,
      isAuthenticated: false,
      setSession: (user, tenant, tokens) =>
        set({ user, tenant, tokens, isAuthenticated: true }),
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ user: null, tenant: null, tokens: null, isAuthenticated: false }),
    }),
    {
      name: 'librastack-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
