# Deployment — Railway + Vercel

## Architecture

| Layer | Host | Docs |
|-------|------|------|
| Base API, worker, Postgres, Redis | **Railway** | [`../../deploy/railway/README.md`](../../deploy/railway/README.md) |
| Identity API | **Railway** (`../wmsu-api`) | `wmsu-api/railway.toml` |
| Portal, admin, all `*-web` apps | **Vercel** | [`../../deploy/vercel/README.md`](../../deploy/vercel/README.md) |

## Scripts (from `wmsu-platform` root)

| Script | Action |
|--------|--------|
| `pnpm run deploy:staging` | Lint, typecheck, build — no cloud upload |
| `pnpm run deploy:cloud:staging -- --push` | Build + Railway redeploy + Vercel deploy |
| `pnpm run deploy:cloud:production -- --push` | Production targets |

## CI secrets (GitHub Actions)

| Secret / variable | Use |
|-------------------|-----|
| `RAILWAY_TOKEN` | Railway CLI |
| `RAILWAY_SERVICE_CIS_BASE_API` | Service ID |
| `RAILWAY_SERVICE_CIS_WORKER` | Service ID |
| `RAILWAY_SERVICE_IDENTITY_API` | Service ID (optional, `wmsu-api` job) |
| `VERCEL_TOKEN` | Vercel CLI |

Workflows: [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml), [`deploy-production.yml`](../../.github/workflows/deploy-production.yml).

## Local Docker (optional)

`pnpm run infra:up` remains for developer Postgres/Redis/MinIO — not a substitute for Railway production data plane.
