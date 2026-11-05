import { useEffect, useState } from 'react'
import { Building2, CreditCard, FileStack, Shield, Sliders, Archive } from 'lucide-react'
import { PageContainer, ContentWrapper, WidgetCard } from '@/components/desk-app'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  useOrganization,
  useSubscription,
  useSubscriptionUsage,
  useTenantSettings,
  useBillingPlans,
  useUpdateOrganization,
  useUpdateTenantSettings,
  useUpgradePlan,
  useDowngradePlan,
} from '@/hooks/use-api'
import { ApiError } from '@/api/errors/api-error'
import { toast } from '@/shared/store/toast-store'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/shared/constants/env'
import { formatBytes, formatCurrency } from '@/lib/utils'
import type { TenantSettings } from '@/types/api'
import { DepartmentsPanel } from '@/features/settings/components/departments-panel'
import { DocumentTypesPanel } from '@/features/settings/components/document-types-panel'
import { RolesPanel } from '@/features/settings/components/roles-panel'
import { RetentionSchedulesPanel } from '@/features/settings/components/retention-schedules-panel'
import { useConfirm } from '@/components/desk-app/ux/confirm-dialog-provider'

/** Plan change UI — set to true to show upgrade/downgrade cards in Subscription tab */
const SHOW_PLAN_CHANGE = false

const PLAN_RANK: Record<string, number> = {
  starter: 1,
  business: 2,
  enterprise: 3,
}

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English (en)' },
  { value: 'en-PH', label: 'English — Philippines (en-PH)' },
  { value: 'fil', label: 'Filipino (fil)' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
]

function showApiError(title: string, err: unknown) {
  const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
  toast.error(title, message)
}

