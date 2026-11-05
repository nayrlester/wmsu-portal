import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
        danger: 'bg-rose-50 text-rose-700',
        info: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

type BadgeProps = { className?: string; children: React.ReactNode } & VariantProps<
  typeof badgeVariants
>

export function Badge({ className, variant, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
}
