# Frontend Architecture — Feature-Based SaaS Structure

Production-grade folder layout for the CDTS multi-tenant Document Tracking SaaS frontend.

## Full Folder Tree

```
web/src/
├── app/                              # Application bootstrapping
│   └── App.tsx                       # Root component (providers + router)
│
├── main.tsx                          # Vite entry — theme hydration, Sentry, render
│
├── providers/                        # Cross-cutting React context providers
│   ├── index.ts
│   ├── query-provider.tsx            # TanStack Query client
│   └── feature-flags-provider.tsx    # Tenant/feature flag resolution
│
├── routes/                           # Route composition (no page logic)
│   ├── index.tsx                     # AppRouter — assembles all route modules
│   ├── marketing.routes.tsx
│   ├── auth.routes.tsx
│   ├── app.routes.tsx                # Tenant app (/app/*) + RBAC guards
│   ├── admin.routes.tsx              # Super-admin portal (/admin/*)
│   └── guards/
│       ├── auth-guard.tsx            # Requires authenticated session
│       ├── permission-guard.tsx      # RBAC route gate
│       └── super-admin-guard.tsx     # Platform admin only
│
├── layouts/                          # Shell layouts (marketing, auth, app, admin)
│   ├── app-layout.tsx
│   ├── admin-layout.tsx
│   ├── auth-layout.tsx
│   └── marketing-layout.tsx
│
├── api/                              # HTTP layer — isolated from UI/features
│   ├── client.ts                     # Axios instance
│   ├── index.ts                      # Public API barrel
│   ├── interceptors/
│   │   ├── auth.interceptor.ts       # Bearer token injection
│   │   └── error.interceptor.ts      # 401 refresh + redirect
│   └── modules/
│       ├── auth.api.ts
│       ├── documents.api.ts
│       ├── platform.api.ts           # dashboard, workflows, settings, notifications
│       ├── track.api.ts              # Public tracking (no auth)
│       └── admin.api.ts
│
├── shared/                           # Cross-feature reusable code
│   ├── components/
│   │   ├── ui/                       # Re-exports shadcn primitives
│   │   └── layout/                   # Re-exports desk shell components
│   ├── constants/
│   │   └── env.ts                    # env, ROUTES, QUERY_KEYS, PERMISSIONS, FEATURE_FLAGS
│   ├── hooks/
│   │   └── use-theme-init.ts
│   ├── lib/
│   │   └── token-storage.ts
│   ├── store/
│   │   ├── auth-store.ts             # Session + RBAC permissions
│   │   ├── theme-store.ts
│   │   ├── tenant-store.ts           # Multi-tenant org context
│   │   └── index.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   └── index.ts
│   └── utils/
│       ├── format.ts                 # cn, formatDate, statusColor, etc.
│       └── index.ts
│
├── features/                         # Feature modules — primary unit of ownership
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── dashboard/
│   ├── documents/                    # ★ Fully structured reference module
│   │   ├── components/
│   │   │   ├── documents-toolbar.tsx
│   │   │   ├── documents-table.tsx
│   │   │   ├── document-approval-panel.tsx
│   │   │   └── document-timeline.tsx
│   │   ├── hooks/
│   │   │   └── use-documents.ts
│   │   ├── pages/
│   │   │   ├── documents-list.page.tsx
│   │   │   ├── create-document.page.tsx
│   │   │   └── document-detail.page.tsx
│   │   ├── services/
│   │   │   └── documents.service.ts
│   │   ├── store/
│   │   │   └── documents-ui.store.ts
│   │   ├── types/
│   │   │   └── document.types.ts
│   │   ├── utils/
│   │   │   └── document.helpers.ts
│   │   └── index.ts                  # Public feature API
│   │
│   ├── workflows/
│   ├── approvals/
│   ├── notifications/
│   ├── audit-logs/
│   ├── reports/
│   ├── settings/
│   ├── admin/
│   └── tenants/
│
├── components/                       # Legacy shared UI (migrating → shared/)
│   ├── ui/                           # shadcn primitives
│   ├── layout/                       # DeskApp shell
│   ├── desk/                         # Data table, stat cards, search
│   └── shared/
│
├── hooks/                            # Legacy global hooks (migrating → shared/ or features/)
├── stores/                           # Legacy re-exports → shared/store/
├── lib/                              # Legacy re-exports → api/ + shared/
├── pages/                            # Legacy pages (migrating → features/*/pages/)
└── types/                            # Global API contract types (api.ts, tracking.ts)
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  app / providers / routes / layouts                         │  Composition
├─────────────────────────────────────────────────────────────┤
│  features/*  (pages → components → hooks → services)        │  Domain UI
├─────────────────────────────────────────────────────────────┤
│  shared/*  (store, hooks, utils, constants, components)     │  Cross-cutting
├─────────────────────────────────────────────────────────────┤
│  api/*  (client → interceptors → modules)                   │  Transport
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** `features` may import from `shared` and `api`. `shared` may import from `api`. `api` must not import from `features` except type-only boundaries where unavoidable. `routes` only wires features together.

## Documents Module (Reference Implementation)

The `documents` feature is the canonical pattern for all other modules:

| Layer | Responsibility |
|-------|----------------|
| `types/` | Domain types, filter shapes, status constants |
| `services/` | Thin wrapper over `api/modules/documents.api.ts` — single place for response mapping |
| `hooks/` | TanStack Query keys + mutations; invalidate related caches on write |
| `store/` | Ephemeral UI state (search/filter) — not server data |
| `components/` | Presentational pieces composed by pages |
| `pages/` | Route-level containers; minimal logic |
| `utils/` | Pure helpers (track URL, approvable status check) |
| `index.ts` | Public exports — other features import only from here |

## SaaS Capabilities

### Multi-tenant isolation

- `shared/store/tenant-store.ts` holds active organization context
- `api/interceptors/auth.interceptor.ts` attaches tenant-scoped JWT on every request
- Backend enforces tenant boundary; frontend never passes `tenantId` in query params for account routes

### Role-based routing

- `routes/guards/permission-guard.tsx` wraps routes requiring specific permission slugs
- `shared/store/auth-store.ts` exposes `hasPermission()` with super-admin bypass
- Example: `/app/documents/create` requires `documents.create`

### Feature flags

- `shared/constants/env.ts` defines `FEATURE_FLAGS` keys
- `providers/feature-flags-provider.tsx` resolves flags per tenant (defaults enabled; wire to remote config)
- Features gate UI with `useFeatureFlag(FEATURE_FLAGS.auditLogs)`

### Scalable module addition

To add a new feature (e.g. `billing`):

1. Create `features/billing/{components,hooks,pages,services,store,types,utils}/`
2. Add `api/modules/billing.api.ts`
3. Register routes in `routes/app.routes.tsx`
4. Export public API from `features/billing/index.ts`

No changes to unrelated features.

## Why This Scales for SaaS

1. **Team parallelism** — Each squad owns a `features/*` folder with a stable public `index.ts` contract.
2. **Bounded context** — Document logic cannot leak into dashboard; shared code is explicit.
3. **Testability** — Services and utils are pure; hooks tested with QueryClient; pages stay thin.
4. **API evolution** — Backend route changes touch only `api/modules/*` and feature services.
5. **Progressive migration** — Legacy `pages/`, `lib/`, `stores/` re-export new paths; no big-bang rewrite.
6. **Tenant SaaS growth** — Guards, feature flags, and tenant store are first-class, not bolted on.

## Import Conventions

```ts
// ✅ Preferred — import from concrete modules
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { DocumentsListPage } from '@/features/documents/pages/documents-list.page'
import { useAuthStore } from '@/shared/store/auth-store'
import { documentsApi } from '@/api/modules/documents.api'

// ⚠️ Legacy shims (still work; migrate when touching files)
import { useDocuments } from '@/hooks/use-api'
import { documentsApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
```

## Migration Status

| Area | Status |
|------|--------|
| `api/` layer split | ✅ Complete |
| `app/` + `providers/` + `routes/` | ✅ Complete |
| `shared/store`, `shared/utils`, `shared/constants` | ✅ Complete |
| `features/documents` | ✅ Full module |
| `features/onboarding`, `copilot`, `search`, `settings` | ✅ Substantive modules |
| Other screens | ✅ Live under `pages/` (feature page shims removed) |
| Compat shims (`lib/api`, `stores/`, `components/desk`) | 🔶 Still imported — migrate incrementally |
| Unused barrels / orphan UI | ✅ Removed (2026-07 structure audit) |
