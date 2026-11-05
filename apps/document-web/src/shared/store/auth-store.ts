import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, AuthTokens } from '@/shared/types/auth.types'
import { tokenStorage } from '@/shared/lib/token-storage'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'

export type PermissionsStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  permissions: string[]
  /** False until /permissions/me has resolved for the current session user. */
  permissionsReady: boolean
  permissionsStatus: PermissionsStatus
  isAuthenticated: boolean
  setAuth: (user: AuthUser, tokens: AuthTokens, initialPermissions?: string[]) => void
  setUser: (user: AuthUser) => void
  setPermissions: (permissions: string[]) => void
  setPermissionsLoading: () => void
  setPermissionsError: () => void
  hasPermission: (slug: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      permissions: [],
      permissionsReady: false,
      permissionsStatus: 'idle',
      isAuthenticated: false,
      setAuth: (user, tokens, initialPermissions) => {
        tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)
        const previousUserId = get().user?.id ?? null
        const hydrated = Boolean(user.isSuperAdmin) || Boolean(initialPermissions?.length)
        set({
          user,
          tokens,
          isAuthenticated: true,
          permissions: initialPermissions ?? [],
          permissionsReady: hydrated,
          permissionsStatus: hydrated ? 'ready' : 'loading',
        })
        if (previousUserId !== user.id) {
          useCopilotStore.getState().syncSessionOwner(user.id)
        }
      },
      setUser: (user) => set({ user }),
      setPermissions: (permissions) =>
        set({
          permissions,
          permissionsReady: true,
          permissionsStatus: 'ready',
        }),
      setPermissionsLoading: () =>
        set({
          permissions: [],
          permissionsReady: false,
          permissionsStatus: 'loading',
        }),
      setPermissionsError: () =>
        set({
          permissions: [],
          permissionsReady: true,
          permissionsStatus: 'error',
        }),
      hasPermission: (slug) => {
        const { user, permissions } = get()
        if (user?.isSuperAdmin) return true
        return permissions.includes(slug)
      },
      logout: () => {
        tokenStorage.clear()
        useCopilotStore.getState().resetSession()
        set({
          user: null,
          tokens: null,
          permissions: [],
          permissionsReady: false,
          permissionsStatus: 'idle',
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'cdts-auth',
      // Never persist permissions — always fetch fresh so role edits / user switches cannot leak grants.
      // Tokens also live in tokenStorage; keep a copy here so rehydration stays consistent with isAuthenticated.
      partialize: (s) => ({
        user: s.user,
        tokens: s.tokens,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens?.accessToken && state.tokens.refreshToken) {
          tokenStorage.setTokens(state.tokens.accessToken, state.tokens.refreshToken)
        }
      },
    }
  )
)
