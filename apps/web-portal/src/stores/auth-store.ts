import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthPlatform, AuthUser } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  roles: string[]
  platforms: AuthPlatform[]
  isAuthenticated: boolean
  setSession: (payload: {
    accessToken: string
    refreshToken: string
    user: AuthUser
    roles: string[]
    platforms: AuthPlatform[]
  }) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setProfile: (payload: {
    user: AuthUser
    roles: string[]
    platforms: AuthPlatform[]
  }) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      roles: [],
      platforms: [],
      isAuthenticated: false,
      setSession: ({ accessToken, refreshToken, user, roles, platforms }) =>
        set({
          accessToken,
          refreshToken,
          user,
          roles,
          platforms,
          isAuthenticated: true,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setProfile: ({ user, roles, platforms }) => set({ user, roles, platforms }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          roles: [],
          platforms: [],
          isAuthenticated: false,
        }),
      isAdmin: () => get().roles.includes('identity_admin'),
    }),
    {
      name: 'wmsu-portal-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        roles: state.roles,
        platforms: state.platforms,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
