# WMSU Platform (`wmsu-platform`)

Modular monolith: **one Base API**, **one PostgreSQL database** (schema-per-domain), **multiple React clients**.

Architecture: [`../docs/WMSU_TARGET_ARCHITECTURE.md`](../docs/WMSU_TARGET_ARCHITECTURE.md)  
Migration: [`../docs/WMSU_MIGRATION_PLAN.md`](../docs/WMSU_MIGRATION_PLAN.md)

## Layout

```text
wmsu-platform/
├── apps/
│   ├── base-api/          # AdonisJS — auth façade, MDM, CIS, modules/*
│   │   └── app/modules/
│   │       ├── common-platform/  # identity façade + audit/integrations/events
│   │       ├── enrollment/       # USiS (in-process)
│   │       ├── records/          # TORMS (in-process)
│   │       ├── finance/          # UFMS (in-process)
│   │       ├── library/          # ULMIS (in-process)
│   │       ├── inventory/        # UIMS (in-process)
│   │       └── documents/        # UDMS (in-process)
│   ├── worker/            # BullMQ
│   ├── web-portal/        # Launcher portal
│   ├── admin-web/
│   ├── enrollment-web/    # USiS
│   ├── records-web/       # TORMS
│   ├── finance-web/       # UFMS
│   ├── library-web/       # ULMIS staff
│   ├── library-opac-web/
│   ├── library-kiosk-web/
│   ├── inventory-web/     # UIMS
│   └── document-web/      # UDMS
├── packages/
│   ├── ui/
│   ├── api-client/
│   ├── shared-types/
│   ├── shared-validation/
│   └── config/
└── infrastructure/
    ├── docker/
    ├── deployment/
    └── database/
```

Cross-app Playwright smoke tests live in [`../e2e`](../e2e) (not under this folder).

## Phase 4 behavior

- Domain APIs run **in-process** inside Base API (`:3500`) under `/api/v1/<module>/*`.
- Full React clients live in `apps/*-web` and proxy to Base API.
- Identity routes (`/api/v1/auth`, `/api/v1/admin`, integrations) **proxy** to University Identity in [`../wmsu-api`](../wmsu-api) (`GATEWAY_IDENTITY_URL`, default `http://127.0.0.1:3411`).
- Legacy outer repos (`../wmsu-enrollment`, …) are marked `MOVED.md` for rollback only.

## Prerequisites

- Node **≥ 22**, **pnpm 9**
- Docker (Postgres, Redis, MinIO via `pnpm run infra:up`)
- [`../wmsu-api`](../wmsu-api) running for login / SSO (Base API does not replace Identity)

## Setup

```bash
cd WMSU/wmsu-platform
cp .env.example .env
cp apps/base-api/.env.example apps/base-api/.env
pnpm install
pnpm run infra:up
pnpm run db:migrate
pnpm run db:seed
```

**Enrollment schema migrations** (USiS tables under PostgreSQL schema `enrollment`) are tracked in `enrollment.uims_adonis_schema`, not in root `database/migrations`. After pulling new files under `apps/base-api/app/modules/enrollment/database/migrations/`, copy the new migration into [`../wmsu-enrollment/apps/api/database/migrations/`](../wmsu-enrollment/apps/api/database/migrations/) (same filename), then run:

```bash
cd ../wmsu-enrollment/apps/api
node ace migration:run --compact-output
```

Re-seed enrollment RBAC when new permissions appear: `node ace uims:seed-demo` (same directory). Base API `pnpm run db:seed` only seeds CIS/MDM infra, not enrollment demo roles.

Copy each `apps/*-web/.env.example` to `.env` when you need non-default API URLs or module paths.

## Local dev

Use **two commands** from `WMSU/wmsu-platform` (requires **pnpm** on PATH; `npm run …` works too):

| Command | What starts |
|---------|-------------|
| **`pnpm run dev:api`** | University Identity `:3411`, Base API `:3500`, BullMQ worker |
| **`pnpm run dev`** | Everything in `dev:api` **plus** portal `:5173`, admin `:5174`, and all domain clients `:5180`–`:5187` |

Run **`pnpm run infra:up`**, **`pnpm run db:migrate`**, and **`pnpm run db:seed`** once before first dev session (Identity DB: `npm run db:migrate` / `db:seed` in `../wmsu-api`).

Optional single-app filters: `dev:base-api`, `dev:worker`, `dev:web`, `dev:admin`, `dev:clients`, `dev:identity`.

```bash
pnpm run verify
```

## Staging and production

