import { createContext, useContext, type ReactNode } from 'react'
import {
  swalAlert,
  swalConfirm,
  swalPrompt,
  toast,
  type AlertOptions,
  type ConfirmOptions,
  type PromptOptions,
} from '@/lib/sweet-alert'

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions | string) => Promise<void>
  prompt: (options: PromptOptions | string) => Promise<string | null>
  toast: typeof toast
}

const DialogContext = createContext<DialogContextValue | null>(null)

const dialogApi: DialogContextValue = {
  confirm: swalConfirm,
  alert: swalAlert,
  prompt: swalPrompt,
  toast,
}

export function DialogProvider({ children }: { children: ReactNode }) {
  return <DialogContext.Provider value={dialogApi}>{children}</DialogContext.Provider>
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}
