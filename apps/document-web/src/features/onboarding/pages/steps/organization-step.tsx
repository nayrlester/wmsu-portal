import { useState } from 'react'
import { authApi, settingsApi } from '@/api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { syncUserTenantFromOrganization } from '@/shared/lib/tenant-session'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { useTenantStore } from '@/stores/tenant-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function OnboardingOrganizationStep() {
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)
  const organization = useTenantStore((state) => state.organization)
  const setOrganization = useTenantStore((state) => state.setOrganization)
  const setUser = useAuthStore((state) => state.setUser)
  const [loading, setLoading] = useState(false)

  const handleNext = async () => {
    setLoading(true)
    try {
      syncUserTenantFromOrganization()

      const user = useAuthStore.getState().user
      if (user?.isSuperAdmin) {
        toast.error(
          'Platform admin account',
          'Sign in with your organization workspace account to finish onboarding.'
        )
        return
      }

      let tenantId = user?.tenantId ?? organization?.id
      if (!tenantId) {
        const profile = await authApi.profile()
        setUser(profile)
        tenantId = profile.tenantId ?? undefined
      }

      if (!tenantId) {
        toast.error(
          'Workspace not linked',
          'Your session is missing an organization. Try signing out and registering again.'
        )
        return
      }

      const trimmedName = draft.organizationName.trim()
      if (organization?.name === trimmedName) {
        toast.success('Organization ready', trimmedName)
        dispatch({ type: 'NEXT' })
        return
      }

      const org = await settingsApi.updateOrganization({ name: trimmedName })
      setOrganization(org)
      if (user && user.tenantId !== org.id) {
        setUser({ ...user, tenantId: org.id })
      }
      toast.success('Organization saved', org.name)
      dispatch({ type: 'NEXT' })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Check the name and try again.'
      toast.error('Could not save organization', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      title="Create your organization"
      description="This becomes your tenant workspace — all documents and users are isolated here."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name *</Label>
          <Input
            id="org-name"
            value={draft.organizationName}
            onChange={(event) => updateDraft({ organizationName: event.target.value })}
            placeholder="e.g. City Government of Demo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-purpose">Primary use case (optional)</Label>
          <Textarea
            id="org-purpose"
            rows={3}
            placeholder="Document routing, legislative tracking, permit approvals…"
          />
        </div>
      </div>
      <OnboardingStepActions
        step="organization"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={handleNext}
        loading={loading}
        disableNext={draft.organizationName.trim().length < 2}
      />
    </OnboardingShell>
  )
}
