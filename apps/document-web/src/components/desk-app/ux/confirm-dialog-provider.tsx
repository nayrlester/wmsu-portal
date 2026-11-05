import { createContext, useContext, type ReactNode } from 'react'
import {
  swalAlert,
  swalConfirm,
  swalPrompt,
  type AlertOptions,
  type ConfirmOptions,
  type PromptOptions,
} from '@/lib/sweet-alert'

export type { ConfirmOptions }

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions | string) => Promise<void>
  prompt: (options: PromptOptions | string) => Promise<string | null>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

const dialogApi: ConfirmContextValue = {
  confirm: swalConfirm,
  alert: swalAlert,
  prompt: swalPrompt,
}

/** SweetAlert2-backed confirms (keeps useConfirm API used across DocTrack). */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  return <ConfirmContext.Provider value={dialogApi}>{children}</ConfirmContext.Provider>
}

export function useConfirm(): ConfirmContextValue['confirm'] {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return context.confirm
}

export function useDialog(): ConfirmContextValue {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useDialog must be used within ConfirmDialogProvider')
  }
  return context
}
