import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  /** Stronger dimming + higher stacking for embed/fullscreen flows (e.g. PandaDoc). */
  variant?: 'default' | 'immersive'
  /** Extra classes for the scrollable body. */
  bodyClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  variant = 'default',
  bodyClassName,
}: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset.dialogOpen = 'true'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
      delete document.body.dataset.dialogOpen
    }
  }, [open, onClose])

  if (!open) return null

  const immersive = variant === 'immersive'

  return createPortal(
    <div
      className={cn('fixed inset-0 isolate', immersive ? 'z-[200]' : 'z-[100]')}
      data-dialog-root=""
    >
      <button
        type="button"
        className={cn(
          'fixed inset-0 transition-opacity',
          immersive
            ? 'bg-[#12122a]/65 backdrop-blur-sm'
            : 'bg-foreground/10 backdrop-blur-[2px]'
        )}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="fixed inset-0 overflow-y-auto overscroll-contain">
        <div
          className={cn(
            'flex min-h-full justify-center',
            immersive ? 'items-stretch p-2 sm:items-center sm:p-4' : 'items-center p-4 sm:p-6'
          )}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={cn(
              'relative z-10 flex w-full flex-col overflow-hidden border border-border/80 bg-card shadow-xl animate-page-in',
              immersive
                ? 'h-[min(96dvh,calc(100dvh-1rem))] max-h-[min(96dvh,calc(100dvh-1rem))] rounded-2xl sm:h-[min(94dvh,960px)] sm:max-h-[min(94dvh,960px)]'
                : 'max-h-[min(90dvh,calc(100dvh-2rem))] max-w-lg rounded-lg shadow-sm',
              className
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
              <h2 id="dialog-title" className="text-heading">
                {title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Close"
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div
              className={cn(
                'min-h-0 flex-1 px-6 py-4',
                immersive ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
                bodyClassName
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
