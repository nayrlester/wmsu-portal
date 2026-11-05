# Vercel — WMSU CIS frontends

Host **all Vite SPAs** on Vercel. **Do not** deploy `apps/base-api` or `apps/worker` here — those stay on Railway.

**Import guide:** [`IMPORT.md`](IMPORT.md) (Root Directory `apps/<app>`, not repo root `./`).

## One Vercel project per app (recommended)

Import the same GitHub repo **10 times** (or use Vercel monorepo “Add project” per folder). Each project:

| Suggested name | Root Directory | Package filter |
|----------------|----------------|----------------|
| cis-portal | `apps/web-portal` | `@wmsu/web-portal` |
| cis-admin | `apps/admin-web` | `@wmsu/admin-web` |
| cis-usis | `apps/enrollment-web` | `@wmsu/enrollment-web` |
| cis-torms | `apps/records-web` | `@wmsu/records-web` |
| cis-ufms | `apps/finance-web` | `@wmsu/finance-web` |
| cis-ulmis | `apps/library-web` | `@wmsu/library-web` |
| cis-opac | `apps/library-opac-web` | `@wmsu/library-opac-web` |
| cis-kiosk | `apps/library-kiosk-web` | `@wmsu/library-kiosk-web` |
| cis-uims | `apps/inventory-web` | `@wmsu/inventory-web` |
| cis-udms | `apps/document-web` | `@wmsu/document-web` |

Each app includes a `vercel.json` with pnpm monorepo install/build commands.

## Environment variables

Template: [`../env/web.vercel.env.example`](../env/web.vercel.env.example).

Rules:

1. **`VITE_API_URL` must be an absolute HTTPS URL** to Railway Base API (include module path for domain apps).
2. Redeploy after any `VITE_*` change (build-time).
3. Update **`CORS_ORIGINS`** on Base API and **`CORS_ORIGIN`** / `*_WEB_URL` on Identity to match each Vercel URL.

Portal example:

```env
VITE_API_URL=https://your-cis-base-api.up.railway.app
VITE_APP_ENV=production
```

USIS example:

```env
VITE_API_URL=https://your-cis-base-api.up.railway.app/api/v1/enrollment
VITE_PLATFORM_IDENTITY_URL=https://your-cis-base-api.up.railway.app
```

Do **not** rely on same-origin `/api` rewrites unless you maintain a custom proxy; absolute Railway URLs are the supported path.

## CLI deploy

```bash
cd WMSU/wmsu-platform/apps/web-portal
vercel --prod
```

Deploy all apps (after `vercel login`):

```bash
pnpm run deploy:cloud:production -- --push
```

Requires `VERCEL_TOKEN` in CI (and each project linked once locally or via Vercel project IDs).

## Preview branches

Use Vercel **Preview** env vars pointing at a **staging** Railway Base API URL. Keep production vars on the Production environment only.

## Verify

1. Open portal URL → login page loads.
2. Network tab: `POST …/api/v1/auth/login` goes to Railway Base API (not 404 on Vercel host).
3. `GET https://<base-api>/api/v1/health/live` → 200.
4. Launch a domain app from portal → SSO / module API paths resolve.
