import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface KioskStaffState {
  accessToken: string | null
  refreshToken: string | null
  email: string | null
  fullName: string | null
  setStaffSession: (input: {
    accessToken: string
    refreshToken: string
    email: string
    fullName: string
  }) => void
  clear: () => void
  isStaffSignedIn: () => boolean
}

export const useKioskStaffStore = create<KioskStaffState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      email: null,
      fullName: null,
      setStaffSession: (input) =>
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
      isStaffSignedIn: () => Boolean(get().accessToken),
    }),
    { name: 'ulmis-kiosk-staff' }
  )
)
