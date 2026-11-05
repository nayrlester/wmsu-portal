import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { Alert } from './alert'

export type NotificationTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export type NotificationItem = {
  id: string
  title: string
  description?: string
  tone?: NotificationTone
}

type NotificationContextValue = {
  notify: (item: Omit<NotificationItem, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (item: Omit<NotificationItem, 'id'> & { id?: string }) => {
      const id = item.id ?? crypto.randomUUID()
      setItems((current) => [...current, { ...item, id }])
      window.setTimeout(() => dismiss(id), 5000)
      return id
    },
    [dismiss]
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(100%-2rem,24rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <Alert
              variant={item.tone ?? 'default'}
              title={item.title}
              action={
                <button
                  type="button"
                  className="rounded-lg p-1 hover:bg-black/5"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              }
            >
              {item.description}
            </Alert>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return ctx
}

export function notifySignInError(
  notify: NotificationContextValue['notify'],
  description: string
) {
  notify({
    title: 'Sign-in failed',
    description,
    tone: 'danger',
  })
}

export function NotificationBanner({
  className,
  ...props
}: React.ComponentProps<typeof Alert>) {
  return <Alert className={cn(className)} {...props} />
}
