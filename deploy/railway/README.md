# Railway — WMSU CIS backend

Deploy **compute and data** on Railway; deploy **React SPAs on Vercel** ([`../vercel/README.md`](../vercel/README.md)).

**If Railway shows many `@wmsu/*-web` services:** read [`RAILWAY-DASHBOARD.md`](RAILWAY-DASHBOARD.md) — delete web services from Railway; keep only Base API + worker.

## Project layout (one Railway project, multiple services)

| Service name | Config-as-code | Dockerfile |
|--------------|----------------|------------|
| `cis-base-api` | `deploy/railway/base-api.toml` | `Dockerfile.railway` |
| `cis-worker` | `deploy/railway/worker.toml` | `Dockerfile.worker.railway` |
| `identity-api` | `../wmsu-api/railway.toml` | separate repo |

Add plugins in the same project:

- **PostgreSQL** → `DATABASE_URL` on Base API + worker
- **Redis** → `REDIS_URL` on Base API + worker
- **Object storage** → use Railway volume or external S3/MinIO (`S3_*` on Base API)

## 1. Base API service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → `wmsu-platform`.
2. **New Service** → same repo → rename **`cis-base-api`**.
3. **Settings → Build**:
   - Root Directory: *(empty — repo root is `wmsu-platform`)*
   - Builder: **Dockerfile**
   - Dockerfile path: `Dockerfile.railway`
   - Config-as-code: `deploy/railway/base-api.toml`
4. **Variables**: copy [`../env/base-api.railway.env.example`](../env/base-api.railway.env.example).
   - `APP_URL` = public HTTPS URL of this service
   - `GATEWAY_IDENTITY_URL` / `PLATFORM_*` = Identity public URL
   - `CORS_ORIGINS` = all Vercel app URLs (comma-separated)
5. Do **not** set `PORT` (Railway injects it).
6. Generate `APP_KEY` locally: `cd apps/base-api && node ace generate:key`

Health check path: `/api/v1/health/live`

## 2. Worker service

1. **New Service** → same repo → **`cis-worker`**.
2. Config-as-code: `deploy/railway/worker.toml`
3. Dockerfile: `Dockerfile.worker.railway`
4. Variables: [`../env/worker.railway.env.example`](../env/worker.railway.env.example)
5. Link the **same** Postgres + Redis plugins as Base API.

## 3. Identity API

Deploy from [`../../wmsu-api`](../../wmsu-api):

- Config: `railway.toml` at repo root
- Env template: `wmsu-api/deploy/env/railway.api.env.example`
- Set every `*_WEB_URL` to your Vercel URLs + portal/admin

## CLI / CI redeploy

After linking the project locally (`railway login`, `railway link`):

```bash
cd WMSU/wmsu-platform
railway redeploy --service <cis-base-api-service-id> -y
railway redeploy --service <cis-worker-service-id> -y
```

For scripted deploy from the monorepo root:

```bash
pnpm run deploy:cloud:staging -- --push
```

Set service IDs (Railway → Service → Settings → Service ID):

- `RAILWAY_SERVICE_CIS_BASE_API`
- `RAILWAY_SERVICE_CIS_WORKER`
- `RAILWAY_SERVICE_IDENTITY_API` (when redeploying from `wmsu-api` cwd in CI)

Also set `RAILWAY_TOKEN` for non-interactive CLI/CI.

## Migrations

Base API `preDeployCommand` runs `node ace.js migration:run --force` on each deploy.

Identity: `preDeployCommand` in `wmsu-api/railway.toml`.

Run seeds manually on staging only (`pnpm run db:seed`, Identity `npm run db:seed`).

### Philippine SUC academic + tuition baseline (prod)

Local cleanup/seed: `pnpm seed:ph-university`.

Apply the same baseline to **Railway prod** (idempotent API seed; optional SQL cleanup of Playwright junk):

```bash
# PowerShell — public Postgres URL from Railway → Postgres → Connect
$env:RAILWAY_PUBLIC_DATABASE_URL='postgresql://postgres:PASS@HOST.proxy.rlwy.net:PORT/railway'
pnpm run seed:ph-university:prod
# API-only (no cleanup): pnpm run seed:ph-university:prod -- --seed-only
```

Or mirror the whole local CIS DB (already cleaned + seeded):

```bash
$env:RAILWAY_PUBLIC_DATABASE_URL='postgresql://...'
pnpm run db:push:railway
```

Cloud deploy can seed after redeploy (production only):

```bash
pnpm run deploy:cloud:production -- --push --seed-ph
```

Without `RAILWAY_PUBLIC_DATABASE_URL`, `--seed-ph` runs `--seed-only` against the live Base API.

### Run migrations from your laptop (Railway Postgres)

`postgres.railway.internal` in service variables **only works inside Railway**. From your PC, use one of:

**A — Railway CLI (recommended)**

```bash
railway login
cd WMSU/wmsu-platform
railway link
railway run --service cis-base-api node ace migration:run --force
```

(Run from repo root; CLI injects the service’s `DATABASE_URL`.)

**B — Public TCP URL**

Railway → Postgres plugin → **Connect** → copy the **public** URL (`*.proxy.rlwy.net`), then:

```bash
cd WMSU/wmsu-platform
set RAILWAY_PUBLIC_DATABASE_URL=postgresql://...@....proxy.rlwy.net:PORT/railway
pnpm run db:migrate:railway
```

(PowerShell: `$env:RAILWAY_PUBLIC_DATABASE_URL="..."`. Do not commit this URL.)

**C — Redeploy `cis-base-api`** — migrations run automatically via `preDeployCommand`.

### Copy local Docker data → Railway Postgres

Local CIS data lives in Docker (`wmsu_cis` on port **5433**). Railway service variables use `postgres.railway.internal` — that is **not** reachable from your laptop.

1. Keep **`apps/base-api/.env`** on **local** Docker (`DB_HOST=127.0.0.1`, `DB_PORT=5433`).
2. Railway dashboard → Postgres → **Connect** → copy **public** URL.
3. From repo root (Git Bash):

```bash
export RAILWAY_PUBLIC_DATABASE_URL='postgresql://postgres:PASS@HOST.proxy.rlwy.net:PORT/railway'
pnpm run db:push:railway
```

This runs Railway Lucid migrations, `pg_dump`s local `wmsu_cis`, and `pg_restore`s into Railway (**replaces** existing CIS rows). Identity users/platforms are in **`wmsu-api`** Postgres — sync that database separately if needed.
