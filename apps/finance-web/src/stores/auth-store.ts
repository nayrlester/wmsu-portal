import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

export type AuthTokenKind = 'local' | 'platform'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  tokenKind: AuthTokenKind
  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
    tokenKind?: AuthTokenKind
  ) => void
  setTokens: (accessToken: string, refreshToken: string, tokenKind?: AuthTokenKind) => void
  setUser: (user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenKind: 'local',
      setAuth: (user, accessToken, refreshToken, tokenKind = 'local') =>
        set({ user, accessToken, refreshToken, tokenKind }),
      setTokens: (accessToken, refreshToken, tokenKind) =>
        set((state) => ({
          accessToken,
          refreshToken,
          tokenKind: tokenKind ?? state.tokenKind,
        })),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, tokenKind: 'local' }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'uims-auth' }
  )
)
