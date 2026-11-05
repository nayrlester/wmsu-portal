import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_BRAND_NAME, APP_BRAND_SHORT } from '@/shared/constants/branding'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

interface BrandLogoProps {
  to?: string
  className?: string
  variant?: 'default' | 'inverse'
  showWordmark?: boolean
}

export function BrandLogo({
  to = '/',
  className,
  variant = 'default',
  showWordmark = true,
}: BrandLogoProps) {
  const invert = variant === 'inverse'

  if (!showWordmark) {
    return (
      <Link to={to} className={className} aria-label={`${APP_BRAND_NAME} home`}>
        <WmsuLogo productName={APP_BRAND_SHORT} variant="mark" />
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={cn('transition-premium hover:opacity-90', className)}
      aria-label={`${APP_BRAND_NAME} home`}
    >
      <WmsuLogo
        productName={APP_BRAND_SHORT}
        productTagline={APP_BRAND_NAME}
        variant="header"
        invert={invert}
      />
    </Link>
  )
}