| Command | Purpose |
|---------|---------|
| `pnpm run build:staging` | Production build for staging (`WMSU_DEPLOY_ENV=staging`) — platform + Identity |
| `pnpm run build:production` | Production build for production |
| `pnpm run deploy:staging` | Lint, typecheck, then `build:staging` + checklist |
| `pnpm run deploy:production` | Lint, typecheck, then `build:production` + checklist |
| `pnpm run deploy:cloud:staging` | Above + optional `-- --push` to redeploy Railway + Vercel |
| `pnpm run deploy:cloud:production` | Same for production |

**Hosting split:** APIs on **Railway** ([`deploy/railway/README.md`](deploy/railway/README.md)), SPAs on **Vercel** ([`deploy/vercel/README.md`](deploy/vercel/README.md)). First-time setup is linking GitHub projects and env vars — not automatic until you run `deploy:cloud:* -- --push` with CLI tokens.

Configure host URLs in each app’s `.env` / [`deploy/env/web.vercel.env.example`](deploy/env/web.vercel.env.example). Summary: [`infrastructure/deployment/README.md`](infrastructure/deployment/README.md).

## TOR / USiS requirements (modules 1–28)

Mandatory ENR modules from the TOR and `WMSU_Modules_1-28_USIS_.csv` are mapped to code in **enrollment** (USiS). Do not treat “platform runs locally” as bid compliance.

| Document | Purpose |
|----------|---------|
| [`../docs/01-requirements/USIS_REQUIREMENTS.md`](../docs/01-requirements/USIS_REQUIREMENTS.md) | Full ENR-001–ENR-064 text |
| [`../docs/compliance/USIS_TOR_28_MODULE_STATUS.md`](../docs/compliance/USIS_TOR_28_MODULE_STATUS.md) | **Shipped / Partial / Not started** per module with file evidence |
| [`../docs/TOR_REQUIREMENTS_MATRIX.md`](../docs/TOR_REQUIREMENTS_MATRIX.md) | Campus-wide ID index (CMN, SEC, LIB, FIN, …) |
| [`../docs/IMPLEMENTATION_TRACKER.csv`](../docs/IMPLEMENTATION_TRACKER.csv) | Per-requirement tracker (refresh with repo scripts) |

**Production:** Requires closing gaps in the module status doc, university policy sign-off for Student Support Services, UFMS/Identity integration UAT, HEMIS/regulatory exports, and load/security evidence—not UI scaffolding alone.

## URLs (default Vite ports)

| Surface | URL |
|---------|-----|
| Base API | http://127.0.0.1:3500 |
| University Identity (separate repo) | http://127.0.0.1:3411 |
| Portal | http://127.0.0.1:5173 |
| Admin (MDM / platform ops) | http://127.0.0.1:5174 |
| USiS (`enrollment-web`) | http://127.0.0.1:5180 |
| TORMS (`records-web`) | http://127.0.0.1:5181 |
| UFMS (`finance-web`) | http://127.0.0.1:5182 |
| ULMIS staff (`library-web`) | http://127.0.0.1:5183 |
| UIMS (`inventory-web`) | http://127.0.0.1:5184 |
| UDMS (`document-web`) | http://127.0.0.1:5185 |
| ULMIS OPAC | http://127.0.0.1:5186 |
| ULMIS kiosk | http://127.0.0.1:5187 |

If a port is busy, Vite may bind the next free port; check the terminal line that says `Local:`.

## Demo sign-in

Use University Identity accounts (password from `DEMO_SEED_PASSWORD` / seed docs), e.g. `admin@identity.local`, `student@identity.local`, then launch apps from the portal or open a client URL directly. Module-local users (e.g. `admin@uims.local` on USiS) come from `pnpm run db:seed`. Details: [`../wmsu-api/docs/Identity-Complete-Guide.md`](../wmsu-api/docs/Identity-Complete-Guide.md).

## E2E smoke

From repo root:

```bash
cd WMSU/e2e
pnpm install
npx playwright install chromium
PLAYWRIGHT_PLATFORM_WEB_URL=http://127.0.0.1:5173 \
PLAYWRIGHT_USIS_WEB_URL=http://127.0.0.1:5180 \
npx playwright test cross-app-login.spec.ts
```

Screenshots land in `WMSU/e2e/test-results/` (gitignored there and under platform if you run Playwright locally).

## Common scripts

| Script | Purpose |
|--------|---------|
| `pnpm run build` | Packages + apps production build |
| `pnpm run typecheck` | Typecheck all workspaces |
| `pnpm run lint` / `format:check` | ESLint / Prettier |
| `pnpm run db:rollback` | Roll back last migration |
| `pnpm run infra:down` | Stop Docker stack |
