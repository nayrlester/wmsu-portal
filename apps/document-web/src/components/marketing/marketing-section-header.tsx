import { Reveal } from '@/components/marketing/marketing-motion'
import { cn } from '@/lib/utils'

interface MarketingSectionHeaderProps {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function MarketingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: MarketingSectionHeaderProps) {
  return (
    <Reveal className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">{eyebrow}</p>
      <h2 className="mt-3 text-pretty text-3xl font-semibold tracking-tight text-foreground sm:text-[2.35rem] sm:leading-[1.15]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
    </Reveal>
  )
}
