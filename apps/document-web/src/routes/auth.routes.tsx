import { Suspense } from 'react'
import { Route } from 'react-router-dom'
import { AuthLayout } from '@/layouts/auth-layout'
import { RouteFallback } from '@/components/shared/route-fallback'
import { LoginPage, RegisterPage } from '@/routes/lazy-pages'
import { SsoCallbackPage } from '@/features/auth/pages/sso-callback.page'
import { SsoLogoutPage } from '@/features/auth/pages/sso-logout.page'

export const authRoutes = (
  <>
    <Route
      path="/sso/callback"
      element={
        <Suspense fallback={<RouteFallback />}>
          <SsoCallbackPage />
        </Suspense>
      }
    />
    <Route
      path="/sso/logout"
      element={
        <Suspense fallback={<RouteFallback />}>
          <SsoLogoutPage />
        </Suspense>
      }
    />
    <Route element={<AuthLayout />}>
      <Route
        path="/login"
        element={
          <Suspense fallback={<RouteFallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RegisterPage />
          </Suspense>
        }
      />
    </Route>
  </>
)
