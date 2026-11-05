import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDefaultTenantSlug } from '@librastack/client-config'

interface KioskSessionState {
  deviceCode: string
  apiKey: string
  tenantSlug: string
  deviceName: string
  idleTimeoutSeconds: number
  setCredentials: (input: {
    deviceCode: string
    apiKey: string
    tenantSlug?: string
    deviceName?: string
    idleTimeoutSeconds?: number
  }) => void
  clear: () => void
  isConfigured: () => boolean
}

export const useKioskSessionStore = create<KioskSessionState>()(
  persist(
    (set, get) => ({
      deviceCode: '',
      apiKey: '',
      tenantSlug: getDefaultTenantSlug(),
      deviceName: '',
      idleTimeoutSeconds: 60,
      setCredentials: (input) =>
        set({
          deviceCode: input.deviceCode.trim(),
          apiKey: input.apiKey.trim(),
          tenantSlug: (input.tenantSlug || getDefaultTenantSlug()).trim().toLowerCase(),
          deviceName: input.deviceName ?? get().deviceName,
          idleTimeoutSeconds: input.idleTimeoutSeconds ?? get().idleTimeoutSeconds,
        }),
      clear: () =>
        set({
          deviceCode: '',
          apiKey: '',
          tenantSlug: getDefaultTenantSlug(),
          deviceName: '',
          idleTimeoutSeconds: 60,
        }),
      isConfigured: () => Boolean(get().deviceCode && get().apiKey),
    }),
    { name: 'ulmis-kiosk-session' }
  )
)
