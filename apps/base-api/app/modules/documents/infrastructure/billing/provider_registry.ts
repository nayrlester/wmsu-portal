import env from '#start/env'
import { BillingProvider } from '#modules/documents/domain/enums/index'
import type { BillingProviderAdapter } from '#modules/documents/domain/billing/billing_provider'
import { stripeBillingProvider } from '#infrastructure/billing/stripe_billing_provider'
import { paymongoBillingProvider } from '#infrastructure/billing/paymongo_billing_provider'
import { stubBillingProvider } from '#infrastructure/billing/stub_billing_provider'

export function getBillingProvider(preferred?: BillingProvider): BillingProviderAdapter {
  const configured = env.get('BILLING_PROVIDER') as BillingProvider | undefined

  if (preferred === BillingProvider.STRIPE || configured === BillingProvider.STRIPE) {
    if (stripeBillingProvider.isConfigured()) return stripeBillingProvider
  }

  if (preferred === BillingProvider.PAYMONGO || configured === BillingProvider.PAYMONGO) {
    if (paymongoBillingProvider.isConfigured()) return paymongoBillingProvider
  }

  if (preferred === BillingProvider.STUB || configured === BillingProvider.STUB) {
    return stubBillingProvider
  }

  if (stripeBillingProvider.isConfigured()) return stripeBillingProvider
  if (paymongoBillingProvider.isConfigured()) return paymongoBillingProvider

  return stubBillingProvider
}

export function resolveProviderName(adapter: BillingProviderAdapter): BillingProvider {
  return adapter.name
}
