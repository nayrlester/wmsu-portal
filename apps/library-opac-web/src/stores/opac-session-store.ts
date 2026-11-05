import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OpacSessionState {
  accessToken: string | null
  refreshToken: string | null
  email: string | null
  fullName: string | null
  setSession: (input: {
    accessToken: string
    refreshToken: string
    email: string
    fullName: string
  }) => void
  clear: () => void
  isSignedIn: () => boolean
}

export const useOpacSessionStore = create<OpacSessionState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      email: null,
      fullName: null,
      setSession: (input) =>
        set({
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          email: input.email,
          fullName: input.fullName,
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          email: null,
          fullName: null,
        }),
      isSignedIn: () => Boolean(get().accessToken),
    }),
    { name: 'ulmis-opac-session' }
  )
)
