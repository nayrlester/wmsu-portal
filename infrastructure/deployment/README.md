# Deployment notes

## Local data plane

- Docker Compose: `infrastructure/docker/docker-compose.yml` (Postgres, Redis, MinIO).
- From repo root: `pnpm run infra:up`.

## Runtime ports (default)

| Service | Port |
|---------|------|
| Base API | 3500 |
| University Identity (`../wmsu-api`) | 3411 |
| Portal / admin | 5173 / 5174 |
| Domain clients | 5180–5187 |

## Build and deploy scripts (from `wmsu-platform` root)

| Script | When to use |
|--------|-------------|
| `pnpm run build:staging` | CI or manual artifact build for staging |
| `pnpm run build:production` | Production artifact build |
| `pnpm run deploy:staging` | Pre-release gate: lint, typecheck, build, checklist |
| `pnpm run deploy:production` | Same for production go-live |

Set `WMSU_DEPLOY_ENV` is applied automatically (`staging` or `production`). Point each Vite app’s `VITE_*` URLs at your API/CDN hostnames before building static assets.

## Server cutover (summary)

1. Provision Postgres, Redis, MinIO (or managed equivalents).
2. Deploy Identity API and Base API + worker with production `.env`.
3. Run migrations: `pnpm run db:migrate` and `npm run db:migrate --prefix ../wmsu-api`.
4. Serve built static files for portal, admin, and `*-web` apps (CDN or reverse proxy).
5. Run smoke checks with `pnpm run verify` using deployed URLs in env vars.

## Phase 3 notes

- `pnpm run db:bootstrap` then `GET /api/v1/platform/db-consolidation` for consolidation workflows.
- Production hostnames (proposed): `api.wmsu.edu.ph` + per-client subdomains — confirm DNS/TLS with the institution.