export function SettingsPage() {
  const permissions = useAuthStore((s) => s.permissions)
  const user = useAuthStore((s) => s.user)
  const canManageBilling = permissions.includes(PERMISSIONS.billingManage)
  const canManageRoles = Boolean(user?.isSuperAdmin) || permissions.includes(PERMISSIONS.rolesManage)

  const { data: org, isLoading: orgLoading } = useOrganization()
  const { data: subscription, isLoading: subLoading } = useSubscription()
  const { data: usage } = useSubscriptionUsage()
  const { data: tenantSettings, isLoading: settingsLoading } = useTenantSettings()
  const { data: plansData, isLoading: plansLoading } = useBillingPlans()

  const updateOrg = useUpdateOrganization()
  const updateSettings = useUpdateTenantSettings()
  const upgradePlan = useUpgradePlan()
  const downgradePlan = useDowngradePlan()
  const confirm = useConfirm()

  const [orgName, setOrgName] = useState('')
  const [prefs, setPrefs] = useState<TenantSettings>({
    timezone: 'Asia/Manila',
    locale: 'en',
    dateFormat: 'YYYY-MM-DD',
    trackingPrefix: 'DTS',
  })

  useEffect(() => {
    if (org?.name) setOrgName(org.name)
  }, [org?.name])

  useEffect(() => {
    if (tenantSettings) setPrefs(tenantSettings)
  }, [tenantSettings])

  const plan = subscription?.subscription?.plan ?? subscription?.plan
  const currentPlanSlug = plan?.slug ?? usage?.plan.slug ?? ''
  const currentRank = PLAN_RANK[currentPlanSlug] ?? 0
  const billingCycle = subscription?.subscription?.billingCycle ?? 'monthly'

  const handleSaveOrganization = async () => {
    const name = orgName.trim()
    if (name.length < 2) {
      toast.error('Invalid name', 'Organization name must be at least 2 characters.')
      return
    }

    try {
      await updateOrg.mutateAsync({ name })
      toast.success('Organization updated')
    } catch (err) {
      showApiError('Could not save organization', err)
    }
  }

  const handleSavePreferences = async () => {
    if (prefs.trackingPrefix.trim().length < 2) {
      toast.error('Invalid tracking prefix', 'Use at least 2 characters.')
      return
    }

    try {
      await updateSettings.mutateAsync({
        timezone: prefs.timezone.trim(),
        locale: prefs.locale,
        dateFormat: prefs.dateFormat,
        trackingPrefix: prefs.trackingPrefix.trim().toUpperCase(),
      })
      toast.success('Preferences saved')
    } catch (err) {
      showApiError('Could not save preferences', err)
    }
  }

  const handleUpgrade = async (planSlug: string) => {
    try {
      await upgradePlan.mutateAsync({ planSlug, billingCycle })
      toast.success('Plan upgraded', 'Your subscription has been updated.')
    } catch (err) {
      showApiError('Upgrade failed', err)
    }
  }

  const handleDowngrade = async (planSlug: string) => {
    const approved = await confirm({
      title: 'Schedule downgrade',
      description:
        'Downgrade will take effect at the end of the current billing period. Continue?',
      confirmLabel: 'Continue',
      variant: 'destructive',
    })
    if (!approved) return

    try {
      await downgradePlan.mutateAsync({ planSlug, billingCycle, immediate: false })
      toast.success('Downgrade scheduled', 'Your plan will change at the end of this billing period.')
    } catch (err) {
      showApiError('Downgrade failed', err)
    }
  }

  const planChangePending = upgradePlan.isPending || downgradePlan.isPending

  return (
    <PageContainer
      title="Settings"
      breadcrumb="Home / Settings"
      description="Organization, subscription, and preferences"
    >
      <ContentWrapper>
        <Tabs defaultValue="organization">
          <TabsList className="desk-card flex h-auto w-full flex-wrap justify-start gap-1 border p-1 shadow-none">
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" aria-hidden />
              Organization
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="h-4 w-4" aria-hidden />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Sliders className="h-4 w-4" aria-hidden />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="document-setup" className="gap-2">
              <FileStack className="h-4 w-4" aria-hidden />
              Document setup
            </TabsTrigger>
            <TabsTrigger value="retention" className="gap-2">
              <Archive className="h-4 w-4" aria-hidden />
              Retention
            </TabsTrigger>
            {canManageRoles && (
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" aria-hidden />
                Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="organization" className="mt-4">
            <WidgetCard title="Organization profile">
              {orgLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : org ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</p>
                      <p className="mt-1 font-mono text-sm">{org.slug}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                      <Badge className="mt-1 capitalize">{org.status}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization name</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveOrganization} disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              ) : null}
            </WidgetCard>
          </TabsContent>

          <TabsContent value="subscription" className="mt-4 space-y-4">
            <WidgetCard title="Current subscription">
              {subLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
                    <p className="mt-1 text-lg font-semibold">{plan?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing cycle</p>
                    <p className="mt-1 capitalize">{billingCycle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                    <Badge className="mt-1 capitalize">{subscription?.subscription?.status ?? 'active'}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Storage used</p>
                    <p className="mt-1 text-lg font-semibold">{formatBytes(usage?.usage.storageBytes ?? 0)}</p>
                  </div>
                </div>
              )}
            </WidgetCard>

            {SHOW_PLAN_CHANGE && (
              <WidgetCard title="Change plan">
                {!canManageBilling && (
                  <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    Only users with billing permission (typically Tenant Owner) can upgrade or downgrade plans.
                  </p>
                )}

                {plansLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {plansData?.plans.map((billingPlan) => {
                      const rank = PLAN_RANK[billingPlan.slug] ?? 0
                      const isCurrent = billingPlan.slug === currentPlanSlug
                      const canUpgrade = canManageBilling && rank > currentRank
                      const canDowngrade = canManageBilling && rank < currentRank && currentRank > 0

                      return (
                        <div
                          key={billingPlan.id}
                          className="flex flex-col rounded-lg border border-border p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold">{billingPlan.name}</h3>
                            {isCurrent && <Badge variant="secondary">Current</Badge>}
                          </div>
                          {billingPlan.description && (
                            <p className="mt-2 text-sm text-muted-foreground">{billingPlan.description}</p>
                          )}
                          <p className="mt-3 text-lg font-semibold tabular-nums">
                            {formatCurrency(billingPlan.monthlyPrice, 'PHP', { fromUsd: true })}
                            <span className="text-sm font-normal text-muted-foreground">/ buwan · ₱ PHP</span>
                          </p>
                          <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                            {billingPlan.maxUsers != null && <li>Up to {billingPlan.maxUsers} users</li>}
                            {billingPlan.maxDocuments != null && (
                              <li>Up to {billingPlan.maxDocuments.toLocaleString()} documents</li>
                            )}
                            {billingPlan.maxStorageBytes != null && (
                              <li>{formatBytes(billingPlan.maxStorageBytes)} storage</li>
                            )}
                          </ul>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canUpgrade && (
                              <Button
                                size="sm"
                                onClick={() => handleUpgrade(billingPlan.slug)}
                                disabled={planChangePending}
                              >
                                Upgrade
                              </Button>
                            )}
                            {canDowngrade && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDowngrade(billingPlan.slug)}
                                disabled={planChangePending}
                              >
                                Downgrade
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </WidgetCard>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="mt-4">
            <WidgetCard title="Workspace preferences">
              {settingsLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pref-timezone">Timezone</Label>
                      <Input
                        id="pref-timezone"
                        value={prefs.timezone}
                        onChange={(event) => setPrefs((current) => ({ ...current, timezone: event.target.value }))}
                        placeholder="Asia/Manila"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-tracking">Tracking prefix</Label>
                      <Input
                        id="pref-tracking"
                        value={prefs.trackingPrefix}
                        onChange={(event) =>
                          setPrefs((current) => ({ ...current, trackingPrefix: event.target.value.toUpperCase() }))
                        }
                        placeholder="DTS"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-locale">Locale</Label>
                      <Select
                        id="pref-locale"
                        value={prefs.locale}
                        onChange={(event) => setPrefs((current) => ({ ...current, locale: event.target.value }))}
                      >
                        {LOCALE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-date-format">Date format</Label>
                      <Select
                        id="pref-date-format"
                        value={prefs.dateFormat}
                        onChange={(event) => setPrefs((current) => ({ ...current, dateFormat: event.target.value }))}
                      >
                        {DATE_FORMAT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleSavePreferences} disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving…' : 'Save preferences'}
                  </Button>
                </div>
              )}
            </WidgetCard>
          </TabsContent>

          <TabsContent value="document-setup" className="mt-4 space-y-4">
            <DepartmentsPanel />
            <DocumentTypesPanel />
          </TabsContent>

          <TabsContent value="retention" className="mt-4">
            <WidgetCard title="Records retention">
              <RetentionSchedulesPanel />
            </WidgetCard>
          </TabsContent>

          {canManageRoles && (
            <TabsContent value="roles" className="mt-4">
              <RolesPanel />
            </TabsContent>
          )}
        </Tabs>
      </ContentWrapper>
    </PageContainer>
  )
}
