import { Suspense } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { MarketingLayout } from '@/layouts/marketing-layout'
import { RouteFallback } from '@/components/shared/route-fallback'
import { PricingPage } from '@/routes/lazy-pages'

export const marketingRoutes = (
  <>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route element={<MarketingLayout />}>
      <Route
        path="/pricing"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PricingPage />
          </Suspense>
        }
      />
    </Route>
  </>
)
