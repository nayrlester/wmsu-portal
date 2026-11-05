import { MarketingHero } from '@/components/marketing/marketing-hero'
import { MarketingTrustBar } from '@/components/marketing/marketing-trust-bar'
import { MarketingBentoFeatures } from '@/components/marketing/marketing-bento-features'
import { MarketingStats } from '@/components/marketing/marketing-stats'
import { MarketingHowItWorks } from '@/components/marketing/marketing-how-it-works'
// import { MarketingPricingPreview } from '@/components/marketing/marketing-pricing-preview'
import { MarketingCta } from '@/components/marketing/marketing-cta'
import { useMarketingHashScroll } from '@/hooks/use-marketing-hash-scroll'

export function LandingPage() {
  useMarketingHashScroll()

  return (
    <div className="marketing-page bg-background">
      <MarketingHero />
      <MarketingTrustBar />
      <MarketingBentoFeatures />
      <MarketingStats />
      <MarketingHowItWorks />
      {/* <MarketingPricingPreview /> */}
      <MarketingCta />
    </div>
  )
}
