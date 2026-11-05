/**
 * Documentation links on the Support page (`/support`).
 * HTML manuals: `apps/web-portal/public/docs`.
 */

import { platformBranding } from '@/features/legal/data/platform-branding'

const platformApiBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:3500'
).replace(/\/$/, '')

const identityApiBase = (
  import.meta.env.VITE_IDENTITY_API_URL || 'http://127.0.0.1:3411'
).replace(/\/$/, '')

const cisSwagger = `${platformApiBase}/api/v1/docs`

export type DocResource = {
  label: string
  description: string
  href: string
  kind: 'guide' | 'api' | 'swagger'
  badge?: string
}

export type SystemDocLinks = {
  id: string
  name: string
  description: string
  logoSrc: string
  logoTone: string
  resources: DocResource[]
}

function moduleSwagger(moduleLabel: string, pathPrefix: string, filterHint: string): DocResource {
  return {
    kind: 'swagger',
    label: 'Interactive API',
    badge: 'Swagger',
    description: `${moduleLabel} — ${filterHint}. Paths: ${pathPrefix}`,
    href: cisSwagger,
  }
}

export const systemDocumentation: SystemDocLinks[] = [
  {
    id: 'identity',
    name: 'University Platform Access',
    description: 'Identity login, MFA, SSO, Portal Admin (roles + platforms), and launcher',
    logoSrc: platformBranding.identity.logoSrc,
    logoTone: platformBranding.identity.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Portal sign-in, password visibility, MFA, launcher, RBAC role packs',
        href: '/docs/Identity-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Auth, refresh, admin users/roles/platforms, enrollment partner API',
        href: '/docs/Identity-API-Specs-Manual.html',
      },
      {
        kind: 'swagger',
        label: 'Interactive API',
        badge: 'Swagger',
        description: 'Identity Service only (admin + auth endpoints on port 3411)',
        href: `${identityApiBase}/api/v1/docs`,
      },
    ],
  },
  {
    id: 'usis',
    name: 'USiS (Enrollment)',
    description: `Student portal, registrar, faculty/adviser, cashier reads — ${platformBranding.enrollment.localWeb}`,
    logoSrc: platformBranding.enrollment.logoSrc,
    logoTone: platformBranding.enrollment.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'SSO, student vs registrar home, offices, dashboards, troubleshooting',
        href: '/docs/USIS-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Enrollment REST: auth/me, applicants, students, enrollments, grades, reports',
        href: '/docs/USIS-API-Specs-Manual.html',
      },
      moduleSwagger('USiS', '/api/v1/enrollment/*', 'In CIS Swagger, filter by enrollment prefix'),
    ],
  },
  {
    id: 'torms',
    name: 'TORMS (Records)',
    description: `Transcripts, certifications, alumni, registrar records — ${platformBranding.records.localWeb}`,
    logoSrc: platformBranding.records.logoSrc,
    logoTone: platformBranding.records.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Records officer pack, student requests, dashboard, issuance workflow',
        href: '/docs/TORMS-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'TORMS foundation, requests, issuance, alumni, reports, dashboard summary',
        href: '/docs/TORMS-API-Specs-Manual.html',
      },
      moduleSwagger('TORMS', '/api/v1/records/*', 'In CIS Swagger, filter by records or /torms/'),
    ],
  },
  {
    id: 'ulmis',
    name: 'ULMIS Library',
    description: `Staff desk, catalog, circulation, OPAC, kiosk, analytics — ${platformBranding.library.localWeb}`,
    logoSrc: platformBranding.library.logoSrc,
    logoTone: platformBranding.library.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Circulation, acquisitions, digital repo, OPAC/kiosk, member portal, analytics',
        href: '/docs/ULMIS-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Library REST: books, members, borrowings, analytics/dashboard, portal',
        href: '/docs/ULMIS-API-Specs-Manual.html',
      },
      moduleSwagger('ULMIS', '/api/v1/library/*', 'In CIS Swagger, filter by library prefix'),
    ],
  },
  {
    id: 'ufms',
    name: 'UFMS Finance',
    description: `Budget, accounting (GL/JEV), procurement, POS — TOR VI.E.3 — ${platformBranding.finance.localWeb}`,
    logoSrc: platformBranding.finance.logoSrc,
    logoTone: platformBranding.finance.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Finance overview dashboard, budget, accounting sidebar, procurement, cashier/POS',
        href: '/docs/UFMS-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Finance REST: COA, budget plans, journal entries, procurement, POS, dashboard',
        href: '/docs/UFMS-API-Specs-Manual.html',
      },
      moduleSwagger('UFMS', '/api/v1/finance/*', 'In CIS Swagger, filter finance, budget, pos, accounting'),
    ],
  },
  {
    id: 'docstrack',
    name: 'DocsTrack (UDMS)',
    description: `Documents, workflows, approvals, UDMS reports — ${platformBranding.documents.localWeb}`,
    logoSrc: platformBranding.documents.logoSrc,
    logoTone: platformBranding.documents.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Create/track documents, approvals, public track, records lifecycle, UDMS reports',
        href: '/docs/DocsTrack-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Account dashboard, documents, workflows, UDMS module, platform billing',
        href: '/docs/DocsTrack-API-Specs-Manual.html',
      },
      moduleSwagger('DocsTrack', '/api/v1/documents/*', 'In CIS Swagger, filter documents or /account/'),
    ],
  },
  {
    id: 'uims',
    name: 'UIMS Inventory',
    description: `Stock, warehouses, assets, supply office — ${platformBranding.inventory.localWeb}`,
    logoSrc: platformBranding.inventory.logoSrc,
    logoTone: platformBranding.inventory.logoTone,
    resources: [
      {
        kind: 'guide',
        label: 'User guide',
        description: 'Items, stock movements, warehouses, assets, low-stock alerts, COA integration',
        href: '/docs/UIMS-Complete-Guide.html',
      },
      {
        kind: 'api',
        label: 'API specs',
        description: 'Inventory REST: items, stock, warehouses, assets, dashboard/summary',
        href: '/docs/UIMS-API-Specs-Manual.html',
      },
      moduleSwagger('UIMS', '/api/v1/inventory/*', 'In CIS Swagger, filter by inventory prefix'),
    ],
  },
]
