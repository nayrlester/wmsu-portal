import { Suspense, type ComponentType } from 'react'
import { Route } from 'react-router-dom'
import { AdminLayout } from '@/layouts/admin-layout'
import { SuperAdminGuard } from '@/routes/guards/super-admin-guard'
import { RouteFallback } from '@/components/shared/route-fallback'
import {
  AdminDashboardPage,
  AdminTenantsPage,
  AdminPlansPage,
  AdminBillingPage,
} from '@/routes/lazy-pages'

const suspense = (Page: ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Page />
  </Suspense>
)

export const adminRoutes = (
  <Route element={<SuperAdminGuard />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={suspense(AdminDashboardPage)} />
      <Route path="tenants" element={suspense(AdminTenantsPage)} />
      <Route path="plans" element={suspense(AdminPlansPage)} />
      <Route path="billing" element={suspense(AdminBillingPage)} />
    </Route>
  </Route>
)
