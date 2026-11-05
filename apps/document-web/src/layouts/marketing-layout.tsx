import { Link, Outlet } from 'react-router-dom'
import { SkipLink } from '@/components/shared/skip-link'
import { BrandLogo } from '@/components/shared/brand-logo'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingSectionLink } from '@/components/marketing/marketing-section-link'
import { APP_BRAND_FULL_NAME, APP_BRAND_NAME } from '@/shared/constants/branding'

interface MarketingLayoutProps {
  children?: React.ReactNode
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SkipLink />
      <MarketingHeader />

      <main id="main-content">{children ?? <Outlet />}</main>

      <footer className="border-t border-border/80 bg-muted/15 pb-safe-bottom">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <BrandLogo />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {APP_BRAND_FULL_NAME} — document routing and workflow automation for universities and
                enterprises.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Product</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <MarketingSectionLink
                    sectionId="features"
                    label="Features"
                    className="text-muted-foreground transition-premium hover:text-foreground hover:bg-transparent px-0 py-0"
                  />
                </li>
                <li>
                  <Link to="/track" className="text-muted-foreground transition-premium hover:text-foreground">
                    Public tracking
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Account</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/login" className="text-muted-foreground transition-premium hover:text-foreground">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} {APP_BRAND_NAME}. All rights reserved.</p>
            <p className="text-xs">Built for organizations nationwide.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

