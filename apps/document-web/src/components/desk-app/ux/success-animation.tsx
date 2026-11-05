import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SuccessAnimationProps {
  label?: string
  className?: string
}

export function SuccessAnimation({ label = 'Success!', className }: SuccessAnimationProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-3 py-6', className)}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
        <CheckCircle2 className="relative h-16 w-16 text-emerald-500 motion-safe:animate-[bounce_0.6s_ease-out_1]" />
      </div>
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{label}</p>
    </div>
  )
}
