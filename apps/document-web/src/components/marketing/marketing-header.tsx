import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { MarketingSectionLink } from '@/components/marketing/marketing-section-link'

const mobileNavLinkClass =
  'block rounded-lg px-3 py-3 text-base text-foreground transition-premium hover:bg-muted/60'

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobileNav = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return (
    <header className="sticky top-0 z-50 isolate border-b border-border/60 bg-background/95 pt-safe-top backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <BrandLogo className="min-w-0 shrink" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Marketing">
          <MarketingSectionLink sectionId="features" label="Features" />
          <Link
            to="/track"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-premium hover:bg-muted/60 hover:text-foreground"
          >
            Track
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs sm:px-3 sm:text-sm">
              Sign in
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 top-14 z-40 bg-foreground/10 backdrop-blur-[1px] sm:top-16 md:hidden"
              aria-label="Close menu"
              onClick={closeMobileNav}
            />
            <nav
              id="marketing-mobile-nav"
              className="absolute left-0 right-0 top-full z-50 border-b border-border/60 bg-background/98 shadow-lg backdrop-blur-md md:hidden"
              aria-label="Mobile marketing"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
                <MarketingSectionLink
                  sectionId="features"
                  label="Features"
                  className={mobileNavLinkClass}
                  onNavigate={closeMobileNav}
                />
                <Link to="/track" className={mobileNavLinkClass} onClick={closeMobileNav}>
                  Track document
                </Link>
              </div>
            </nav>
          </>
        )}
      </div>
    </header>
  )
}
