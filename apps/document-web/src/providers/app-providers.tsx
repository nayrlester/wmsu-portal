import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { HttpNotifyBootstrap, NotificationProvider } from '@wmsu/ui'
import { QueryProvider } from './query-provider'
import { FeatureFlagsProvider } from './feature-flags-provider'
import { ToastContainer } from '@/components/desk-app/ux/toast-container'
import { ConfirmDialogProvider } from '@/components/desk-app/ux/confirm-dialog-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <HttpNotifyBootstrap />
      <QueryProvider>
      <FeatureFlagsProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            {children}
            <ToastContainer />
          </BrowserRouter>
        </ConfirmDialogProvider>
      </FeatureFlagsProvider>
    </QueryProvider>
    </NotificationProvider>
  )
}
