import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Organization } from '@/shared/types'

interface TenantState {
  organization: Organization | null
  organizationName: string | null
  logoUrl: string | null
  primaryColor: string | null
  setOrganization: (org: Organization) => void
  setBranding: (data: { logoUrl?: string | null; primaryColor?: string | null }) => void
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      organization: null,
      organizationName: null,
      logoUrl: null,
      primaryColor: null,
      setOrganization: (org) =>
        set({
          organization: org,
          organizationName: org.name,
        }),
      setBranding: (data) => set(data),
    }),
    {
      name: 'cdts-tenant',
      partialize: (state) => ({
        organization: state.organization,
        organizationName: state.organizationName,
      }),
    }
  )
)
