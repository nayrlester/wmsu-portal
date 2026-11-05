function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(' ')
}

export type WmsuLogoVariant = 'auth' | 'sidebar' | 'header' | 'mark'

export interface WmsuLogoProps {
  productName: string
  productTagline?: string
  variant?: WmsuLogoVariant
  className?: string
  invert?: boolean
}

const SEAL_SRC = '/wmsu-seal.png'

export function WmsuLogo({
  productName,
  productTagline,
  variant = 'auth',
  className,
  invert = false,
}: WmsuLogoProps) {
  const isAuth = variant === 'auth'
  const isMarkOnly = variant === 'mark'

  const sealClass = cx(
    'shrink-0 object-contain',
    variant === 'auth' && 'h-[5.5rem] w-[5.5rem] sm:h-24 sm:w-24',
    variant === 'sidebar' && 'h-10 w-10 sm:h-11 sm:w-11',
    variant === 'header' && 'h-9 w-9 sm:h-10 sm:w-10',
    variant === 'mark' && 'h-10 w-10 sm:h-12 sm:w-12'
  )

  const textPrimary = invert ? 'text-white' : 'text-[var(--color-ink,#12122a)]'
  const textMuted = invert ? 'text-white/75' : 'text-[var(--color-muted-foreground,#6b6f8c)]'

  if (isAuth) {
    return (
      <div className={cx('flex flex-col items-center gap-3 text-center sm:items-start sm:text-left', className)}>
        <img
          src={SEAL_SRC}
          alt="Western Mindanao State University"
          className={sealClass}
          decoding="async"
        />
        <div className="min-w-0 space-y-0.5">
          <p className={cx('text-base font-semibold sm:text-lg', textPrimary)}>{productName}</p>
          {productTagline ? (
            <p className={cx('text-xs sm:text-sm', textMuted)}>{productTagline}</p>
          ) : null}
        </div>
      </div>
    )
  }

  if (isMarkOnly) {
    return (
      <img
        src={SEAL_SRC}
        alt="Western Mindanao State University"
        className={cx(sealClass, className)}
        decoding="async"
      />
    )
  }

  return (
    <div className={cx('flex min-w-0 items-center gap-2 sm:gap-3', className)}>
      <img src={SEAL_SRC} alt="" aria-hidden className={sealClass} decoding="async" />
      <div className="min-w-0 leading-tight">
        <div
          className={cx(
            'truncate text-[11px] font-semibold uppercase tracking-wide sm:text-xs',
            invert ? 'text-white/90' : 'text-[var(--color-primary,#c41e3a)]'
          )}
        >
          WMSU
        </div>
        <div className={cx('truncate text-sm font-bold sm:text-base', invert ? 'text-white' : textPrimary)}>
          {productName}
        </div>
        {productTagline ? (
          <div
            className={cx(
              'hidden truncate text-[10px] sm:block',
              invert ? 'text-white/55' : textMuted
            )}
          >
            {productTagline}
          </div>
        ) : null}
      </div>
    </div>
  )
}
