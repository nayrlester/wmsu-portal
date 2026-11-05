export const MARKETING_STATS = [
  { label: 'Documents routed', value: '2.4M+' },
  { label: 'Avg. approval time saved', value: '68%' },
  { label: 'Organizations onboarded', value: '120+' },
  { label: 'Uptime SLA', value: '99.9%' },
] as const

export const TRUST_INDUSTRIES = [
  'Local Government Units',
  'Companies & Enterprises',
  'Hospitals & Clinics',
  'Schools & Universities',
  'NGOs & Foundations',
] as const

export const MARKETING_PLANS = [
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    description: 'For small teams getting started',
    monthlyPricePhp: 1499,
    monthlyPriceUsd: 29,
    maxUsers: 10,
    maxDocuments: 1000,
    popular: false,
    highlights: ['QR tracking portal', '3 workflows', 'Email notifications'],
  },
  {
    id: 'business',
    slug: 'business',
    name: 'Business',
    description: 'For growing organizations',
    monthlyPricePhp: 4999,
    monthlyPriceUsd: 99,
    maxUsers: 50,
    maxDocuments: 10000,
    popular: true,
    highlights: ['OCR & AI routing', '25 workflows', 'Priority support'],
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for large orgs',
    monthlyPricePhp: 14999,
    monthlyPriceUsd: 299,
    maxUsers: null,
    maxDocuments: null,
    popular: false,
    highlights: ['White-label branding', 'Unlimited workflows', 'Dedicated success'],
  },
] as const

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Register your workspace',
    description: 'Create your organization in minutes. Invite your team and set departments.',
  },
  {
    step: '02',
    title: 'Configure workflows',
    description: 'Build approval chains with SLAs, parallel routes, and automatic escalations.',
  },
  {
    step: '03',
    title: 'Track every document',
    description: 'Assign tracking numbers, share QR codes, and give clients a public status portal.',
  },
] as const
