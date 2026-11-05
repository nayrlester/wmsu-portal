# Railway — WMSU CIS backend

Deploy **compute and data** on Railway; deploy **React SPAs on Vercel** ([`../vercel/README.md`](../vercel/README.md)).

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
