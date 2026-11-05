import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useThemeInit } from '@/shared/hooks/use-theme-init'
import { marketingRoutes } from '@/routes/marketing.routes'
import { authRoutes } from '@/routes/auth.routes'
import { appRoutes } from '@/routes/app.routes'
import { adminRoutes } from '@/routes/admin.routes'
import { PublicTrackPage } from '@/routes/lazy-pages'
import { RouteFallback } from '@/components/shared/route-fallback'

export function AppRouter() {
  useThemeInit()

  return (
    <Routes>
      {marketingRoutes}
      {authRoutes}
      <Route
        path="/track"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PublicTrackPage />
          </Suspense>
        }
      />
      <Route
        path="/track/:trackingNumber"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PublicTrackPage />
          </Suspense>
        }
      />
      {appRoutes}
      {adminRoutes}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
