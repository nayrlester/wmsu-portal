# Railway dashboard — what to keep vs remove

Railway may auto-create one service per `apps/*` folder. For **Railway + Vercel**, only run **APIs and workers** on Railway. All `*-web` SPAs belong on **Vercel**.

## Keep on this Railway project

| Service name (you choose) | Repo root | Config-as-code | Dockerfile |
|---------------------------|-----------|----------------|------------|
| **cis-base-api** | `wmsu-platform` (empty root) | `deploy/railway/base-api.toml` | `Dockerfile.railway` |
| **cis-worker** | same repo | `deploy/railway/worker.toml` | `Dockerfile.worker.railway` |

Plugins in the **same** project:

- PostgreSQL → reference as `${{Postgres.DATABASE_URL}}` on both services
- Redis → `${{Redis.REDIS_URL}}` on both services

## Remove or do not deploy (use Vercel instead)

Delete these services from Railway (or cancel staged changes before first deploy):

- `@wmsu/admin-web`
- `@wmsu/enrollment-web`
- `@wmsu/finance-web`
- `@wmsu/document-web`
- `@wmsu/records-web`
- `@wmsu/inventory-web`
- `@wmsu/library-web`
- `@wmsu/web-portal`
- any other `apps/*-web`

Import each as a **separate Vercel project** with Root Directory `apps/<name>`. See [`../vercel/README.md`](../vercel/README.md).

## Identity

Deploy **`WMSU/wmsu-api`** as its **own** Railway project (not inside `wmsu-platform`):

- Config: `railway.toml` at `wmsu-api` root
- Service name e.g. **identity-api**

## cis-base-api — required settings

**Settings → Build**

- Builder: **Dockerfile** (not Railpack — Railpack runs `pnpm build` and fails on legacy module TS debt)
- Dockerfile path: `Dockerfile` when Root Directory is `apps/base-api`, or `Dockerfile.railway` when Root Directory is repo root
- Root Directory: **`apps/base-api`** (recommended) with [`apps/base-api/railway.toml`](../../apps/base-api/railway.toml) + [`apps/base-api/Dockerfile`](../../apps/base-api/Dockerfile)

**Settings → Config-as-code**

- Path: `railway.toml` (under `apps/base-api`) **or** `deploy/railway/base-api.toml` (repo root layout)

**Variables** (minimum): copy [`../env/base-api.railway.env.example`](../env/base-api.railway.env.example)

- `APP_KEY` — from `cd apps/base-api && node ace generate:key`
- `APP_URL` — this service’s public HTTPS URL (after first deploy)
- `DATABASE_URL`, `REDIS_URL` — from plugins
- `GATEWAY_IDENTITY_URL` / `PLATFORM_*` — Identity public URL
- `CORS_ORIGINS` — comma-separated **Vercel** URLs (portal + all clients)

Do **not** set `PORT`.

**Deploy**

- First deploy runs migrations via `preDeployCommand` in `base-api.toml`.

## cis-worker — required settings

- Dockerfile: `Dockerfile` (Root **`apps/worker`**) or repo-root `Dockerfile.worker.railway`
- Config: `apps/worker/railway.toml`
- **Variables (required on this service):**
  - `NODE_ENV=production`
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}` — same Postgres plugin as Base API
  - `REDIS_URL=${{Redis.REDIS_URL}}` — same Redis plugin as Base API
  - `QUEUE_NAME=wmsu-cis-jobs`

If `DATABASE_URL` / `REDIS_URL` are missing, the worker exits with a clear error instead of connecting to `127.0.0.1:5433`.

Add a **Postgres** plugin to the project if only Redis is present (worker and Base API both need Postgres).

## Before you click “Deploy” (32 changes)

1. **Remove** all `*-web` services from the canvas.
2. Ensure only **cis-base-api** + **cis-worker** (+ Postgres + Redis) remain.
3. Commit and push `Dockerfile.railway`, `deploy/railway/*.toml` to GitHub so Railway can build.
4. Then **Deploy** once env vars are set.

## After Railway is up

1. Set each Vercel app’s `VITE_API_URL` to the **cis-base-api** public URL (with module path for domain apps).
2. Update Identity `CORS_ORIGIN` and `*_WEB_URL` to Vercel URLs.
3. Redeploy Vercel apps after changing any `VITE_*`.
